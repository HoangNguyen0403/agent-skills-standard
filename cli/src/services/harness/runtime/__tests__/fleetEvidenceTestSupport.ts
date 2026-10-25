import crypto from 'crypto';
import {
  Attempt,
  canonicalDigest,
  canonicalJSON,
  evaluationRuntimeDigest,
  FleetConfig,
  FleetEvidenceVerifier,
  FleetProject,
  FrozenEvaluationPlan,
  policyDigest,
  resolveHostRuntime,
  RunResult,
  TerminationEvidence,
} from '../RuntimeTypes';
import { resolveProjectAuthority } from '../FleetPolicyService';

export async function bindProjectAuthority(
  result: RunResult,
  project: FleetProject,
  config: FleetConfig,
): Promise<RunResult> {
  return {
    ...result,
    projectAuthority: await resolveProjectAuthority(project, config),
  };
}

/** Immutable committed revision used by every synthetic fixture (lowercase 40-hex). */
export const IMMUTABLE_SOURCE_SHA = '3f9c2a1b7d4e5f60718293a4b5c6d7e8f9012345';

interface SignedReceipt {
  payload: string;
  signature: string;
}

function receiptKey(
  kind: 'completion' | 'termination',
  attemptId: string,
  digest: string,
): string {
  return `${kind}:${attemptId}:${digest}`;
}

/**
 * Synthetic trusted verifier: validates an independently signed receipt for the exact
 * attempt generation/binding/result digest. Copying attempt fields is never sufficient,
 * and absent/revoked receipts deny. It proves the ledger's verification path only —
 * it is not production runtime evidence.
 */
export class SyntheticReceiptVerifier implements FleetEvidenceVerifier {
  private readonly keyPair = crypto.generateKeyPairSync('ed25519');
  private readonly receipts = new Map<string, SignedReceipt>();

  private store(
    kind: 'completion' | 'termination',
    attemptId: string,
    digest: string,
    payload: string,
  ): void {
    const signature = crypto
      .sign(null, Buffer.from(payload, 'utf8'), this.keyPair.privateKey)
      .toString('base64');
    this.receipts.set(receiptKey(kind, attemptId, digest), {
      payload,
      signature,
    });
  }

  private verify(
    kind: 'completion' | 'termination',
    attemptId: string,
    digest: string,
    payload: string,
  ): boolean {
    const receipt = this.receipts.get(receiptKey(kind, attemptId, digest));
    if (!receipt || receipt.payload !== payload) {
      return false;
    }
    return crypto.verify(
      null,
      Buffer.from(receipt.payload, 'utf8'),
      this.keyPair.publicKey,
      Buffer.from(receipt.signature, 'base64'),
    );
  }

  private completionPayload(attempt: Attempt, result: RunResult): string {
    return canonicalJSON({
      purpose: 'synthetic-completion-v1',
      attemptId: attempt.id,
      generation: attempt.generation,
      bindingDigest: canonicalDigest(attempt.binding),
      resultDigest: canonicalDigest(result),
    });
  }

  issueCompletion(attempt: Attempt, result: RunResult): void {
    this.store(
      'completion',
      attempt.id,
      canonicalDigest(result),
      this.completionPayload(attempt, result),
    );
  }

  revokeCompletion(attemptId: string, result: RunResult): void {
    this.receipts.delete(
      receiptKey('completion', attemptId, canonicalDigest(result)),
    );
  }

  issueTermination(attempt: Attempt, evidence: TerminationEvidence): void {
    this.store(
      'termination',
      attempt.id,
      canonicalDigest(evidence),
      canonicalJSON({
        purpose: 'synthetic-termination-v1',
        attemptId: attempt.id,
        generation: attempt.generation,
        evidenceDigest: canonicalDigest(evidence),
        confirmed: evidence.confirmed,
      }),
    );
  }

  async verifyCompletion(
    attempt: Attempt,
    result: RunResult,
  ): Promise<boolean> {
    if (result.attemptId !== attempt.id) {
      return false;
    }
    if (canonicalJSON(result.binding) !== canonicalJSON(attempt.binding)) {
      return false;
    }
    return this.verify(
      'completion',
      attempt.id,
      canonicalDigest(result),
      this.completionPayload(attempt, result),
    );
  }

  async verifyTermination(
    attempt: Attempt,
    evidence: TerminationEvidence,
  ): Promise<boolean> {
    if (
      evidence.attemptId !== attempt.id ||
      evidence.generation !== attempt.generation
    ) {
      return false;
    }
    return this.verify(
      'termination',
      attempt.id,
      canonicalDigest(evidence),
      canonicalJSON({
        purpose: 'synthetic-termination-v1',
        attemptId: attempt.id,
        generation: attempt.generation,
        evidenceDigest: canonicalDigest(evidence),
        confirmed: evidence.confirmed,
      }),
    );
  }
}

export interface FrozenCaseInput {
  id: string;
  taskDigest: string;
  hostId: string;
  projectId: string;
  logicalProjectId: string;
  accountId: string;
  sourceRevision: string;
  evaluatorDigest: string;
  baselineAttemptId: string;
  candidateAttemptId: string;
}

export interface FrozenPlanInput {
  id: string;
  releaseDigest: string;
  baselineDigest: string;
  requiredProjects: string[];
  minImprovement: number;
  maxRegressions: number;
  cases: FrozenCaseInput[];
}

/**
 * Builds a plan whose per-case and aggregate runtime identities come from the same
 * core helpers production uses, so fixtures cannot invent a parallel convention.
 */
export function buildFrozenPlan(
  config: FleetConfig,
  input: FrozenPlanInput,
): FrozenEvaluationPlan {
  const cases = input.cases.map((entry) => ({
    ...entry,
    runtimeDigest: resolveHostRuntime(config, entry.hostId).manifestDigest,
  }));
  return {
    schemaVersion: 1,
    id: input.id,
    releaseDigest: input.releaseDigest,
    baselineDigest: input.baselineDigest,
    policyDigest: policyDigest(config),
    runtimeDigest: evaluationRuntimeDigest(config, cases),
    requiredProjects: input.requiredProjects,
    minImprovement: input.minImprovement,
    maxRegressions: input.maxRegressions,
    cases,
  };
}

export function hostRuntimeDigest(config: FleetConfig, hostId: string): string {
  return resolveHostRuntime(config, hostId).manifestDigest;
}

export function approverKeyMaterial(): {
  publicKeySpki: string;
  sign: (payload: unknown) => string;
} {
  const pair = crypto.generateKeyPairSync('ed25519');
  return {
    publicKeySpki: pair.publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('base64'),
    sign: (payload: unknown) =>
      crypto
        .sign(
          null,
          Buffer.from(canonicalJSON(payload), 'utf8'),
          pair.privateKey,
        )
        .toString('base64'),
  };
}
