/**
 * Behavioral tests for the standalone OMP adapter.
 *
 * These exercise the adapter's own decisions: main/child gating, scope-honest
 * manual preparation, bounded config reads, and the exact manifest/request it
 * hands to the public core package. Core storage and parsing are owned and
 * tested by `agent-skills-standard-mcp`; the fake core records calls instead of
 * reimplementing it.
 */

import {
  appendFile,
  mkdir,
  mkdtemp,
  symlink,
  writeFile,
} from "node:fs/promises";
import { promises as fsPromises } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@oh-my-pi/pi-coding-agent";
import type {
  ArtifactReceipt,
  EvidenceSource,
  LocalManifest,
  PrepareRequest,
} from "agent-skills-standard-mcp/retrospective";
import {
  COMMAND_NAME,
  MANUAL_INSTRUCTION,
  SCOPE_UNSUPPORTED_CODE,
  SCOPE_UNSUPPORTED_MESSAGE,
  STATUS_KEY,
  STORAGE_RISK_CONFIRM_TITLE,
  STORAGE_RISK_NOT_ACKNOWLEDGED,
  STORE_ROOT_INSIDE_PROJECT,
  STORE_ROOT_UNRESOLVED,
  createRetrospectiveAdapter,
  type AdapterRuntime,
  type CoreApi,
} from "../index";
import {
  CONFIG_ENV,
  CONFIG_MAX_BYTES,
  loadAdapterConfig,
  readConfigText,
} from "../source";

const CONFIG_PATH = "/private/config/session-retrospective.json";
const STORE_ROOT = "/store/retro";
const MANIFEST_PATH = "/manifests/explicit.json";

function configText(value: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: 1,
    invitationOwner: "omp",
    enabled: true,
    root: STORE_ROOT,
    ...value,
  });
}

type UiRecord = {
  notices: Array<{ text: string; level: string }>;
  statuses: Array<{ key: string; text: string }>;
  confirms: Array<{ title: string; message: string }>;
};

type FakeCtx = {
  ctx: ExtensionCommandContext;
  record: UiRecord;
  setConfirm(answer: boolean): void;
};

function makeCtx(
  options: { kind?: "main" | "sub"; hasUI?: boolean; cwd?: string } = {},
): FakeCtx {
  const record: UiRecord = { notices: [], statuses: [], confirms: [] };
  const answer = { value: true };
  const agent = {
    kind: options.kind ?? "main",
    id: "agent-1",
    name: "main",
    depth: 0,
  };
  const ctx = {
    agent,
    hasUI: options.hasUI ?? true,
    cwd: options.cwd ?? "/work",
    ui: {
      notify: (text: string, level: string) => {
        record.notices.push({ text, level });
      },
      setStatus: (key: string, text: string) => {
        record.statuses.push({ key, text });
      },
      confirm: async (title: string, message: string) => {
        record.confirms.push({ title, message });
        return answer.value;
      },
    },
  };
  return {
    ctx: ctx as unknown as ExtensionCommandContext,
    record,
    setConfirm: (value) => {
      answer.value = value;
    },
  };
}

function manifestFixture(
  overrides: Partial<LocalManifest> = {},
): LocalManifest {
  return {
    schemaVersion: 1,
    provenance: "user-supplied",
    main: { hostId: "host-a", sessionId: "sess-explicit" },
    checkpointId: "cp-explicit",
    cutoff: "2026-10-20T00:00:00.000Z",
    nodes: [
      {
        key: { hostId: "host-a", sessionId: "sess-explicit" },
        parent: null,
        disposition: "local-allowed",
        source: { format: "omp", absolutePath: "/sessions/explicit.jsonl" },
      },
    ],
    ...overrides,
  };
}

type CoreCalls = {
  loads: string[];
  sources: LocalManifest[];
  prepares: Array<{ request: PrepareRequest; signal: AbortSignal }>;
};

type FakeCore = {
  core: CoreApi;
  calls: CoreCalls;
  manifest: { value: LocalManifest };
  receipt: { value: ArtifactReceipt };
  prepareError: { value: unknown };
};

function makeCore(): FakeCore {
  const calls: CoreCalls = { loads: [], sources: [], prepares: [] };
  const manifest: { value: LocalManifest } = { value: manifestFixture() };
  const receipt: { value: ArtifactReceipt } = {
    value: {
      schemaVersion: 1,
      artifactId: "artifact-1",
      runId: "run-1",
      status: "complete",
      modelCalls: 0,
      outboundRequests: 0,
    },
  };
  const prepareError: { value: unknown } = { value: null };
  const core: CoreApi = {
    loadLocalManifest: async (manifestPath) => {
      calls.loads.push(manifestPath);
      return manifest.value;
    },
    createManifestEvidenceSource: (value) => {
      calls.sources.push(value);
      return {} as EvidenceSource;
    },
    prepareLocal: async (request, _source, signal) => {
      calls.prepares.push({ request, signal });
      if (prepareError.value !== null) throw prepareError.value;
      return receipt.value;
    },
  };
  return { core, calls, manifest, receipt, prepareError };
}

function makeRuntime(
  core: CoreApi,
  options: { config?: () => Promise<string> } = {},
): AdapterRuntime {
  const readConfig = options.config ?? (async () => configText());
  return {
    core,
    env: { [CONFIG_ENV]: CONFIG_PATH },
    readTextFile: readConfig,
    newAbortController: () => new AbortController(),
  };
}

type FakePi = {
  pi: ExtensionAPI;
  handlers: Map<string, unknown>;
  command: {
    description: string;
    handler: (args: string, ctx: ExtensionCommandContext) => Promise<void>;
  };
  tools: string[];
  modelMessages: string[];
};

function makePi(): FakePi {
  const handlers = new Map<string, unknown>();
  const tools: string[] = [];
  const modelMessages: string[] = [];
  let command: FakePi["command"] | undefined;
  const pi = {
    setLabel: () => undefined,
    on: (event: string, handler: unknown) => {
      handlers.set(event, handler);
    },
    registerCommand: (name: string, definition: FakePi["command"]) => {
      expect(name).toBe(COMMAND_NAME);
      command = definition;
    },
    registerTool: (definition: { name: string }) => {
      tools.push(definition.name);
    },
    sendMessage: (content: unknown) => {
      modelMessages.push(JSON.stringify(content));
    },
    sendUserMessage: (content: unknown) => {
      modelMessages.push(JSON.stringify(content));
    },
    appendEntry: () => {
      modelMessages.push("appendEntry");
    },
  };
  return {
    pi: pi as unknown as ExtensionAPI,
    handlers,
    get command() {
      if (command === undefined) throw new Error("command was not registered");
      return command;
    },
    tools,
    modelMessages,
  };
}

function register(
  fake: FakePi,
  runtime: AdapterRuntime,
): ReturnType<typeof createRetrospectiveAdapter> {
  const adapter = createRetrospectiveAdapter(runtime);
  adapter.extension(fake.pi);
  return adapter;
}

describe("registration wiring", () => {
  it("registers only the human command: no agent tool and no lifecycle hook", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const { ctx } = makeCtx();

    expect(fake.command.description).toContain("human-authored local manifest");
    expect(fake.tools).toEqual([]);
    expect([...fake.handlers.keys()]).toEqual([]);

    await fake.command.handler("", ctx);
    expect(fake.modelMessages).toEqual([]);
  });
});

describe("scope-honest command", () => {
  it("refuses automatic preparation with a static capability code", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const { ctx, record } = makeCtx();

    await adapter.handleCommand("", ctx);

    expect(record.notices).toEqual([
      { text: SCOPE_UNSUPPORTED_MESSAGE, level: "info" },
    ]);
    expect(record.notices[0]?.text).toContain(SCOPE_UNSUPPORTED_CODE);
    expect(fakeCore.calls.loads).toEqual([]);
    expect(fakeCore.calls.prepares).toEqual([]);
    expect(fake.modelMessages).toEqual([]);
  });

  it("returns the manual instruction without UI and prepares nothing", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const { ctx, record } = makeCtx({ hasUI: false });

    await adapter.handleCommand(`manifest ${MANIFEST_PATH}`, ctx);

    expect(record.notices).toEqual([
      { text: MANUAL_INSTRUCTION, level: "info" },
    ]);
    expect(record.notices[0]?.text).toContain(SCOPE_UNSUPPORTED_CODE);
    expect(record.notices[0]?.text).toContain("--ack-storage-risk");
    expect(record.confirms).toEqual([]);
    expect(fakeCore.calls.loads).toEqual([]);
    expect(fake.modelMessages).toEqual([]);
  });

  it("rejects a relative manifest path without touching the core", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const { ctx, record } = makeCtx();

    await adapter.handleCommand("manifest manifests/relative.json", ctx);

    expect(record.notices[0]?.text).toContain("absolute");
    expect(fakeCore.calls.loads).toEqual([]);
    expect(fakeCore.calls.prepares).toEqual([]);
  });

  it("prints usage for an unknown action", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const { ctx, record } = makeCtx();

    await adapter.handleCommand("prepare", ctx);

    expect(record.notices).toHaveLength(1);
    expect(record.notices[0]?.text).toContain("/retrospective manifest");
    expect(fakeCore.calls.prepares).toEqual([]);
  });

  it("parses a tab-heavy manifest argument without changing its meaning", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const { ctx, record } = makeCtx();

    await adapter.handleCommand(
      `manifest${"\t".repeat(4_096)}${MANIFEST_PATH}`,
      ctx,
    );

    expect(fakeCore.calls.loads).toEqual([MANIFEST_PATH]);
    expect(record.notices[0]?.text).toContain("1 session(s)");
  });

  it("rejects a whitespace-separated but empty manifest argument", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const { ctx, record } = makeCtx();

    await adapter.handleCommand(`manifest${"\t".repeat(4_096)}`, ctx);

    expect(record.notices).toHaveLength(1);
    expect(record.notices[0]?.text).toContain("/retrospective manifest");
    expect(fakeCore.calls.loads).toEqual([]);
    expect(fakeCore.calls.prepares).toEqual([]);
  });

  it("rejects a manifest path containing a line terminator", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const { ctx, record } = makeCtx();

    await adapter.handleCommand(`manifest /manifests/a\nb.json`, ctx);

    expect(record.notices).toHaveLength(1);
    expect(record.notices[0]?.text).toContain("/retrospective manifest");
    expect(fakeCore.calls.loads).toEqual([]);
    expect(fakeCore.calls.prepares).toEqual([]);
  });

  it("refuses to prepare from a subagent session", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const { ctx, record } = makeCtx({ kind: "sub" });

    await adapter.handleCommand(`manifest ${MANIFEST_PATH}`, ctx);

    expect(record.notices).toEqual([
      {
        text: "Session retrospectives are available in the main session only.",
        level: "info",
      },
    ]);
    expect(fakeCore.calls.prepares).toEqual([]);
  });
});

describe("manifest-scoped preparation", () => {
  it("prepares exactly the declared manifest and discloses declared scope", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const { ctx, record } = makeCtx();

    const outcome = await adapter.handleCommand(
      `manifest ${MANIFEST_PATH}`,
      ctx,
    );

    expect(outcome).toBeUndefined();
    expect(fakeCore.calls.loads).toEqual([MANIFEST_PATH]);
    expect(fakeCore.calls.prepares).toHaveLength(1);
    const prepared = fakeCore.calls.prepares[0];
    expect(prepared?.request).toEqual({
      main: { hostId: "host-a", sessionId: "sess-explicit" },
      checkpointId: "cp-explicit",
      cutoff: "2026-10-20T00:00:00.000Z",
      root: STORE_ROOT,
      consent: "local-only",
      storageRiskAcknowledged: true,
    });
    expect(fakeCore.calls.sources[0]).toEqual(manifestFixture());

    expect(record.confirms).toHaveLength(1);
    expect(record.confirms[0]?.title).toBe(STORAGE_RISK_CONFIRM_TITLE);
    expect(record.confirms[0]?.message).toContain("sync, backup, or snapshot");
    expect(record.confirms[0]?.message).toContain("does not override");

    const scope = record.notices[0]?.text ?? "";
    expect(scope).toContain("1 session(s)");
    expect(scope).toContain("1 local-allowed, 0 explicit gaps");
    expect(scope).toContain("not declared there are not included");

    const receipt = record.notices.map((notice) => notice.text).join("\n");
    expect(receipt).toContain("artifact-1");
    expect(record.statuses).toEqual([
      { key: STATUS_KEY, text: "Retrospective complete" },
    ]);
    expect(fake.modelMessages).toEqual([]);
  });

  it("prepares nothing when the storage-risk acknowledgement is declined", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const declined = makeCtx();
    declined.setConfirm(false);

    const outcome = await adapter.prepareManifest(MANIFEST_PATH, declined.ctx);

    expect(outcome).toEqual({
      kind: "failed",
      code: STORAGE_RISK_NOT_ACKNOWLEDGED,
    });
    expect(declined.record.confirms).toHaveLength(1);
    expect(declined.record.confirms[0]?.title).toBe(STORAGE_RISK_CONFIRM_TITLE);
    expect(fakeCore.calls.prepares).toEqual([]);
    expect(declined.record.statuses).toEqual([]);
    const notices = declined.record.notices
      .map((notice) => notice.text)
      .join("\n");
    expect(notices).toContain(STORAGE_RISK_NOT_ACKNOWLEDGED);
    expect(fake.modelMessages).toEqual([]);
  });

  it("refuses a symlinked alias of the session working directory", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "ags-retro-omp-root-"));
    const real = path.join(base, "real");
    await mkdir(real, { recursive: true });
    const alias = path.join(base, "alias");
    await symlink(real, alias);

    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(
      fake,
      makeRuntime(fakeCore.core, {
        config: async () => configText({ root: path.join(alias, "store") }),
      }),
    );
    const { ctx, record } = makeCtx({ cwd: real });

    const outcome = await adapter.prepareManifest(MANIFEST_PATH, ctx);

    expect(outcome).toEqual({
      kind: "failed",
      code: STORE_ROOT_INSIDE_PROJECT,
    });
    const notices = record.notices.map((notice) => notice.text).join("\n");
    expect(notices).toContain(STORE_ROOT_INSIDE_PROJECT);
    expect(record.confirms).toEqual([]);
    expect(fakeCore.calls.loads).toEqual([]);
    expect(fakeCore.calls.prepares).toEqual([]);
  });

  it("refuses a root elsewhere in the same repository from a subdirectory", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "ags-retro-omp-root-"));
    const repo = path.join(base, "repo");
    const sessionDir = path.join(repo, "packages", "app");
    await mkdir(sessionDir, { recursive: true });
    await mkdir(path.join(repo, ".git"));

    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(
      fake,
      makeRuntime(fakeCore.core, {
        config: async () => configText({ root: path.join(repo, "store") }),
      }),
    );
    const { ctx, record } = makeCtx({ cwd: sessionDir });

    const outcome = await adapter.prepareManifest(MANIFEST_PATH, ctx);

    expect(outcome).toEqual({
      kind: "failed",
      code: STORE_ROOT_INSIDE_PROJECT,
    });
    const notices = record.notices.map((notice) => notice.text).join("\n");
    expect(notices).toContain("inside the session repository");
    expect(record.confirms).toEqual([]);
    expect(fakeCore.calls.prepares).toEqual([]);
  });

  it("accepts a root outside the repository", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "ags-retro-omp-root-"));
    const repo = path.join(base, "repo");
    const sessionDir = path.join(repo, "app");
    await mkdir(sessionDir, { recursive: true });
    await mkdir(path.join(repo, ".git"));
    const storeRoot = path.join(base, "outside-store");
    await mkdir(storeRoot);

    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(
      fake,
      makeRuntime(fakeCore.core, {
        config: async () => configText({ root: storeRoot }),
      }),
    );
    const { ctx } = makeCtx({ cwd: sessionDir });

    const outcome = await adapter.prepareManifest(MANIFEST_PATH, ctx);

    expect(outcome.kind).toBe("prepared");
    expect(fakeCore.calls.prepares).toHaveLength(1);
    expect(fakeCore.calls.prepares[0]?.request).toMatchObject({
      root: storeRoot,
      storageRiskAcknowledged: true,
    });
  });

  it("accepts a not-yet-existing root under an outside parent", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "ags-retro-omp-root-"));
    const repo = path.join(base, "repo");
    const sessionDir = path.join(repo, "app");
    await mkdir(sessionDir, { recursive: true });
    await mkdir(path.join(repo, ".git"));
    await mkdir(path.join(base, "private"));
    const storeRoot = path.join(base, "private", "not-created-yet");

    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(
      fake,
      makeRuntime(fakeCore.core, {
        config: async () => configText({ root: storeRoot }),
      }),
    );
    const { ctx } = makeCtx({ cwd: sessionDir });

    const outcome = await adapter.prepareManifest(MANIFEST_PATH, ctx);

    expect(outcome.kind).toBe("prepared");
    expect(fakeCore.calls.prepares).toHaveLength(1);
  });

  it("refuses with STORE_ROOT_UNRESOLVED when the repository marker cannot be inspected", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "ags-retro-omp-root-"));
    const repo = path.join(base, "repo");
    const sessionDir = path.join(repo, "app");
    await mkdir(sessionDir, { recursive: true });
    const storeRoot = path.join(base, "store");
    await mkdir(storeRoot);

    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(
      fake,
      makeRuntime(fakeCore.core, {
        config: async () => configText({ root: storeRoot }),
      }),
    );
    const { ctx, record } = makeCtx({ cwd: sessionDir });

    const realLstat = fsPromises.lstat.bind(fsPromises);
    const lstatSpy = vi
      .spyOn(fsPromises, "lstat")
      .mockImplementation(async (...args) => {
        if (String(args[0]).endsWith(`${path.sep}.git`)) {
          throw Object.assign(new Error("marker io failure"), { code: "EIO" });
        }
        return await realLstat(...args);
      });

    try {
      const outcome = await adapter.prepareManifest(MANIFEST_PATH, ctx);
      expect(outcome).toEqual({
        kind: "failed",
        code: STORE_ROOT_UNRESOLVED,
      });
    } finally {
      lstatSpy.mockRestore();
    }

    const notices = record.notices.map((notice) => notice.text).join("\n");
    expect(notices).toContain(STORE_ROOT_UNRESOLVED);
    expect(record.confirms).toEqual([]);
    expect(fakeCore.calls.loads).toEqual([]);
    expect(fakeCore.calls.prepares).toEqual([]);
  });

  it("reports declared gaps from the manifest without inventing nodes", async () => {
    const fakeCore = makeCore();
    const withGap = manifestFixture();
    withGap.nodes = [
      ...withGap.nodes,
      {
        key: { hostId: "host-a", sessionId: "sess-restricted" },
        parent: { hostId: "host-a", sessionId: "sess-explicit" },
        disposition: "remote-not-authorized",
        source: null,
      },
    ];
    fakeCore.manifest.value = withGap;
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const { ctx, record } = makeCtx();

    await adapter.handleCommand(`manifest ${MANIFEST_PATH}`, ctx);

    const scope = record.notices[0]?.text ?? "";
    expect(scope).toContain("2 session(s)");
    expect(scope).toContain("1 local-allowed, 1 explicit gaps");
    expect(fakeCore.calls.sources[0]).toEqual(withGap);
  });

  it("reports a bounded failure code instead of raw error text", async () => {
    const fakeCore = makeCore();
    fakeCore.prepareError.value = Object.assign(
      new Error(`secret at ${STORE_ROOT}`),
      { code: "STORE_FULL" },
    );
    const fake = makePi();
    const adapter = register(fake, makeRuntime(fakeCore.core));
    const { ctx, record } = makeCtx();

    await adapter.handleCommand(`manifest ${MANIFEST_PATH}`, ctx);

    const notices = record.notices.map((notice) => notice.text).join("\n");
    expect(notices).toContain("STORE_FULL");
    expect(notices).not.toContain("secret");
    expect(notices).not.toContain(STORE_ROOT);
    expect(fake.modelMessages).toEqual([]);
  });

  it("explains invalid config with a bounded problem and keeps the adapter inert", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const adapter = register(
      fake,
      makeRuntime(fakeCore.core, {
        config: async () => JSON.stringify({ schemaVersion: 2 }),
      }),
    );
    const { ctx, record } = makeCtx();

    await adapter.handleCommand(`manifest ${MANIFEST_PATH}`, ctx);

    const notices = record.notices.map((notice) => notice.text).join("\n");
    expect(notices).toContain("config-version");
    expect(fakeCore.calls.loads).toEqual([]);
    expect(fakeCore.calls.prepares).toEqual([]);
  });

  it("explains an unconfigured adapter", async () => {
    const fakeCore = makeCore();
    const fake = makePi();
    const missing = Object.assign(new Error("missing"), { code: "ENOENT" });
    const adapter = register(
      fake,
      makeRuntime(fakeCore.core, {
        config: async () => {
          throw missing;
        },
      }),
    );
    const { ctx, record } = makeCtx();

    await adapter.handleCommand(`manifest ${MANIFEST_PATH}`, ctx);

    expect(record.notices[0]?.text).toContain("is not configured");
    expect(fakeCore.calls.prepares).toEqual([]);
  });
});

describe("bounded config reading", () => {
  async function fixtureDir(): Promise<string> {
    return await mkdtemp(path.join(tmpdir(), "ags-retro-omp-config-"));
  }

  it("ignores a project-local config file entirely", async () => {
    const dir = await fixtureDir();
    await mkdir(path.join(dir, ".omp"));
    await writeFile(
      path.join(dir, ".omp", "session-retrospective.json"),
      configText({ root: path.join(dir, "store") }),
      "utf8",
    );
    const read = vi.fn(async () => configText());

    const loaded = await loadAdapterConfig({ env: {}, readTextFile: read });

    expect(loaded.status).toBe("absent");
    expect(loaded.config.root).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });

  it("refuses a relative config env path instead of resolving it", async () => {
    const read = vi.fn(async () => configText());

    const loaded = await loadAdapterConfig({
      env: { [CONFIG_ENV]: ".omp/session-retrospective.json" },
      readTextFile: read,
    });

    expect(loaded.status).toBe("invalid");
    expect(loaded.problem).toBe("config-env-relative");
    expect(read).not.toHaveBeenCalled();
  });

  it("accepts a small valid regular file", async () => {
    const dir = await fixtureDir();
    const file = path.join(dir, "config.json");
    await writeFile(file, configText(), "utf8");

    const loaded = await loadAdapterConfig({
      env: { [CONFIG_ENV]: file },
      readTextFile: readConfigText,
    });

    expect(loaded.status).toBe("loaded");
    expect(loaded.problem).toBeNull();
    expect(loaded.config.root).toBe(STORE_ROOT);
  });

  it("rejects an oversized file even when its prefix is valid JSON", async () => {
    const dir = await fixtureDir();
    const file = path.join(dir, "config.json");
    await writeFile(
      file,
      `${configText()}${" ".repeat(CONFIG_MAX_BYTES)}`,
      "utf8",
    );

    const loaded = await loadAdapterConfig({
      env: { [CONFIG_ENV]: file },
      readTextFile: readConfigText,
    });

    expect(loaded.status).toBe("invalid");
    expect(loaded.problem).toBe("config-too-large");
  });
  it("rejects a valid config grown past the cap after descriptor stat", async () => {
    const dir = await fixtureDir();
    const file = path.join(dir, "config.json");
    await writeFile(file, configText(), "utf8");
    const openFile = fsPromises.open.bind(fsPromises);

    const openSpy = vi
      .spyOn(fsPromises, "open")
      .mockImplementation(async (...args) => {
        const handle = await openFile(...args);
        const originalRead = handle.read.bind(handle);
        let appended = false;
        vi.spyOn(handle, "read").mockImplementation(async (...readArgs) => {
          if (!appended) {
            appended = true;
            await appendFile(file, " ".repeat(CONFIG_MAX_BYTES), "utf8");
          }
          return originalRead(...readArgs);
        });
        return handle;
      });

    try {
      await expect(readConfigText(file)).rejects.toMatchObject({
        code: "config-too-large",
      });
    } finally {
      openSpy.mockRestore();
    }
  });

  it("refuses a directory instead of reading it", async () => {
    const dir = await fixtureDir();
    const child = path.join(dir, "nested");
    await mkdir(child);

    const loaded = await loadAdapterConfig({
      env: { [CONFIG_ENV]: child },
      readTextFile: readConfigText,
    });

    expect(loaded.problem).toBe("config-not-regular");
  });

  it("refuses a symlinked config file", async () => {
    const dir = await fixtureDir();
    const target = path.join(dir, "target.json");
    const link = path.join(dir, "config.json");
    await writeFile(target, configText(), "utf8");
    await symlink(target, link);

    const loaded = await loadAdapterConfig({
      env: { [CONFIG_ENV]: link },
      readTextFile: readConfigText,
    });

    expect(loaded.problem).toBe("config-not-regular");
  });

  it("refuses invalid UTF-8", async () => {
    const dir = await fixtureDir();
    const file = path.join(dir, "config.json");
    await writeFile(file, Buffer.from([0xff, 0xfe, 0x00]));

    const loaded = await loadAdapterConfig({
      env: { [CONFIG_ENV]: file },
      readTextFile: readConfigText,
    });

    expect(loaded.problem).toBe("config-not-utf8");
  });

  it("treats a missing file as absent defaults", async () => {
    const dir = await fixtureDir();
    const loaded = await loadAdapterConfig({
      env: { [CONFIG_ENV]: path.join(dir, "missing.json") },
      readTextFile: readConfigText,
    });

    expect(loaded.status).toBe("absent");
    expect(loaded.config.root).toBeNull();
  });

  it("rejects unknown keys and relative roots", async () => {
    const dir = await fixtureDir();

    const unknown = await loadAdapterConfig({
      env: { [CONFIG_ENV]: path.join(dir, "unknown.json") },
      readTextFile: async () => configText({ extra: true }),
    });
    expect(unknown.problem).toBe("config-unknown-key");

    const relative = await loadAdapterConfig({
      env: { [CONFIG_ENV]: path.join(dir, "relative.json") },
      readTextFile: async () => configText({ root: "relative/root" }),
    });
    expect(relative.problem).toBe("config-root");
  });
});
