import crypto from 'crypto';
import fs from 'fs-extra';
import nodeFs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { SandboxRunner } from './SandboxRunner';
import { verifyRuntimeManifest } from './RuntimeManifest';
import {
  ExecutionContextSchema,
  FleetAccountSchema,
  FleetRuntimeConfigSchema,
  FleetTaskSchema,
  HarnessBundleSchema,
  HarnessError,
} from './RuntimeTypes';
import type { ExecutionContext, FleetRuntimeConfig } from './RuntimeTypes';

/** Byte bounds for worker text, transcript and streamed output. */
export const OMP_WORKER_LIMITS = {
  maxTextBytes: 4 * 1024 * 1024,
  maxTranscriptBytes: 8 * 1024 * 1024,
  maxToolOutputBytes: 1024 * 1024,
  maxJobBytes: 16 * 1024 * 1024,
  maxStdoutBytes: 8 * 1024 * 1024,
  maxStderrBytes: 2 * 1024 * 1024,
  releaseTimeoutMs: 15000,
  releasePollMs: 50,
} as const;

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/);

const commonJobFields = {
  schemaVersion: z.literal(1),
  runtime: FleetRuntimeConfigSchema,
  expectedRuntimeDigest: digestSchema,
  workerAssetPath: z.string().min(1).max(4096),
  agentDir: z.string().min(1).max(4096),
  neutralCwd: z.string().min(1).max(4096),
  deadline: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
};

export const OmpHealthJobSchema = z
  .object({
    ...commonJobFields,
    mode: z.literal('health'),
  })
  .strict();

export const OmpWorkerJobSchema = z
  .object({
    ...commonJobFields,
    mode: z.literal('run'),
    context: ExecutionContextSchema,
    task: FleetTaskSchema,
    bundle: HarnessBundleSchema,
    account: FleetAccountSchema,
    workspace: z.string().min(1).max(4096),
    maxToolCalls: z.number().int().positive().max(100000),
    authDbPath: z.string().min(1).max(4096).optional(),
    launchNonce: digestSchema,
    usageFilePath: z.string().min(1).max(4096),
    usageNonce: digestSchema,
    releaseFilePath: z.string().min(1).max(4096),
  })
  .strict();

export const OmpWorkerReleaseSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string().min(1).max(256),
    generation: z.number().int().positive(),
    role: z.enum(['task', 'evaluator']),
    runtimeDigest: digestSchema,
    launchNonce: digestSchema,
    pid: z.number().int().positive(),
    releasedAt: z.number().int().positive(),
  })
  .strict();

export const OmpWorkerUsageCheckpointSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string().min(1).max(256),
    generation: z.number().int().positive(),
    role: z.enum(['task', 'evaluator']),
    runtimeDigest: digestSchema,
    workerPid: z.number().int().positive(),
    usageNonce: digestSchema,
    observedAt: z.number().int().positive(),
    toolCalls: z.number().int().nonnegative().max(100000),
    costUsd: z.number().finite().nonnegative().nullable(),
    complete: z.boolean(),
  })
  .strict();
export type OmpWorkerUsageCheckpoint = z.infer<
  typeof OmpWorkerUsageCheckpointSchema
>;
async function writeAtomicUsageCheckpoint(
  filePath: string,
  checkpoint: OmpWorkerUsageCheckpoint,
): Promise<void> {
  const directory = path.dirname(filePath);
  await fs.ensureDir(directory, 0o700);
  const temporaryPath = `${filePath}.tmp.${crypto.randomBytes(8).toString('hex')}`;
  const handle = await nodeFs.open(temporaryPath, 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify(checkpoint), 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await nodeFs.rename(temporaryPath, filePath);
  const directoryHandle = await nodeFs.open(directory, 'r');
  try {
    await directoryHandle.sync();
  } finally {
    await directoryHandle.close();
  }
}

export type OmpHealthJob = z.infer<typeof OmpHealthJobSchema>;
export type OmpWorkerRunJob = z.infer<typeof OmpWorkerJobSchema>;

export const OmpWorkerResultSchema = z
  .object({
    schemaVersion: z.literal(1),
    mode: z.literal('run'),
    attemptId: z.string().min(1).max(256),
    generation: z.number().int().positive(),
    role: z.enum(['task', 'evaluator']),
    runtimeDigest: digestSchema,
    text: z.string().max(OMP_WORKER_LIMITS.maxTextBytes),
    toolCalls: z.number().int().nonnegative().max(100000),
    costUsd: z.number().finite().nonnegative().nullable(),
    transcript: z.string().max(OMP_WORKER_LIMITS.maxTranscriptBytes),
  })
  .strict();

export type OmpWorkerJobResult = z.infer<typeof OmpWorkerResultSchema>;

export const OmpHealthResultSchema = z
  .object({
    schemaVersion: z.literal(1),
    mode: z.literal('health'),
    restrictedSessionInitialized: z.literal(true),
    activeTools: z.array(z.string()).length(1),
    allTools: z.array(z.string()).length(1),
    modelTokens: z.number().int().nonnegative(),
    modelPromptSubmitted: z.literal(false),
    runtimeDigest: digestSchema,
  })
  .strict();

export type OmpHealthResult = z.infer<typeof OmpHealthResultSchema>;

/**
 * Neutral pinned-catalog fixture model identifiers used only to construct a real
 * restricted session for health. No prompt, refresh or provider call is performed.
 * Verified present in the pinned OMP catalog without account credentials.
 */
const HEALTH_FIXTURE_MODELS: Array<{ provider: string; model: string }> = [
  { provider: 'anthropic', model: 'claude-sonnet-4-5' },
];

const ENDPOINT_FIELDS = ['baseUrl', 'endpoint', 'url'] as const;

interface SandboxToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError: boolean;
}

interface AssistantMessageEvent {
  type: string;
  delta?: string;
}

interface AgentSessionEvent {
  type: string;
  assistantMessageEvent?: AssistantMessageEvent;
  message?: unknown;
}

interface RestrictedSession {
  getActiveToolNames: () => string[];
  getAllToolNames: () => Array<string | { name: string }>;
  getSessionStats?: () => { tokens?: { total?: number }; cost?: number };
  agent?: {
    addBeforeModelCall?: (
      handler: () => { stop?: boolean; reason?: string } | undefined,
    ) => void;
  };
  subscribe?: (handler: (event: AgentSessionEvent) => void) => void;
  prompt: (text: string, options: Record<string, unknown>) => Promise<unknown>;
  dispose: () => Promise<void>;
}

export function getAssistantTextDelta(event: unknown): string | null {
  if (typeof event !== 'object' || event === null) {
    return null;
  }
  const update = event as { assistantMessageEvent?: unknown };
  const assistantEvent = update.assistantMessageEvent;
  if (typeof assistantEvent !== 'object' || assistantEvent === null) {
    return null;
  }
  const delta = assistantEvent as { type?: unknown; delta?: unknown };
  return delta.type === 'text_delta' && typeof delta.delta === 'string'
    ? delta.delta
    : null;
}

interface OmpModelRegistry {
  find: (
    provider: string,
    model: string,
  ) => Record<string, unknown> | undefined;
}

const AMBIENT_AUTH_SENTINEL = '<authenticated>';

function rejectAmbientAuthResult(value: unknown): unknown {
  const candidate =
    typeof value === 'object' && value !== null && 'apiKey' in value
      ? value.apiKey
      : Array.isArray(value)
        ? value[0]
        : value;
  if (candidate === AMBIENT_AUTH_SENTINEL) {
    throw new HarnessError(
      'AMBIENT_CREDENTIALS_FORBIDDEN',
      'Experimental workers cannot use host-derived cloud credentials.',
    );
  }
  return value;
}

function guardCredentialResult(result: unknown): unknown {
  if (
    typeof result === 'object' &&
    result !== null &&
    'then' in result &&
    typeof result.then === 'function'
  ) {
    return Promise.resolve(result).then(rejectAmbientAuthResult);
  }
  return rejectAmbientAuthResult(result);
}

export function installExperimentalCredentialGuard(
  registry: OmpModelRegistry,
): void {
  const target = registry as unknown as Record<string, unknown>;
  for (const name of [
    'getApiKey',
    'getApiKeyAndHeaders',
    'getApiKeyForProvider',
    'getApiKeyWithCredentialForProvider',
    'resolver',
  ]) {
    const original = target[name];
    if (typeof original !== 'function') {
      continue;
    }
    target[name] = function guardedCredentialResolution(
      this: unknown,
      ...args: unknown[]
    ): unknown {
      const result = Reflect.apply(original, this, args) as unknown;
      return guardCredentialResult(result);
    };
  }
  const resolver = target.resolver;
  if (
    typeof resolver === 'object' &&
    resolver !== null &&
    'resolve' in resolver
  ) {
    const resolverObject = resolver as Record<string, unknown>;
    const resolve = resolverObject.resolve;
    if (typeof resolve === 'function') {
      resolverObject.resolve = function guardedResolver(
        this: unknown,
        ...args: unknown[]
      ): unknown {
        const result = Reflect.apply(resolve, this, args) as unknown;
        return guardCredentialResult(result);
      };
    }
  }
}

interface OmpSdkShape {
  AgentRegistry: new () => unknown;
  AuthStorage: {
    create: (authDbPath: string) => Promise<OmpAuthStorage>;
  };
  ModelRegistry: new (
    auth: unknown,
    basePath: unknown,
    options: {
      settings: unknown;
      ignoreLocalModelConfig: boolean;
      cacheDbPath: string;
    },
  ) => OmpModelRegistry;
  SessionManager: { inMemory: () => unknown };
  Settings: { isolated: (values: Record<string, boolean>) => unknown };
  createAgentSession: (options: Record<string, unknown>) => Promise<{
    session: RestrictedSession;
  }>;
}

interface OmpAuthStorage {
  credentials?: { reload?: () => Promise<void> };
  close: () => Promise<void>;
}

function canonicalEndpoint(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new HarnessError(
      'UNAUTHORIZED_PROVIDER_ENDPOINT',
      `Provider endpoint is not a valid URL: ${raw}`,
    );
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new HarnessError(
      'UNAUTHORIZED_PROVIDER_ENDPOINT',
      `Provider endpoint must use HTTP(S): ${raw}`,
    );
  }
  if (parsed.username !== '' || parsed.password !== '') {
    throw new HarnessError(
      'UNAUTHORIZED_PROVIDER_ENDPOINT',
      'Provider endpoint must not embed credentials.',
    );
  }
  if (parsed.search !== '' || parsed.hash !== '') {
    throw new HarnessError(
      'UNAUTHORIZED_PROVIDER_ENDPOINT',
      'Provider endpoint must not carry query/hash routing components.',
    );
  }
  const pathname = parsed.pathname.replace(/\/+$/, '');
  return `${parsed.protocol}//${parsed.host}${pathname}`;
}

function collectDeclaredEndpoints(model: Record<string, unknown>): string[] {
  const declared: string[] = [];
  for (const field of ENDPOINT_FIELDS) {
    const value = model[field];
    if (typeof value === 'string' && value.trim().length > 0) {
      declared.push(value.trim());
    }
  }
  const client = model.client;
  if (client && typeof client === 'object' && 'baseUrl' in client) {
    const baseUrl = client.baseUrl;
    if (typeof baseUrl === 'string' && baseUrl.trim().length > 0) {
      declared.push(baseUrl.trim());
    }
  }
  return declared;
}

/**
 * Binds the model's actual declared transport endpoint to the account's allowed
 * endpoints. Missing, conflicting or out-of-scope endpoint metadata denies execution;
 * there is no guessed provider default and no "any matching field wins" acceptance.
 */
export function validateModelEndpoint(
  model: Record<string, unknown>,
  allowedEndpoints: string[],
): void {
  if (!Array.isArray(allowedEndpoints) || allowedEndpoints.length === 0) {
    throw new HarnessError(
      'UNAUTHORIZED_PROVIDER_ENDPOINT',
      'Account has no allowedProviderEndpoints configured; execution denied.',
    );
  }

  const declared = collectDeclaredEndpoints(model);
  if (declared.length === 0) {
    throw new HarnessError(
      'UNAUTHORIZED_PROVIDER_ENDPOINT',
      'Model definition declares no explicit transport endpoint; execution denied.',
    );
  }

  const effective = new Set(declared.map(canonicalEndpoint));
  if (effective.size !== 1) {
    throw new HarnessError(
      'UNAUTHORIZED_PROVIDER_ENDPOINT',
      'Model definition declares conflicting transport endpoints; execution denied.',
    );
  }
  const endpoint = [...effective][0];

  const allowedCanonical = allowedEndpoints.map((entry) =>
    canonicalEndpoint(entry),
  );
  const permitted = allowedCanonical.some(
    (allowed) => endpoint === allowed || endpoint.startsWith(`${allowed}/`),
  );
  if (!permitted) {
    throw new HarnessError(
      'UNAUTHORIZED_PROVIDER_ENDPOINT',
      `Model endpoint "${endpoint}" is not permitted by the selected account's allowed endpoints.`,
    );
  }
}

function assertRuntimeClosure(
  job: OmpHealthJob | OmpWorkerRunJob,
): Promise<void> {
  return verifyRuntimeManifest(
    job.runtime.manifestFile,
    job.runtime,
    job.expectedRuntimeDigest,
  ).then((result) => {
    if (!result.valid) {
      throw new HarnessError(
        'RUNTIME_CLOSURE_UNVERIFIED',
        `Installed runtime closure failed verification before SDK import: ${result.reasonCodes.join(', ')}`,
      );
    }
  });
}

/**
 * Loads the runtime-selected pinned SDK module. Dynamic import is required because the
 * module path is configured per host and digest-verified before this call; it is not a
 * bundled dependency of this package.
 */
async function loadOmpSdk(sdkModulePath: string): Promise<OmpSdkShape> {
  let loaded: unknown;
  try {
    loaded = await import(sdkModulePath);
  } catch (error) {
    throw new HarnessError(
      'SDK_MODULE_LOAD_FAILED',
      `Failed to import pinned OMP SDK from ${sdkModulePath}: ${String(error)}`,
    );
  }
  if (!loaded || typeof loaded !== 'object') {
    throw new HarnessError(
      'SDK_MODULE_INCOMPLETE',
      'Pinned OMP SDK module has no exports.',
    );
  }
  const candidate = loaded as Partial<OmpSdkShape>;
  const required: Array<keyof OmpSdkShape> = [
    'AgentRegistry',
    'AuthStorage',
    'ModelRegistry',
    'SessionManager',
    'Settings',
    'createAgentSession',
  ];
  for (const key of required) {
    if (candidate[key] === undefined) {
      throw new HarnessError(
        'SDK_MODULE_INCOMPLETE',
        `Pinned OMP SDK module is missing required export: ${String(key)}`,
      );
    }
  }
  return candidate as OmpSdkShape;
}

interface SessionTool {
  name: string;
  label: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (
    toolCallId: string,
    params: unknown,
    signal?: AbortSignal,
  ) => Promise<SandboxToolResult>;
}

function buildSandboxTool(options: {
  runtime: FleetRuntimeConfig;
  workspace: string;
  context: ExecutionContext;
  deadline: number;
  maxToolCalls: number;
  counter: { calls: number };
  admitToolCall: () => Promise<boolean>;
}): SessionTool {
  const runner = new SandboxRunner(options.runtime);
  return {
    name: 'sandbox_exec',
    label: 'Contained sandbox execution',
    description:
      'Execute a command inside the isolated Docker sandbox container.',
    parameters: {
      type: 'object',
      properties: {
        argv: {
          type: 'array',
          minItems: 1,
          maxItems: 64,
          items: { type: 'string', minLength: 1, maxLength: 2048 },
          description: 'Command and arguments to execute inside the sandbox.',
        },
      },
      required: ['argv'],
      additionalProperties: false,
    },
    execute: async (_toolCallId, params, signal) => {
      if (options.counter.calls >= options.maxToolCalls) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: tool-call allowance of ${options.maxToolCalls} is exhausted.`,
            },
          ],
          isError: true,
        };
      }
      if (Date.now() >= options.deadline) {
        return {
          content: [
            { type: 'text', text: 'Error: execution deadline has expired.' },
          ],
          isError: true,
        };
      }

      const parsedParams = z
        .object({
          argv: z.array(z.string().min(1).max(2048)).min(1).max(64),
        })
        .strict()
        .safeParse(params);
      if (!parsedParams.success) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: sandbox_exec parameters must be exactly {"argv": string[]} (1..64 non-empty entries).',
            },
          ],
          isError: true,
        };
      }
      try {
        if (!(await options.admitToolCall())) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: tool-call checkpoint could not be committed.',
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: tool-call checkpoint failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }

      try {
        const result = await runner.execute(
          options.workspace,
          parsedParams.data.argv,
          {
            context: options.context,
            deadline: options.deadline,
            ...(signal ? { signal } : {}),
          },
        );
        const combined = `${result.stdout}${result.stderr ? `\n${result.stderr}` : ''}`;
        const bounded =
          combined.length > OMP_WORKER_LIMITS.maxToolOutputBytes
            ? `${combined.slice(0, OMP_WORKER_LIMITS.maxToolOutputBytes)}\n[output truncated]`
            : combined;
        return {
          content: [{ type: 'text', text: bounded }],
          isError: result.exitCode !== 0,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            { type: 'text', text: `Sandbox execution error: ${message}` },
          ],
          isError: true,
        };
      }
    },
  };
}

function getAllToolNames(session: RestrictedSession): string[] {
  return session
    .getAllToolNames()
    .map((tool) => (typeof tool === 'string' ? tool : tool.name));
}

function assertSoleSandboxTool(session: RestrictedSession): void {
  const active = session.getActiveToolNames();
  const all = getAllToolNames(session);
  if (
    active.length !== 1 ||
    active[0] !== 'sandbox_exec' ||
    all.length !== 1 ||
    all[0] !== 'sandbox_exec'
  ) {
    throw new HarnessError(
      'CONTAINMENT_POLICY_VIOLATION',
      `Restricted session toolset must be exactly ['sandbox_exec'] (active=[${active.join(', ')}], all=[${all.join(', ')}]).`,
    );
  }
}

async function createSettingsAndRegistry(
  sdk: OmpSdkShape,
  job: OmpHealthJob | OmpWorkerRunJob,
): Promise<{
  auth: OmpAuthStorage;
  registry: OmpModelRegistry;
  settings: unknown;
}> {
  const settings = sdk.Settings.isolated({
    'compaction.enabled': false,
    'retry.enabled': false,
  });
  const authDbPath =
    'authDbPath' in job && job.authDbPath
      ? job.authDbPath
      : path.join(job.agentDir, 'auth.sqlite');
  await fs.ensureDir(path.dirname(authDbPath));
  const auth = await sdk.AuthStorage.create(authDbPath);
  if (auth.credentials && typeof auth.credentials.reload === 'function') {
    await auth.credentials.reload();
  }
  const registry = new sdk.ModelRegistry(auth, undefined, {
    settings,
    ignoreLocalModelConfig: true,
    cacheDbPath: path.join(job.agentDir, 'models.db'),
  });
  return { auth, registry, settings };
}

async function createRestrictedSession(options: {
  sdk: OmpSdkShape;
  settings: unknown;
  auth: unknown;
  registry: unknown;
  model: Record<string, unknown>;
  job: OmpHealthJob | OmpWorkerRunJob;
  tool: SessionTool;
  systemPrompt: string;
}): Promise<RestrictedSession> {
  const { sdk, job, tool } = options;
  const { session } = await sdk.createAgentSession({
    cwd: job.neutralCwd,
    agentDir: job.agentDir,
    settings: options.settings,
    authStorage: options.auth,
    modelRegistry: options.registry,
    model: options.model,
    agentRegistry: new sdk.AgentRegistry(),
    sessionManager: sdk.SessionManager.inMemory(),
    toolNames: ['sandbox_exec'],
    restrictToolNames: true,
    allowRestrictedCustomTools: true,
    customTools: [tool],
    skills: [],
    rules: [],
    contextFiles: [],
    promptTemplates: [],
    slashCommands: [],
    extensions: [],
    additionalExtensionPaths: [],
    preloadedExtensionPaths: [],
    preloadedCustomToolPaths: [],
    preloadedPreparedExtensions: [],
    disableExtensionDiscovery: true,
    enableMCP: false,
    mcpTools: [],
    enableLsp: false,
    enableIrc: false,
    skipPythonPreflight: true,
    requireYieldTool: false,
    hasUI: false,
    interactivePrompts: false,
    cacheWarming: false,
    suppressAutoPrewalk: true,
    bindProcessState: false,
    systemPrompt: options.systemPrompt,
  });
  return session;
}

export async function executeHealthJob(
  rawJob: unknown,
): Promise<OmpHealthResult> {
  const parsed = OmpHealthJobSchema.safeParse(rawJob);
  if (!parsed.success) {
    throw new HarnessError(
      'WORKER_JOB_INVALID',
      `Health job configuration failed strict validation: ${parsed.error.issues
        .map((issue) => issue.path.join('.'))
        .join(', ')}`,
    );
  }
  const job = parsed.data;
  await assertRuntimeClosure(job);

  const sdk = await loadOmpSdk(job.runtime.sdkModule);
  const { auth, registry, settings } = await createSettingsAndRegistry(
    sdk,
    job,
  );

  try {
    let model: Record<string, unknown> | undefined;
    for (const fixture of HEALTH_FIXTURE_MODELS) {
      model = registry.find(fixture.provider, fixture.model);
      if (model) {
        break;
      }
    }
    if (!model) {
      throw new HarnessError(
        'HEALTH_MODEL_UNAVAILABLE',
        'Pinned catalog fixture model is unavailable for zero-model health initialization.',
      );
    }

    const tool = buildSandboxTool({
      runtime: job.runtime,
      workspace: job.neutralCwd,
      context: {
        attemptId: 'health',
        generation: 1,
        role: 'task',
        deadline: job.deadline,
        runtimeDigest: job.expectedRuntimeDigest,
        stateDir: job.neutralCwd,
      },
      deadline: job.deadline,
      maxToolCalls: 0,
      counter: { calls: 0 },
      admitToolCall: async () => false,
    });

    const session = await createRestrictedSession({
      sdk,
      settings,
      auth,
      registry,
      model,
      job,
      tool,
      systemPrompt: 'Health initialization only. No prompt will be submitted.',
    });

    try {
      assertSoleSandboxTool(session);
      if (typeof session.getSessionStats !== 'function') {
        throw new HarnessError(
          'SDK_SESSION_SHAPE_UNSUPPORTED',
          'Pinned SDK session does not expose session statistics.',
        );
      }
      const stats = session.getSessionStats();
      const tokens = stats.tokens?.total ?? 0;
      if (tokens !== 0) {
        throw new HarnessError(
          'HEALTH_MODEL_USAGE_DETECTED',
          'Restricted session health initialization consumed model tokens.',
        );
      }
      return {
        schemaVersion: 1,
        mode: 'health',
        restrictedSessionInitialized: true,
        activeTools: session.getActiveToolNames(),
        allTools: getAllToolNames(session),
        modelTokens: tokens,
        modelPromptSubmitted: false,
        runtimeDigest: job.expectedRuntimeDigest,
      };
    } finally {
      await session.dispose();
    }
  } finally {
    await auth.close();
  }
}

export async function executeRunJob(
  rawJob: unknown,
): Promise<OmpWorkerJobResult> {
  const parsed = OmpWorkerJobSchema.safeParse(rawJob);
  if (!parsed.success) {
    throw new HarnessError(
      'WORKER_JOB_INVALID',
      `Worker job configuration failed strict validation: ${parsed.error.issues
        .map((issue) => issue.path.join('.'))
        .join(', ')}`,
    );
  }
  const job = parsed.data;

  if (Date.now() >= job.deadline) {
    throw new HarnessError(
      'DEADLINE_EXCEEDED',
      'Worker deadline elapsed before SDK import.',
    );
  }
  // Start barrier: the executor registers durable ownership, then writes this release file.
  // No SDK import or model work may happen before that acknowledgment exists.
  const releaseDeadline = Math.min(
    job.deadline,
    Date.now() + OMP_WORKER_LIMITS.releaseTimeoutMs,
  );
  for (;;) {
    if (await fs.pathExists(job.releaseFilePath)) {
      const rawRelease: unknown = JSON.parse(
        await fs.readFile(job.releaseFilePath, 'utf8'),
      );
      const parsedRelease = OmpWorkerReleaseSchema.safeParse(rawRelease);
      if (
        !parsedRelease.success ||
        parsedRelease.data.attemptId !== job.context.attemptId ||
        parsedRelease.data.generation !== job.context.generation ||
        parsedRelease.data.role !== job.context.role ||
        parsedRelease.data.runtimeDigest !== job.context.runtimeDigest ||
        parsedRelease.data.launchNonce !== job.launchNonce ||
        parsedRelease.data.pid !== process.pid
      ) {
        throw new HarnessError(
          'WORKER_RELEASE_IDENTITY_MISMATCH',
          'Worker release does not match its persisted launch intent.',
        );
      }
      break;
    }
    if (Date.now() >= releaseDeadline) {
      throw new HarnessError(
        'WORKER_RELEASE_TIMEOUT',
        'Worker start release was not acknowledged by the executor.',
      );
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, OMP_WORKER_LIMITS.releasePollMs);
    });
  }

  const counter = { calls: 0 };
  let usageWriteTail: Promise<void> = Promise.resolve();
  const writeUsageCheckpoint = (
    complete: boolean,
    costUsd: number | null,
  ): Promise<void> => {
    const checkpoint = OmpWorkerUsageCheckpointSchema.parse({
      schemaVersion: 1,
      attemptId: job.context.attemptId,
      generation: job.context.generation,
      role: job.context.role,
      runtimeDigest: job.context.runtimeDigest,
      workerPid: process.pid,
      usageNonce: job.usageNonce,
      observedAt: Date.now(),
      toolCalls: counter.calls,
      costUsd,
      complete,
    });
    usageWriteTail = usageWriteTail.then(() =>
      writeAtomicUsageCheckpoint(job.usageFilePath, checkpoint),
    );
    return usageWriteTail;
  };
  await writeUsageCheckpoint(false, null);
  const sdk = await loadOmpSdk(job.runtime.sdkModule);
  const { auth, registry, settings } = await createSettingsAndRegistry(
    sdk,
    job,
  );
  installExperimentalCredentialGuard(registry);

  try {
    const model = registry.find(job.account.provider, job.account.model);
    if (!model) {
      throw new HarnessError(
        'MODEL_NOT_FOUND',
        `Configured model ${job.account.provider}/${job.account.model} is not present in the pinned catalog; fallback is forbidden.`,
      );
    }
    const declaredProvider = model.provider;
    if (
      typeof declaredProvider === 'string' &&
      declaredProvider !== job.account.provider
    ) {
      throw new HarnessError(
        'MODEL_PROVIDER_MISMATCH',
        'Resolved model provider does not match the selected account provider.',
      );
    }
    validateModelEndpoint(model, job.account.allowedProviderEndpoints);

    const tool = buildSandboxTool({
      runtime: job.runtime,
      workspace: job.workspace,
      context: job.context,
      deadline: Math.min(job.deadline, job.context.deadline),
      maxToolCalls: job.maxToolCalls,
      counter,
      admitToolCall: async () => {
        if (counter.calls >= job.maxToolCalls) {
          return false;
        }
        counter.calls += 1;
        await writeUsageCheckpoint(false, null);
        return true;
      },
    });

    const systemPrompt = job.bundle.guidance
      ? `Approved harness guidance:\n${job.bundle.guidance}\n\nYou must execute code only via sandbox_exec.`
      : 'You must execute code only via sandbox_exec.';

    const session = await createRestrictedSession({
      sdk,
      settings,
      auth,
      registry,
      model,
      job,
      tool,
      systemPrompt,
    });

    let promptCompleted = false;
    let completionCostUsd: number | null = null;
    try {
      assertSoleSandboxTool(session);

      const gateAgent = session.agent;
      const addBeforeModelCall = gateAgent?.addBeforeModelCall;
      if (typeof addBeforeModelCall !== 'function') {
        throw new HarnessError(
          'BUDGET_GATE_UNSUPPORTED',
          'Pinned SDK session does not support the required before-model budget/deadline gate.',
        );
      }

      const textState = { text: '', bytes: 0, overflow: false };
      const transcriptState = { text: '', bytes: 0, overflow: false };
      const appendTo = (
        state: { text: string; bytes: number; overflow: boolean },
        value: string,
        maxBytes: number,
      ): void => {
        if (state.overflow) {
          return;
        }
        state.bytes += Buffer.byteLength(value, 'utf8');
        if (state.bytes > maxBytes) {
          state.overflow = true;
          return;
        }
        state.text += value;
      };

      if (typeof session.subscribe !== 'function') {
        throw new HarnessError(
          'SDK_SESSION_SHAPE_UNSUPPORTED',
          'Pinned SDK session does not expose the event subscription surface.',
        );
      }
      session.subscribe((event) => {
        const delta = getAssistantTextDelta(event);
        if (delta !== null) {
          appendTo(textState, delta, OMP_WORKER_LIMITS.maxTextBytes);
          appendTo(
            transcriptState,
            delta,
            OMP_WORKER_LIMITS.maxTranscriptBytes,
          );
          return;
        }
        if (event.type !== 'message_update') {
          appendTo(
            transcriptState,
            `\n[event: ${event.type}]\n`,
            OMP_WORKER_LIMITS.maxTranscriptBytes,
          );
        }
      });

      addBeforeModelCall.call(gateAgent, () => {
        if (textState.overflow || transcriptState.overflow) {
          return { stop: true, reason: 'OUTPUT_LIMIT_EXCEEDED' };
        }
        if (counter.calls >= job.maxToolCalls) {
          return { stop: true, reason: 'TOOL_LIMIT_EXCEEDED' };
        }
        if (Date.now() >= Math.min(job.deadline, job.context.deadline)) {
          return { stop: true, reason: 'DEADLINE_EXCEEDED' };
        }
        return undefined;
      });

      await session.prompt(job.task.prompt, {
        runCommands: false,
        expandPromptTemplates: false,
        throwOnDrop: true,
      });

      if (textState.overflow || transcriptState.overflow) {
        throw new HarnessError(
          'WORKER_OUTPUT_LIMIT_EXCEEDED',
          'Model output exceeded the bounded worker text/transcript limits.',
        );
      }

      if (typeof session.getSessionStats === 'function') {
        const stats = session.getSessionStats();
        if (
          typeof stats.cost === 'number' &&
          Number.isFinite(stats.cost) &&
          stats.cost >= 0
        ) {
          completionCostUsd = stats.cost;
        }
      }
      promptCompleted = true;
      return OmpWorkerResultSchema.parse({
        schemaVersion: 1,
        mode: 'run',
        attemptId: job.context.attemptId,
        generation: job.context.generation,
        role: job.context.role,
        runtimeDigest: job.expectedRuntimeDigest,
        text: textState.text,
        toolCalls: counter.calls,
        costUsd: completionCostUsd,
        transcript: transcriptState.text,
      });
    } finally {
      await session.dispose();
      if (promptCompleted) {
        await writeUsageCheckpoint(true, completionCostUsd);
      }
    }
  } finally {
    await auth.close();
  }
}

/**
 * CLI entrypoint used by the trusted executor. Guarded by an explicit mode flag so
 * importing this module (tests, health helpers) never starts a session.
 */
function isDirectInvocation(): boolean {
  if (process.env.AGS_FLEET_WORKER !== '1') {
    return false;
  }
  return process.argv[2] === '--job' || process.argv[2] === '--health';
}

async function runCli(): Promise<void> {
  const flag = process.argv[2];
  const configPath = process.argv[3];
  if (!configPath) {
    process.stderr.write('usage: worker --job|--health <config.json>\n');
    process.exit(64);
  }
  const stat = await fs.lstat(configPath);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size > OMP_WORKER_LIMITS.maxJobBytes
  ) {
    throw new HarnessError(
      'WORKER_JOB_INVALID',
      'Worker job file is missing or unbounded.',
    );
  }
  const rawJob: unknown = JSON.parse(await fs.readFile(configPath, 'utf8'));
  const result =
    flag === '--health'
      ? await executeHealthJob(rawJob)
      : await executeRunJob(rawJob);
  process.stdout.write(JSON.stringify(result));
  process.exit(0);
}

if (isDirectInvocation()) {
  runCli().catch((error: unknown) => {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    process.stderr.write(`[OmpWorkerScript] ${message}\n`);
    process.exit(2);
  });
}
