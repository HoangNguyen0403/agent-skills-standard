import crypto from 'crypto';
import { evidenceRevisionRecordName } from './EvidenceService';
import {
  FleetPolicyService,
  resolveLogicalProjectId,
  resolveProjectAuthority,
} from './FleetPolicyService';
import { RuntimeStore } from './RuntimeStore';
import {
  Attempt,
  canonicalDigest,
  canonicalJSON,
  EvaluationRecord,
  EvaluationRecordSchema,
  evaluationRuntimeDigest,
  FleetConfig,
  FleetProject,
  FleetTask,
  FrozenEvaluationPlan,
  FrozenEvaluationPlanSchema,
  HarnessBundle,
  HarnessBundleSchema,
  HarnessError,
  normalizeEd25519PublicKey,
  parseFleetConfig,
  parseFleetTask,
  policyDigest,
  ProjectAuthoritySchema,
  resolveHostRuntime,
  SignedApproval,
  SignedApprovalSchema,
} from './RuntimeTypes';

type ReleaseSelector = {
  kind: 'project' | 'domain' | 'stack' | 'fleet';
  key: string;
};

interface ProvenProjectMembership {
  domain: string;
  stackIds: string[];
}

type ActivatePayload = Extract<
  SignedApproval['payload'],
  { action: 'activate' }
>;

export interface FleetPin {
  releaseDigest: string;
  evaluationDigest: string;
  selector: ReleaseSelector;
  approvedAt: number;
  approverId: string;
  approverKeyFingerprint: string;
  approvalDigest: string;
  nonce: string;
  rollout?: 'canary' | 'active';
}

export interface CanaryVerification {
  target: string;
  attemptId: string;
  resultDigest: string;
  generation: number;
}

export interface CanaryRecord {
  releaseDigest: string;
  evaluationDigest: string;
  targets: string[];
  startedAt: number;
  approverId: string;
  nonce: string;
  status: 'active' | 'promoted' | 'withdrawn';
  verified: CanaryVerification[];
}

export interface WithdrawnRecord {
  releaseDigest: string;
  withdrawnAt: number;
  approverId: string;
  nonce: string;
}

/** Exact historical approval provenance: one tuple per approved (release, evaluation, selector). */
export interface ReleaseApprovalTuple {
  releaseDigest: string;
  evaluationDigest: string;
  selector: ReleaseSelector;
  rollout?: 'canary' | 'active';
  approverId: string;
  approverKeyFingerprint: string;
  approvedAt: number;
  nonce: string;
}

export interface FleetPinsState {
  schemaVersion: 1;
  pinGeneration: number;
  pins: Record<string, FleetPin>;
  previousPins: Record<string, FleetPin>;
  usedNonces: Record<
    string,
    {
      usedAt: number;
      approverId: string;
      purpose: string;
      action: 'activate' | 'rollback' | 'withdraw';
    }
  >;
  approvals: ReleaseApprovalTuple[];
  canaries: Record<string, CanaryRecord>;
  withdrawnReleases: Record<string, WithdrawnRecord>;
  history: Array<{
    action: 'activate' | 'rollback' | 'withdraw';
    rollout?: 'canary' | 'active';
    releaseDigest: string;
    evaluationDigest: string;
    selectors: ReleaseSelector[];
    approverId: string;
    nonce: string;
    timestamp: number;
    pinGeneration: number;
  }>;
}

const INITIAL_PINS_STATE: FleetPinsState = {
  schemaVersion: 1,
  pinGeneration: 1,
  pins: {},
  previousPins: {},
  usedNonces: {},
  approvals: [],
  canaries: {},
  withdrawnReleases: {},
  history: [],
};

const PINS_RECORD_NAME = 'fleet-pins';
const BUNDLES_INDEX_NAME = 'bundles-index';
const LEDGER_RECORD_NAME = 'fleet-ledger';

function selectorKey(selector: ReleaseSelector): string {
  return `${selector.kind}:${selector.key}`;
}

/**
 * Decodes strictly canonical base64 (exact roundtrip, no unused padding bits).
 */
function decodeCanonicalBase64(value: string): Buffer | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    return null;
  }
  const decoded = Buffer.from(value, 'base64');
  return decoded.toString('base64') === value ? decoded : null;
}

function resolvePublicKeyObject(publicKeyStr: string): crypto.KeyObject | null {
  try {
    if (publicKeyStr.startsWith('-----BEGIN PUBLIC KEY-----')) {
      const key = crypto.createPublicKey(publicKeyStr);
      return key.asymmetricKeyType === 'ed25519' ? key : null;
    }
    const decoded = decodeCanonicalBase64(publicKeyStr);
    if (decoded === null) {
      return null;
    }
    const der =
      decoded.length === 32
        ? Buffer.concat([
            Buffer.from('302a300506032b6570032100', 'hex'),
            decoded,
          ])
        : decoded;
    const key = crypto.createPublicKey({
      key: der,
      format: 'der',
      type: 'spki',
    });
    return key.asymmetricKeyType === 'ed25519' ? key : null;
  } catch {
    return null;
  }
}

/**
 * Validates an Ed25519 signature over canonical payload bytes.
 * Requires strict canonical base64 for both signature and key, and exactly 64 signature bytes.
 */
export function verifyEd25519Signature(
  canonicalPayload: string,
  publicKeyStr: string,
  signatureBase64: string,
): boolean {
  const signature = decodeCanonicalBase64(signatureBase64);
  if (signature === null || signature.length !== 64) {
    return false;
  }
  const keyObject = resolvePublicKeyObject(publicKeyStr);
  if (keyObject === null) {
    return false;
  }
  try {
    return crypto.verify(
      null,
      Buffer.from(canonicalPayload, 'utf8'),
      keyObject,
      signature,
    );
  } catch {
    return false;
  }
}

/**
 * Exact bytes an approving operator signs: optional rollout is present only for
 * activate, so canonical serialization never sees an undefined property.
 */
function approvalSignaturePayload(
  payload: SignedApproval['payload'],
): Record<string, unknown> {
  const base = {
    purpose: payload.purpose,
    action: payload.action,
    releaseDigest: payload.releaseDigest,
    evaluationDigest: payload.evaluationDigest,
    selectors: payload.selectors,
    expiresAt: payload.expiresAt,
    nonce: payload.nonce,
    policyDigest: payload.policyDigest,
    expectedPinGeneration: payload.expectedPinGeneration,
  };
  if (payload.action === 'activate') {
    return { ...base, action: 'activate', rollout: payload.rollout };
  }
  return base;
}

function approverFingerprint(publicKeyStr: string): string {
  const fingerprint = normalizeEd25519PublicKey(publicKeyStr);
  if (fingerprint === null) {
    throw new HarnessError(
      'INVALID_CONFIG',
      'Configured approver public key is not a valid Ed25519 key',
    );
  }
  return fingerprint;
}

/**
 * Validates that an approval selector cannot widen the bundle scope.
 * Project narrowing must be proven from eligible, digest-bound execution evidence.
 */
function validateSelectorCompatibility(
  selector: ReleaseSelector,
  bundleScope: ReleaseSelector,
  config: FleetConfig,
  projectMembership?: ProvenProjectMembership | null,
): void {
  if (
    selector.kind === 'stack' &&
    !(config.stacks ?? []).some((s) => s.id === selector.key)
  ) {
    throw new HarnessError(
      'UNKNOWN_STACK',
      `Selector stack "${selector.key}" is not configured in central fleet policy stacks`,
    );
  }
  if (
    selector.kind === 'domain' &&
    !config.domains.some((d) => d.id === selector.key)
  ) {
    throw new HarnessError(
      'UNKNOWN_DOMAIN',
      `Selector domain "${selector.key}" is not configured in central fleet policy domains`,
    );
  }

  if (bundleScope.kind === 'fleet') {
    return;
  }

  if (bundleScope.kind === 'project') {
    if (selector.kind === 'project' && selector.key === bundleScope.key) {
      return;
    }
    throw new HarnessError(
      'INCOMPATIBLE_SCOPE',
      `Selector (${selector.kind}:${selector.key}) widens or mismatches project bundle scope "${bundleScope.key}"`,
    );
  }

  if (bundleScope.kind === 'domain') {
    if (selector.kind === 'domain' && selector.key === bundleScope.key) {
      return;
    }
    if (
      selector.kind === 'project' &&
      projectMembership?.domain === bundleScope.key
    ) {
      return;
    }
    if (selector.kind === 'project') {
      throw new HarnessError(
        'INCOMPATIBLE_SCOPE',
        `Project selector "${selector.key}" has no proven membership in domain "${bundleScope.key}"`,
      );
    }
    throw new HarnessError(
      'INCOMPATIBLE_SCOPE',
      `Selector (${selector.kind}:${selector.key}) widens or mismatches domain bundle scope "${bundleScope.key}"`,
    );
  }

  if (selector.kind === 'stack' && selector.key === bundleScope.key) {
    return;
  }
  if (
    selector.kind === 'project' &&
    projectMembership?.stackIds.includes(bundleScope.key)
  ) {
    return;
  }
  throw new HarnessError(
    'INCOMPATIBLE_SCOPE',
    `Selector (${selector.kind}:${selector.key}) cannot be proven a member of stack bundle scope "${bundleScope.key}"`,
  );
}

export class ReleaseService {
  private readonly policyService: FleetPolicyService;

  constructor(
    private readonly store: RuntimeStore,
    policyService?: FleetPolicyService,
  ) {
    this.policyService = policyService ?? new FleetPolicyService(store);
  }

  private async loadPolicy(): Promise<FleetConfig> {
    const raw = await this.store.read<FleetConfig | null>('fleet-policy', null);
    if (!raw) {
      throw new HarnessError(
        'CONFIG_NOT_FOUND',
        'Fleet policy configuration not found in store',
      );
    }
    return parseFleetConfig(raw);
  }

  private async loadImmutable<T>(
    recordName: string,
    digest: string,
    errorCode: string,
    parse: (raw: unknown) => T | null,
  ): Promise<T> {
    const raw = await this.store.read<unknown>(recordName, null);
    if (raw === null) {
      throw new HarnessError(
        errorCode,
        `Immutable record "${recordName}" not found in store`,
      );
    }
    const parsed = parse(raw);
    if (parsed === null) {
      throw new HarnessError(
        errorCode,
        `Immutable record "${recordName}" failed strict validation`,
      );
    }
    if (canonicalDigest(parsed) !== digest) {
      throw new HarnessError(
        errorCode,
        `Immutable record "${recordName}" content does not match digest "${digest}"`,
      );
    }
    return parsed;
  }

  private async loadEvaluation(
    evaluationDigest: string,
  ): Promise<EvaluationRecord> {
    return this.loadImmutable<EvaluationRecord>(
      `eval-${evaluationDigest}`,
      evaluationDigest,
      'EVALUATION_NOT_FOUND',
      (raw) => {
        const parsed = EvaluationRecordSchema.safeParse(raw);
        return parsed.success ? parsed.data : null;
      },
    );
  }

  private async loadPlan(planDigest: string): Promise<FrozenEvaluationPlan> {
    return this.loadImmutable<FrozenEvaluationPlan>(
      `plan-${planDigest}`,
      planDigest,
      'PLAN_NOT_FOUND',
      (raw) => {
        const parsed = FrozenEvaluationPlanSchema.safeParse(raw);
        return parsed.success ? parsed.data : null;
      },
    );
  }

  private async loadBundle(releaseDigest: string): Promise<HarnessBundle> {
    return this.loadImmutable<HarnessBundle>(
      `bundle-${releaseDigest}`,
      releaseDigest,
      'RELEASE_NOT_FOUND',
      (raw) => {
        const parsed = HarnessBundleSchema.safeParse(raw);
        return parsed.success ? parsed.data : null;
      },
    );
  }

  private assertPlanAuthority(
    plan: FrozenEvaluationPlan,
    evaluation: EvaluationRecord,
    config: FleetConfig,
    releaseDigest: string,
  ): void {
    if (plan.releaseDigest !== releaseDigest) {
      throw new HarnessError(
        'EVALUATION_MISMATCH',
        `Frozen plan releaseDigest ("${plan.releaseDigest}") does not match release ("${releaseDigest}")`,
      );
    }
    if (evaluation.planDigest !== canonicalDigest(plan)) {
      throw new HarnessError(
        'EVALUATION_MISMATCH',
        'Evaluation record does not reference this frozen plan digest',
      );
    }
    if (plan.policyDigest !== policyDigest(config)) {
      throw new HarnessError(
        'POLICY_DIGEST_MISMATCH',
        'Evaluation was performed under a different policy digest; reevaluate under current policy',
      );
    }
    if (plan.runtimeDigest !== evaluationRuntimeDigest(config, plan.cases)) {
      throw new HarnessError(
        'RUNTIME_DIGEST_MISMATCH',
        'Evaluation was performed under a different aggregate host runtime map; reevaluate before release',
      );
    }
    for (const entry of plan.cases) {
      if (
        entry.runtimeDigest !==
        resolveHostRuntime(config, entry.hostId).manifestDigest
      ) {
        throw new HarnessError(
          'RUNTIME_DIGEST_MISMATCH',
          `Case "${entry.id}" runtime digest does not match the resolved runtime of host "${entry.hostId}"`,
        );
      }
    }
    const planned = new Set(plan.requiredProjects);
    const recorded = new Set(evaluation.projects);
    if (
      planned.size !== recorded.size ||
      [...planned].some((id) => !recorded.has(id))
    ) {
      throw new HarnessError(
        'EVALUATION_MISMATCH',
        'Evaluation project coverage does not match the frozen plan required projects',
      );
    }
  }

  private assertBundleHostCompatibility(
    bundle: HarnessBundle,
    plan: FrozenEvaluationPlan,
    config: FleetConfig,
  ): void {
    if (bundle.ompVersions.length === 0) {
      return;
    }
    for (const entry of plan.cases) {
      const hostVersion = resolveHostRuntime(config, entry.hostId).ompVersion;
      if (!bundle.ompVersions.includes(hostVersion)) {
        throw new HarnessError(
          'INCOMPATIBLE_SCOPE',
          `Bundle supports OMP versions [${bundle.ompVersions.join(', ')}] but host "${entry.hostId}" runs "${hostVersion}"`,
        );
      }
    }
  }

  private async assertAuthorizedApproval(
    approval: SignedApproval,
    config: FleetConfig,
    pinsState: FleetPinsState,
    policyDigestValue: string,
  ): Promise<string> {
    if (Date.now() > approval.payload.expiresAt) {
      throw new HarnessError('APPROVAL_EXPIRED', 'Approval has expired');
    }
    if (approval.payload.policyDigest !== policyDigestValue) {
      throw new HarnessError(
        'POLICY_DIGEST_MISMATCH',
        'Approval policyDigest does not match the current authoritative policy digest',
      );
    }
    if (approval.payload.expectedPinGeneration !== pinsState.pinGeneration) {
      throw new HarnessError(
        'PIN_GENERATION_MISMATCH',
        `Expected pin generation ${approval.payload.expectedPinGeneration} does not match current pin generation ${pinsState.pinGeneration}`,
      );
    }
    if (pinsState.usedNonces[approval.payload.nonce]) {
      throw new HarnessError(
        'NONCE_ALREADY_USED',
        `Nonce "${approval.payload.nonce}" has already been used`,
      );
    }
    const approver = config.approvers.find((a) => a.id === approval.approverId);
    if (!approver) {
      throw new HarnessError(
        'UNAUTHORIZED_APPROVER',
        `Approver "${approval.approverId}" is not configured in global fleet approvers`,
      );
    }
    const signed = verifyEd25519Signature(
      canonicalJSON(approvalSignaturePayload(approval.payload)),
      approver.publicKey,
      approval.signature,
    );
    if (!signed) {
      throw new HarnessError(
        'INVALID_SIGNATURE',
        'Ed25519 approval signature verification failed',
      );
    }
    return approverFingerprint(approver.publicKey);
  }

  private assertNotWithdrawn(
    pinsState: FleetPinsState,
    releaseDigest: string,
  ): void {
    if (pinsState.withdrawnReleases[releaseDigest]) {
      throw new HarnessError(
        'RELEASE_WITHDRAWN',
        `Release "${releaseDigest}" has been withdrawn`,
      );
    }
  }

  /**
   * Stores a proposed candidate bundle immutably.
   */
  async propose(bundle: HarnessBundle): Promise<{ digest: string }> {
    const validated = HarnessBundleSchema.safeParse(bundle);
    if (!validated.success) {
      throw new HarnessError(
        'INVALID_BUNDLE',
        `HarnessBundle schema validation failed: ${validated.error.issues
          .map((i) => i.message)
          .join('; ')}`,
      );
    }

    const digest = canonicalDigest(validated.data);
    await this.store.createImmutable(`bundle-${digest}`, validated.data);
    await this.store.transaction<string[]>(BUNDLES_INDEX_NAME, [], (index) =>
      index.includes(digest) ? index : [...index, digest],
    );

    return { digest };
  }

  /**
   * Activates a release under an external Ed25519 signed approval.
   * Policy, approval provenance, evaluation authority and pin mutations share one
   * authoritative transaction.
   */
  async activate(approval: SignedApproval): Promise<void> {
    const parsed = SignedApprovalSchema.safeParse(approval);
    if (!parsed.success) {
      throw new HarnessError(
        'INVALID_APPROVAL',
        `SignedApproval schema validation failed: ${parsed.error.issues
          .map((i) => i.message)
          .join('; ')}`,
      );
    }
    const app = parsed.data;
    if (app.payload.action !== 'activate') {
      throw new HarnessError(
        'ACTION_MISMATCH',
        `Expected action 'activate' but got '${app.payload.action}'`,
      );
    }
    const payload: ActivatePayload = app.payload;

    await this.store.transaction<FleetPinsState>(
      PINS_RECORD_NAME,
      INITIAL_PINS_STATE,
      async (pinsState) => {
        const prepared = await this.prepareActivation(app, payload, pinsState);

        await this.applyRollout(
          pinsState,
          payload,
          prepared.plan,
          prepared.evaluation,
          prepared.config,
          app.approverId,
        );

        this.writePins(
          pinsState,
          payload,
          app.approverId,
          prepared.fingerprint,
          canonicalDigest({
            ...app,
            payload: approvalSignaturePayload(app.payload),
          }),
        );
        this.writeApprovalTuple(
          pinsState,
          payload,
          app.approverId,
          prepared.fingerprint,
        );
        pinsState.usedNonces[payload.nonce] = {
          usedAt: Date.now(),
          approverId: app.approverId,
          purpose: payload.purpose,
          action: 'activate',
        };
        pinsState.pinGeneration += 1;
        pinsState.history.push({
          action: 'activate',
          rollout: payload.rollout,
          releaseDigest: payload.releaseDigest,
          evaluationDigest: payload.evaluationDigest,
          selectors: [...payload.selectors],
          approverId: app.approverId,
          nonce: payload.nonce,
          timestamp: Date.now(),
          pinGeneration: pinsState.pinGeneration,
        });

        return pinsState;
      },
    );
  }

  private async prepareActivation(
    app: SignedApproval,
    payload: ActivatePayload,
    pinsState: FleetPinsState,
  ): Promise<{
    config: FleetConfig;
    fingerprint: string;
    evaluation: EvaluationRecord;
    plan: FrozenEvaluationPlan;
  }> {
    const config = await this.loadPolicy();
    const fingerprint = await this.assertAuthorizedApproval(
      app,
      config,
      pinsState,
      policyDigest(config),
    );
    const bundle = await this.loadBundle(payload.releaseDigest);
    this.assertNotWithdrawn(pinsState, payload.releaseDigest);

    const evaluation = await this.loadEvaluation(payload.evaluationDigest);
    if (!evaluation.eligible) {
      throw new HarnessError(
        'INELIGIBLE_RELEASE',
        `Evaluation record "${payload.evaluationDigest}" is marked ineligible`,
      );
    }
    if (evaluation.releaseDigest !== payload.releaseDigest) {
      throw new HarnessError(
        'EVALUATION_MISMATCH',
        'Evaluation record releaseDigest does not match approval releaseDigest',
      );
    }

    const plan = await this.loadPlan(evaluation.planDigest);
    this.assertPlanAuthority(plan, evaluation, config, payload.releaseDigest);
    this.assertBundleHostCompatibility(bundle, plan, config);
    for (const selector of payload.selectors) {
      await this.assertSelectorCompatibility(
        selector,
        bundle.scope,
        config,
        plan,
        evaluation.planDigest,
        payload.releaseDigest,
      );
    }

    return { config, fingerprint, evaluation, plan };
  }

  private async assertSelectorCompatibility(
    selector: ReleaseSelector,
    bundleScope: ReleaseSelector,
    config: FleetConfig,
    plan: FrozenEvaluationPlan,
    planDigest: string,
    releaseDigest: string,
  ): Promise<void> {
    const projectMembership =
      selector.kind === 'project' &&
      (bundleScope.kind === 'domain' || bundleScope.kind === 'stack')
        ? await this.findProjectMembership(
            selector.key,
            config,
            plan,
            planDigest,
            releaseDigest,
          )
        : undefined;
    validateSelectorCompatibility(
      selector,
      bundleScope,
      config,
      projectMembership,
    );
  }

  private async findProjectMembership(
    logicalProjectId: string,
    config: FleetConfig,
    plan: FrozenEvaluationPlan,
    planDigest: string,
    releaseDigest: string,
  ): Promise<ProvenProjectMembership | null> {
    const ledger = await this.store.read<{
      attempts?: Record<string, Attempt>;
    }>('fleet-ledger', { attempts: {} });
    const cases = plan.cases.filter(
      (entry) => entry.logicalProjectId === logicalProjectId,
    );
    for (const entry of cases) {
      const candidate = ledger.attempts?.[entry.candidateAttemptId];
      if (
        !candidate ||
        candidate.id !== entry.candidateAttemptId ||
        candidate.state !== 'completed' ||
        !candidate.result
      ) {
        continue;
      }

      const result = candidate.result;
      const binding = candidate.binding;
      if (
        result.attemptId !== candidate.id ||
        result.status !== 'completed' ||
        result.passed !== true ||
        !Array.isArray(result.criticalFailures) ||
        result.criticalFailures.length > 0 ||
        result.generation !== candidate.generation ||
        result.harnessDigest !== releaseDigest ||
        result.sourceRevision !== entry.sourceRevision ||
        result.evaluatorDigest !== entry.evaluatorDigest ||
        canonicalJSON(result.binding) !== canonicalJSON(binding) ||
        candidate.projectId !== entry.projectId ||
        candidate.accountId !== entry.accountId ||
        binding.stage !== 'evaluation' ||
        binding.phase !== 'heldout' ||
        binding.planDigest !== planDigest ||
        binding.harnessDigest !== releaseDigest ||
        binding.logicalProjectId !== entry.logicalProjectId ||
        binding.projectId !== entry.projectId ||
        binding.hostId !== entry.hostId ||
        binding.accountId !== entry.accountId ||
        binding.sourceRevision !== entry.sourceRevision ||
        binding.evaluatorDigest !== entry.evaluatorDigest ||
        binding.taskDigest !== entry.taskDigest ||
        binding.policyDigest !== policyDigest(config) ||
        binding.runtimeDigest !==
          resolveHostRuntime(config, entry.hostId).manifestDigest
      ) {
        continue;
      }

      const resultDigest = canonicalDigest(result);
      const evidenceIndex = await this.store.read<{
        entries?: Record<string, { revisions?: unknown }>;
      }>('evidence-index', { entries: {} });
      const revisions = evidenceIndex.entries?.[candidate.id]?.revisions;
      if (!Array.isArray(revisions) || !revisions.includes(resultDigest)) {
        continue;
      }
      const evidence = await this.store.read<{
        attemptId?: unknown;
        task?: unknown;
        result?: unknown;
        recordedAt?: unknown;
      } | null>(evidenceRevisionRecordName(candidate.id, resultDigest), null);
      if (
        !evidence ||
        evidence.attemptId !== candidate.id ||
        evidence.recordedAt !== candidate.createdAt ||
        evidence.result === undefined ||
        canonicalJSON(evidence.result) !== canonicalJSON(result)
      ) {
        continue;
      }

      let task: FleetTask;
      try {
        task = parseFleetTask(evidence.task);
      } catch {
        continue;
      }
      if (
        canonicalDigest(task) !== entry.taskDigest ||
        task.phase !== 'heldout' ||
        task.sourceRef !== entry.sourceRevision ||
        task.project.hostId !== entry.hostId ||
        task.project.projectId !== entry.projectId ||
        task.project.logicalProjectId !== entry.logicalProjectId ||
        resolveLogicalProjectId(task.project, config) !== entry.logicalProjectId
      ) {
        continue;
      }

      const authority = ProjectAuthoritySchema.safeParse(
        result.projectAuthority,
      );
      const hostStackIds = new Set(
        (config.stacks ?? [])
          .filter(
            (stack) =>
              stack.hostIds.includes(entry.hostId) ||
              stack.hostIds.includes('*'),
          )
          .map((stack) => stack.id),
      );
      if (
        !authority.success ||
        authority.data.stackIds.some((stackId) => !hostStackIds.has(stackId))
      ) {
        continue;
      }

      const domain = config.domains.find(
        (item) =>
          item.id === binding.domain &&
          (item.hostIds.includes(entry.hostId) || item.hostIds.includes('*')),
      );
      if (!domain) {
        continue;
      }
      return {
        domain: binding.domain,
        stackIds: authority.data.stackIds,
      };
    }
    return null;
  }

  private async applyRollout(
    pinsState: FleetPinsState,
    payload: ActivatePayload,
    plan: FrozenEvaluationPlan,
    evaluation: EvaluationRecord,
    config: FleetConfig,
    approverId: string,
  ): Promise<void> {
    if (payload.rollout === 'canary') {
      this.startCanary(pinsState, payload, plan, approverId);
      return;
    }

    const canary = pinsState.canaries[payload.releaseDigest];
    if (!canary) {
      throw new HarnessError(
        'CANARY_REQUIRED',
        'Active rollout requires a previously approved canary for this release',
      );
    }
    if (canary.status !== 'active') {
      throw new HarnessError(
        'INVALID_ROLLOUT',
        `Cannot promote canary in status "${canary.status}"`,
      );
    }

    // The initial canary approval records the eligibility evaluation that authorized it.
    // Promotion is a fresh signed approval of its own current evaluation/plan, whose
    // preallocated attempts must run after the canary started; digests need not match.
    await this.assertCanaryEligibilityAuthority(canary, config);
    this.assertTargetsCovered(canary.targets, plan, 'active rollout');

    canary.verified = await this.collectCanaryVerifications(
      canary,
      plan,
      evaluation.planDigest,
      payload.releaseDigest,
      config,
    );
    canary.status = 'promoted';
  }

  private startCanary(
    pinsState: FleetPinsState,
    payload: ActivatePayload,
    plan: FrozenEvaluationPlan,
    approverId: string,
  ): void {
    const nonProject = payload.selectors.filter((s) => s.kind !== 'project');
    if (nonProject.length > 0) {
      throw new HarnessError(
        'INVALID_ROLLOUT',
        'Canary activation requires explicit project selectors only',
      );
    }
    const targets = Array.from(new Set(payload.selectors.map((s) => s.key)));
    this.assertTargetsCovered(targets, plan, 'canary eligibility');
    pinsState.canaries[payload.releaseDigest] = {
      releaseDigest: payload.releaseDigest,
      evaluationDigest: payload.evaluationDigest,
      targets,
      startedAt: Date.now(),
      approverId,
      nonce: payload.nonce,
      status: 'active',
      verified: [],
    };
  }

  /**
   * Revalidates the eligibility evaluation that authorized the canary under the
   * current policy/runtime authority, and that it covered every canary target.
   */
  private async assertCanaryEligibilityAuthority(
    canary: CanaryRecord,
    config: FleetConfig,
  ): Promise<void> {
    const eligibility = await this.loadEvaluation(canary.evaluationDigest);
    if (
      !eligibility.eligible ||
      eligibility.releaseDigest !== canary.releaseDigest
    ) {
      throw new HarnessError(
        'EVALUATION_MISMATCH',
        'Canary eligibility evaluation is ineligible or belongs to another release',
      );
    }
    const plan = await this.loadPlan(eligibility.planDigest);
    this.assertPlanAuthority(plan, eligibility, config, canary.releaseDigest);
    this.assertTargetsCovered(canary.targets, plan, 'canary eligibility');
  }

  private assertTargetsCovered(
    targets: string[],
    plan: FrozenEvaluationPlan,
    phaseLabel: string,
  ): void {
    const covered = new Set(plan.requiredProjects);
    for (const entry of plan.cases) {
      covered.add(entry.logicalProjectId);
    }
    for (const target of targets) {
      if (!covered.has(target)) {
        throw new HarnessError(
          'CANARY_VERIFICATION_FAILED',
          `Canary target "${target}" is not covered by the ${phaseLabel} evaluation plan`,
        );
      }
    }
  }

  /**
   * Binds promotion to exact immutable post-canary verification references:
   * completed plan-case candidate attempts recorded as evidence on this host policy.
   */
  private async collectCanaryVerifications(
    canary: CanaryRecord,
    plan: FrozenEvaluationPlan,
    planDigest: string,
    releaseDigest: string,
    config: FleetConfig,
  ): Promise<CanaryVerification[]> {
    const ledger = await this.store.read<{ attempts: Record<string, Attempt> }>(
      LEDGER_RECORD_NAME,
      { attempts: {} },
    );
    const verified: CanaryVerification[] = [];

    for (const target of canary.targets) {
      const entry = plan.cases.find((c) => c.logicalProjectId === target);
      if (!entry) {
        throw new HarnessError(
          'CANARY_VERIFICATION_FAILED',
          `Canary target "${target}" has no case in the frozen plan`,
        );
      }
      const outcome = await this.verifyCanaryAttempt(
        ledger.attempts[entry.candidateAttemptId],
        entry,
        canary,
        planDigest,
        releaseDigest,
        config,
      );
      if ('reason' in outcome) {
        throw new HarnessError(
          'CANARY_VERIFICATION_FAILED',
          `Canary target "${target}" lacks a verified post-start completed evaluator attempt: ${outcome.reason}`,
        );
      }
      verified.push({ target, ...outcome.verification });
    }

    return verified;
  }

  private async verifyCanaryAttempt(
    attempt: Attempt | undefined,
    entry: FrozenEvaluationPlan['cases'][number],
    canary: CanaryRecord,
    planDigest: string,
    releaseDigest: string,
    config: FleetConfig,
  ): Promise<
    { verification: Omit<CanaryVerification, 'target'> } | { reason: string }
  > {
    if (!attempt) {
      return { reason: 'planned attempt was never admitted' };
    }
    if (attempt.state !== 'completed' || !attempt.result) {
      return {
        reason: `attempt state "${attempt.state}" is not a verified completion`,
      };
    }
    const result = attempt.result;
    if (
      result.status !== 'completed' ||
      result.passed !== true ||
      result.criticalFailures.length > 0
    ) {
      return { reason: 'result is not a clean evaluation pass' };
    }
    if (
      result.generation !== attempt.generation ||
      canonicalJSON(result.binding) !== canonicalJSON(attempt.binding)
    ) {
      return { reason: 'result does not match the admitted attempt identity' };
    }
    if (attempt.createdAt <= canary.startedAt) {
      return { reason: 'attempt predates the approved canary start' };
    }

    const binding = result.binding;
    const checks: Array<[boolean, string]> = [
      [binding.stage === 'evaluation', 'stage is not evaluation'],
      [binding.phase === 'heldout', 'phase is not heldout'],
      [
        binding.planDigest === planDigest,
        'plan digest differs from frozen plan',
      ],
      [
        binding.harnessDigest === releaseDigest,
        'harness digest is not the canary release',
      ],
      [
        binding.logicalProjectId === entry.logicalProjectId,
        'logical project differs',
      ],
      [binding.projectId === entry.projectId, 'raw project differs'],
      [binding.hostId === entry.hostId, 'host differs'],
      [binding.accountId === entry.accountId, 'account differs'],
      [
        binding.sourceRevision === entry.sourceRevision,
        'source revision differs',
      ],
      [
        binding.evaluatorDigest === entry.evaluatorDigest,
        'evaluator digest differs',
      ],
      [binding.taskDigest === entry.taskDigest, 'task digest differs'],
      [binding.policyDigest === policyDigest(config), 'policy digest is stale'],
      [
        binding.runtimeDigest ===
          resolveHostRuntime(config, entry.hostId).manifestDigest,
        'runtime digest is not the resolved host runtime',
      ],
    ];
    const failed = checks.find(([ok]) => !ok);
    if (failed) {
      return { reason: failed[1] };
    }

    const resultDigest = canonicalDigest(result);
    const evidence = await this.store.read<{ result?: unknown } | null>(
      evidenceRevisionRecordName(attempt.id, resultDigest),
      null,
    );
    if (!evidence || evidence.result === undefined) {
      return { reason: 'no recorded immutable evidence reference' };
    }
    if (canonicalJSON(evidence.result) !== canonicalJSON(result)) {
      return {
        reason: 'recorded evidence does not match the authoritative result',
      };
    }
    return {
      verification: {
        attemptId: attempt.id,
        resultDigest,
        generation: attempt.generation,
      },
    };
  }

  private writePins(
    pinsState: FleetPinsState,
    payload: ActivatePayload,
    approverId: string,
    fingerprint: string,
    approvalDigest: string,
  ): void {
    for (const selector of payload.selectors) {
      const key = selectorKey(selector);
      const existing = pinsState.pins[key];
      if (existing) {
        pinsState.previousPins[key] = existing;
      }
      pinsState.pins[key] = {
        releaseDigest: payload.releaseDigest,
        evaluationDigest: payload.evaluationDigest,
        selector,
        approvedAt: Date.now(),
        approverId,
        approverKeyFingerprint: fingerprint,
        approvalDigest,
        nonce: payload.nonce,
        rollout: payload.rollout,
      };
    }
  }

  private writeApprovalTuple(
    pinsState: FleetPinsState,
    payload: ActivatePayload,
    approverId: string,
    fingerprint: string,
  ): void {
    for (const selector of payload.selectors) {
      pinsState.approvals.push({
        releaseDigest: payload.releaseDigest,
        evaluationDigest: payload.evaluationDigest,
        selector,
        rollout: payload.rollout,
        approverId,
        approverKeyFingerprint: fingerprint,
        approvedAt: Date.now(),
        nonce: payload.nonce,
      });
    }
  }

  /**
   * Rolls back to an explicitly previously approved release/selector/evaluation tuple.
   */
  async rollback(approval: SignedApproval): Promise<void> {
    const parsed = SignedApprovalSchema.safeParse(approval);
    if (!parsed.success) {
      throw new HarnessError(
        'INVALID_APPROVAL',
        `SignedApproval schema validation failed: ${parsed.error.issues
          .map((i) => i.message)
          .join('; ')}`,
      );
    }
    const app = parsed.data;
    if (app.payload.action !== 'rollback') {
      throw new HarnessError(
        'ACTION_MISMATCH',
        `Expected action 'rollback' but got '${app.payload.action}'`,
      );
    }
    const payload = app.payload;

    await this.store.transaction<FleetPinsState>(
      PINS_RECORD_NAME,
      INITIAL_PINS_STATE,
      async (pinsState) => {
        const config = await this.loadPolicy();
        const fingerprint = await this.assertAuthorizedApproval(
          app,
          config,
          pinsState,
          policyDigest(config),
        );

        const bundle = await this.loadBundle(payload.releaseDigest);
        this.assertNotWithdrawn(pinsState, payload.releaseDigest);

        const evaluation = await this.loadEvaluation(payload.evaluationDigest);
        if (
          !evaluation.eligible ||
          evaluation.releaseDigest !== payload.releaseDigest
        ) {
          throw new HarnessError(
            'EVALUATION_MISMATCH',
            'Rollback evaluation is ineligible or belongs to another release',
          );
        }
        const plan = await this.loadPlan(evaluation.planDigest);
        this.assertPlanAuthority(
          plan,
          evaluation,
          config,
          payload.releaseDigest,
        );
        this.assertBundleHostCompatibility(bundle, plan, config);

        for (const selector of payload.selectors) {
          await this.assertSelectorCompatibility(
            selector,
            bundle.scope,
            config,
            plan,
            evaluation.planDigest,
            payload.releaseDigest,
          );
          const approvedTuple = pinsState.approvals.some(
            (tuple) =>
              tuple.releaseDigest === payload.releaseDigest &&
              tuple.evaluationDigest === payload.evaluationDigest &&
              tuple.selector.kind === selector.kind &&
              tuple.selector.key === selector.key,
          );
          if (!approvedTuple) {
            throw new HarnessError(
              'ROLLBACK_SCOPE_EXPANSION',
              `Rollback (${selector.kind}:${selector.key}) with evaluation "${payload.evaluationDigest}" was never exactly approved for this release`,
            );
          }
        }

        for (const selector of payload.selectors) {
          const key = selectorKey(selector);
          const existing = pinsState.pins[key];
          if (existing) {
            pinsState.previousPins[key] = existing;
          }
          pinsState.pins[key] = {
            releaseDigest: payload.releaseDigest,
            evaluationDigest: payload.evaluationDigest,
            selector,
            approvedAt: Date.now(),
            approverId: app.approverId,
            approverKeyFingerprint: fingerprint,
            approvalDigest: canonicalDigest({
              ...app,
              payload: approvalSignaturePayload(app.payload),
            }),
            nonce: payload.nonce,
          };
        }

        pinsState.usedNonces[payload.nonce] = {
          usedAt: Date.now(),
          approverId: app.approverId,
          purpose: payload.purpose,
          action: 'rollback',
        };
        pinsState.pinGeneration += 1;
        pinsState.history.push({
          action: 'rollback',
          releaseDigest: payload.releaseDigest,
          evaluationDigest: payload.evaluationDigest,
          selectors: [...payload.selectors],
          approverId: app.approverId,
          nonce: payload.nonce,
          timestamp: Date.now(),
          pinGeneration: pinsState.pinGeneration,
        });

        return pinsState;
      },
    );
  }

  /**
   * Withdraws a release under an external Ed25519 signed approval.
   * Correction of pins is deferred to the shared context predicate, which never
   * returns revoked or out-of-scope guidance.
   */
  async withdraw(approval: SignedApproval): Promise<void> {
    const parsed = SignedApprovalSchema.safeParse(approval);
    if (!parsed.success) {
      throw new HarnessError(
        'INVALID_APPROVAL',
        `SignedApproval schema validation failed: ${parsed.error.issues
          .map((i) => i.message)
          .join('; ')}`,
      );
    }
    const app = parsed.data;
    if (app.payload.action !== 'withdraw') {
      throw new HarnessError(
        'ACTION_MISMATCH',
        `Expected action 'withdraw' but got '${app.payload.action}'`,
      );
    }
    const payload = app.payload;

    await this.store.transaction<FleetPinsState>(
      PINS_RECORD_NAME,
      INITIAL_PINS_STATE,
      async (pinsState) => {
        const config = await this.loadPolicy();
        await this.assertAuthorizedApproval(
          app,
          config,
          pinsState,
          policyDigest(config),
        );

        pinsState.withdrawnReleases[payload.releaseDigest] = {
          releaseDigest: payload.releaseDigest,
          withdrawnAt: Date.now(),
          approverId: app.approverId,
          nonce: payload.nonce,
        };

        const canary = pinsState.canaries[payload.releaseDigest];
        if (canary) {
          canary.status = 'withdrawn';
        }

        for (const [pinKey, pin] of Object.entries(pinsState.pins)) {
          if (pin.releaseDigest !== payload.releaseDigest) {
            continue;
          }
          const previousPin = pinsState.previousPins[pinKey];
          if (
            previousPin &&
            !pinsState.withdrawnReleases[previousPin.releaseDigest]
          ) {
            pinsState.pins[pinKey] = previousPin;
          } else {
            delete pinsState.pins[pinKey];
          }
        }

        pinsState.usedNonces[payload.nonce] = {
          usedAt: Date.now(),
          approverId: app.approverId,
          purpose: payload.purpose,
          action: 'withdraw',
        };
        pinsState.pinGeneration += 1;
        pinsState.history.push({
          action: 'withdraw',
          releaseDigest: payload.releaseDigest,
          evaluationDigest: payload.evaluationDigest,
          selectors: [...payload.selectors],
          approverId: app.approverId,
          nonce: payload.nonce,
          timestamp: Date.now(),
          pinGeneration: pinsState.pinGeneration,
        });

        return pinsState;
      },
    );
  }

  /**
   * Resolves approved guidance for a project under current policy authority.
   * Current and previous pins share one authority/scope/compatibility predicate.
   */
  async context(
    project: FleetProject,
    platform: string,
    ompVersion: string,
  ): Promise<{ releaseDigest: string; guidance: string } | null> {
    const pinsState = await this.store.read<FleetPinsState>(
      PINS_RECORD_NAME,
      INITIAL_PINS_STATE,
    );

    let resolvedDomain: string;
    let currentConfig: FleetConfig;
    let canonicalProject: FleetProject;
    let stackIds: string[];
    try {
      const loadedConfig = await this.policyService.load();
      const authority = await resolveProjectAuthority(project, loadedConfig);
      canonicalProject = { ...project, rootPath: authority.canonicalRootPath };
      const resolution = await this.policyService.resolve(canonicalProject);
      if (policyDigest(resolution.config) !== policyDigest(loadedConfig)) {
        return null;
      }
      resolvedDomain = resolution.domain;
      currentConfig = resolution.config;
      stackIds = authority.stackIds;
    } catch {
      return null;
    }
    const candidates: string[] = [
      `project:${canonicalProject.logicalProjectId}`,
    ];
    for (const stackId of stackIds) {
      candidates.push(`stack:${stackId}`);
    }
    candidates.push(`domain:${resolvedDomain}`, 'fleet:*');

    const input: PinResolutionInput = {
      pinsState,
      project: canonicalProject,
      resolvedDomain,
      stackIds,
      platform,
      ompVersion,
      config: currentConfig,
    };

    for (const key of candidates) {
      const pin = pinsState.pins[key];
      if (!pin) {
        continue;
      }
      const resolved = await this.resolveApprovedPin(pin, input);
      if (resolved) {
        return resolved;
      }
      const previousPin = pinsState.previousPins[key];
      if (previousPin) {
        const fallback = await this.resolveApprovedPin(previousPin, input);
        if (fallback) {
          return fallback;
        }
      }
      // A current pin for this selector is unusable: never broaden to a wider selector.
      return null;
    }

    return null;
  }

  /**
   * Single predicate for current and previous pins: withdrawal, live approver key,
   * digest-verified evaluation/plan under current policy/runtime authority,
   * bundle scope containment and platform/OMP compatibility.
   */
  private async resolveApprovedPin(
    pin: FleetPin,
    input: PinResolutionInput,
  ): Promise<{ releaseDigest: string; guidance: string } | null> {
    if (pin.releaseDigest.length === 0) {
      return null;
    }
    if (input.pinsState.withdrawnReleases[pin.releaseDigest]) {
      return null;
    }

    const approver = input.config.approvers.find(
      (a) => a.id === pin.approverId,
    );
    if (!approver) {
      return null;
    }
    let fingerprint: string;
    try {
      fingerprint = approverFingerprint(approver.publicKey);
    } catch {
      return null;
    }
    if (fingerprint !== pin.approverKeyFingerprint) {
      return null;
    }

    let evaluation: EvaluationRecord;
    let plan: FrozenEvaluationPlan;
    try {
      evaluation = await this.loadEvaluation(pin.evaluationDigest);
      plan = await this.loadPlan(evaluation.planDigest);
      this.assertPlanAuthority(
        plan,
        evaluation,
        input.config,
        pin.releaseDigest,
      );
    } catch {
      return null;
    }
    if (!evaluation.eligible) {
      return null;
    }

    const bundle = await this.store.read<HarnessBundle | null>(
      `bundle-${pin.releaseDigest}`,
      null,
    );
    if (!bundle || !this.bundleCoversProject(bundle, input)) {
      return null;
    }

    const platformOk =
      bundle.platforms.length === 0 ||
      bundle.platforms.includes(input.platform);
    const ompOk =
      bundle.ompVersions.length === 0 ||
      bundle.ompVersions.includes(input.ompVersion);
    if (!platformOk || !ompOk) {
      return null;
    }

    return { releaseDigest: pin.releaseDigest, guidance: bundle.guidance };
  }

  private bundleCoversProject(
    bundle: HarnessBundle,
    input: PinResolutionInput,
  ): boolean {
    if (bundle.scope.kind === 'project') {
      return bundle.scope.key === input.project.logicalProjectId;
    }
    if (bundle.scope.kind === 'domain') {
      return bundle.scope.key === input.resolvedDomain;
    }
    if (bundle.scope.kind === 'stack') {
      return input.stackIds.includes(bundle.scope.key);
    }
    return true;
  }

  async status(): Promise<{
    pinGeneration: number;
    activePinsCount: number;
    pins: Record<string, FleetPin>;
    approvedReleasesCount: number;
    canariesCount: number;
    withdrawnCount: number;
    usedNoncesCount: number;
    historyCount: number;
  }> {
    const pinsState = await this.store.read<FleetPinsState>(
      PINS_RECORD_NAME,
      INITIAL_PINS_STATE,
    );

    return {
      pinGeneration: pinsState.pinGeneration,
      activePinsCount: Object.keys(pinsState.pins).length,
      pins: { ...pinsState.pins },
      approvedReleasesCount: new Set(
        pinsState.approvals.map((tuple) => tuple.releaseDigest),
      ).size,
      canariesCount: Object.keys(pinsState.canaries).length,
      withdrawnCount: Object.keys(pinsState.withdrawnReleases).length,
      usedNoncesCount: Object.keys(pinsState.usedNonces).length,
      historyCount: pinsState.history.length,
    };
  }
}

interface PinResolutionInput {
  pinsState: FleetPinsState;
  project: FleetProject;
  resolvedDomain: string;
  stackIds: string[];
  platform: string;
  ompVersion: string;
  config: FleetConfig;
}
