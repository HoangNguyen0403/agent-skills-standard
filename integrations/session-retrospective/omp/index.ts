/**
 * Standalone OMP adapter for owner-local session retrospectives.
 *
 * Delivered surface: the explicit `/retrospective` user command. It prepares a
 * retrospective only from a human-authored local manifest, never from inferred
 * host scope.
 *
 * Automatic eligibility is deliberately not implemented. OMP 18.13.1 exposes
 * no verified diagnostic-role or descendant-inventory signal through the
 * extension context, so the adapter refuses to classify a session as eligible
 * work, to narrow a tree silently, or to persist `ready`/non-diagnostic facts it
 * cannot prove. Those capabilities are reported as unsupported; manual
 * manifest-scoped preparation is the supported route.
 *
 * No provider/model call, no remote request, no report text in a model-visible
 * channel, no agent-facing tool. Core preparation and storage live in the
 * separate public package `agent-skills-standard-mcp/retrospective`; this file
 * duplicates none of its privacy or storage rules.
 */

import path from "node:path";
import * as coreModule from "agent-skills-standard-mcp/retrospective";
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
  CONFIG_ENV,
  assessStoreRootContainment,
  loadAdapterConfig,
  readConfigText,
  type LoadedConfig,
} from "./source";

export const COMMAND_NAME = "retrospective";
export const STATUS_KEY = "session-retrospective";

export const USAGE = "Usage: /retrospective manifest <absolute-manifest.json>";

/** Static capability gap shown when the user asks for automatic preparation. */
export const SCOPE_UNSUPPORTED_CODE = "OMP-AUTO-SCOPE-UNSUPPORTED";

export const SCOPE_UNSUPPORTED_MESSAGE =
  `${SCOPE_UNSUPPORTED_CODE}: automatic preparation is unavailable in this host. ` +
  "OMP 18.13.1 exposes no verified descendant inventory or diagnostic eligibility " +
  "through the extension context, so this adapter will not narrow the tree or classify " +
  "a session as eligible work on its own. Author a local manifest that lists every " +
  "session you authorize, then run /retrospective manifest <absolute-manifest.json>.";

export const MANUAL_INSTRUCTION =
  `${SCOPE_UNSUPPORTED_CODE}: a local retrospective needs an explicit terminal UI action. ` +
  "Author a local manifest, then run " +
  "`ags-retrospective prepare --manifest <absolute-manifest.json> --consent local-only --root <absolute-root> --ack-storage-risk` " +
  "or /retrospective manifest <absolute-manifest.json> from an interactive session.";

/** Per-run storage-risk acknowledgement outcome code. Never persisted. */
export const STORAGE_RISK_NOT_ACKNOWLEDGED = "STORAGE_RISK_NOT_ACKNOWLEDGED";

/** Refusal code: the configured store root lies inside the session project. */
export const STORE_ROOT_INSIDE_PROJECT = "STORE_ROOT_INSIDE_PROJECT";

/** Refusal code: containment could not be verified with real paths. */
export const STORE_ROOT_UNRESOLVED = "STORE_ROOT_UNRESOLVED";

export const STORAGE_RISK_CONFIRM_TITLE = "Acknowledge local storage risk";

export function storageRiskMessage(root: string): string {
  return (
    `The retrospective store under ${root} may be covered by sync, backup, or snapshot tools ` +
    "this adapter cannot detect. Acknowledging applies to this run only, records nothing about " +
    "that coverage, and does not override any owner-only permission check on the store or its files. " +
    "Prepare the retrospective now?"
  );
}

const MAIN_ONLY_MESSAGE =
  "Session retrospectives are available in the main session only.";

export type PrepareOutcome =
  | { kind: "prepared"; receipt: ArtifactReceipt }
  | { kind: "unavailable"; reason: string }
  | { kind: "failed"; code: string };

/** The public core functions this adapter binds to. */
export type CoreApi = {
  loadLocalManifest(manifestPath: string): Promise<LocalManifest>;
  createManifestEvidenceSource(manifest: LocalManifest): EvidenceSource;
  prepareLocal(
    request: PrepareRequest,
    source: EvidenceSource,
    signal: AbortSignal,
  ): Promise<ArtifactReceipt>;
};

/** Injectable boundaries: host package, local files, identifiers. */
export type AdapterRuntime = {
  core?: CoreApi;
  env?: NodeJS.ProcessEnv;
  readTextFile?: (absolutePath: string) => Promise<string>;
  newAbortController?: () => AbortController;
};

export type RetrospectiveAdapter = {
  extension(pi: ExtensionAPI): void;
  handleCommand(args: string, ctx: ExtensionCommandContext): Promise<void>;
  prepareManifest(
    manifestPath: string,
    ctx: ExtensionCommandContext,
  ): Promise<PrepareOutcome>;
};

type CommandIntent =
  | { kind: "explain" }
  | { kind: "manifest"; manifestPath: string }
  | { kind: "invalid" };

function parseCommandArgs(rawArgs: string): CommandIntent {
  const args = rawArgs.trim();
  if (args.length === 0) return { kind: "explain" };
  const keyword = "manifest";
  if (!args.startsWith(keyword)) return { kind: "invalid" };
  // Contract preserved from the former /^manifest\s+(.+)$/ match: the keyword,
  // then at least one whitespace character, then a non-empty path that contains
  // no line terminators. Single-pass string operations keep this linear: a
  // whitespace-heavy command cannot trigger regex backtracking.
  let index = keyword.length;
  let sawSeparator = false;
  while (index < args.length) {
    const char = args.charAt(index);
    if (char.trim() !== "") break;
    sawSeparator = true;
    index += 1;
  }
  if (!sawSeparator) return { kind: "invalid" };
  const manifestPath = args.slice(index).trim();
  if (manifestPath.length === 0) return { kind: "invalid" };
  if (
    manifestPath.includes("\n") ||
    manifestPath.includes("\r") ||
    manifestPath.includes("\u2028") ||
    manifestPath.includes("\u2029")
  ) {
    return { kind: "invalid" };
  }
  return { kind: "manifest", manifestPath };
}

/** Extract only a bounded diagnostic code; never surface raw messages/paths. */
function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;
    if (typeof code === "string" && /^[A-Z][A-Z0-9_-]{0,63}$/.test(code)) {
      return code;
    }
  }
  return "UNAVAILABLE";
}

const DEFAULT_CORE: CoreApi = {
  loadLocalManifest: (manifestPath) =>
    coreModule.loadLocalManifest(manifestPath),
  createManifestEvidenceSource: (manifest) =>
    coreModule.createManifestEvidenceSource(manifest),
  prepareLocal: (request, source, signal) =>
    coreModule.prepareLocal(request, source, signal),
};

function isMain(ctx: ExtensionCommandContext): boolean {
  return ctx.agent.kind === "main";
}

function configGuidance(loaded: LoadedConfig): string {
  if (loaded.problem !== null) {
    return (
      `Retrospective config is invalid (${loaded.problem}). Fix the file named by ` +
      `${CONFIG_ENV} (an absolute path); project-local config files are ignored.`
    );
  }
  return (
    `Session retrospective is not configured. Set ${CONFIG_ENV} to the absolute path of a ` +
    'config file containing {"schemaVersion":1,"invitationOwner":"omp","root":"<absolute-store-root>"}. ' +
    "Project-local config files are ignored, and the store root must be outside the session project."
  );
}

function manifestScopeNotice(manifest: LocalManifest): string {
  // Counts and dispositions only: no session titles, paths, or event content.
  const local = manifest.nodes.filter(
    (node) => node.disposition === "local-allowed",
  ).length;
  const other = manifest.nodes.length - local;
  return (
    `Preparing the ${manifest.nodes.length} session(s) declared in your manifest ` +
    `(${local} local-allowed, ${other} explicit gaps). Sessions not declared there are not included.`
  );
}

export function createRetrospectiveAdapter(
  runtime: AdapterRuntime = {},
): RetrospectiveAdapter {
  const core = runtime.core ?? DEFAULT_CORE;

  const loadConfig = async (): Promise<LoadedConfig> =>
    await loadAdapterConfig({
      env: runtime.env ?? process.env,
      readTextFile: runtime.readTextFile ?? readConfigText,
    });

  async function presentReceipt(
    ctx: ExtensionCommandContext,
    receipt: ArtifactReceipt,
  ): Promise<void> {
    // Human UI only: artifact id, status, and the human-facing CLI command.
    // No report text, evidence rows, or transcript content crosses this line.
    ctx.ui.setStatus(STATUS_KEY, `Retrospective ${receipt.status}`);
    ctx.ui.notify(
      `Retrospective ${receipt.status}: ${receipt.artifactId} (no model calls, no outbound requests).`,
      "info",
    );
    ctx.ui.notify(
      "Open it locally: `ags-retrospective paths --root <root> --artifact " +
        `${receipt.artifactId}\``,
      "info",
    );
  }

  async function prepareManifest(
    manifestPath: string,
    ctx: ExtensionCommandContext,
  ): Promise<PrepareOutcome> {
    if (!isMain(ctx)) {
      ctx.ui.notify(MAIN_ONLY_MESSAGE, "info");
      return { kind: "unavailable", reason: "not-main" };
    }
    const loaded = await loadConfig();
    const { config } = loaded;
    if (!config.enabled || config.root === null) {
      ctx.ui.notify(configGuidance(loaded), "info");
      return { kind: "unavailable", reason: "not-configured" };
    }
    const storeRoot = config.root;
    const containment = await assessStoreRootContainment(storeRoot, ctx.cwd);
    if (
      containment.kind === "inside-cwd" ||
      containment.kind === "inside-repository"
    ) {
      ctx.ui.notify(
        `${STORE_ROOT_INSIDE_PROJECT}: the configured store root resolves ` +
          `(${containment.kind === "inside-cwd" ? "inside the session working directory" : "inside the session repository"})` +
          ". Choose a store root outside the project (for example a private directory " +
          "that is not a repository or synced folder).",
        "warning",
      );
      return { kind: "failed", code: STORE_ROOT_INSIDE_PROJECT };
    }
    if (containment.kind === "unresolved") {
      ctx.ui.notify(
        `${STORE_ROOT_UNRESOLVED}: the configured store root or the session working ` +
          "directory could not be resolved to a real path, so containment cannot be proven.",
        "warning",
      );
      return { kind: "failed", code: STORE_ROOT_UNRESOLVED };
    }
    if (!path.isAbsolute(manifestPath)) {
      // Absolute paths only: no cwd-relative resolution and no transcript paths.
      ctx.ui.notify(
        "Manifest path must be absolute (a local file you authored).",
        "info",
      );
      return { kind: "unavailable", reason: "manifest-not-absolute" };
    }
    if (!ctx.hasUI) {
      // A direct programmatic call cannot obtain the required per-run consent.
      ctx.ui.notify(MANUAL_INSTRUCTION, "info");
      return { kind: "unavailable", reason: "no-ui" };
    }

    let manifest: LocalManifest;
    try {
      manifest = await core.loadLocalManifest(manifestPath);
    } catch (error) {
      ctx.ui.notify(
        `Local manifest was not accepted (${errorCode(error)}).`,
        "warning",
      );
      return { kind: "failed", code: errorCode(error) };
    }

    ctx.ui.notify(manifestScopeNotice(manifest), "info");

    // Every run requires a fresh, explicit storage-risk acknowledgement. Nothing
    // is remembered or persisted; a declined or dismissed dialog prepares nothing.
    const acknowledged = await ctx.ui.confirm(
      STORAGE_RISK_CONFIRM_TITLE,
      storageRiskMessage(storeRoot),
    );
    if (!acknowledged) {
      ctx.ui.notify(
        `${STORAGE_RISK_NOT_ACKNOWLEDGED}: preparation cancelled; no retrospective was written.`,
        "info",
      );
      return { kind: "failed", code: STORAGE_RISK_NOT_ACKNOWLEDGED };
    }

    // The core contract carries the per-run acknowledgement; this field is only
    // ever set after the local confirmation above returned true.
    const request: PrepareRequest = {
      main: manifest.main,
      checkpointId: manifest.checkpointId,
      cutoff: manifest.cutoff,
      root: storeRoot,
      consent: "local-only",
      storageRiskAcknowledged: true,
    };

    const controller = runtime.newAbortController?.() ?? new AbortController();
    try {
      const receipt = await core.prepareLocal(
        request,
        core.createManifestEvidenceSource(manifest),
        controller.signal,
      );
      await presentReceipt(ctx, receipt);
      return { kind: "prepared", receipt };
    } catch (error) {
      ctx.ui.notify(
        `Retrospective was not prepared (${errorCode(error)}).`,
        "warning",
      );
      return { kind: "failed", code: errorCode(error) };
    }
  }

  async function handleCommand(
    rawArgs: string,
    ctx: ExtensionCommandContext,
  ): Promise<void> {
    const intent = parseCommandArgs(rawArgs);
    if (intent.kind === "invalid") {
      ctx.ui.notify(USAGE, "info");
      return;
    }
    if (!isMain(ctx)) {
      ctx.ui.notify(MAIN_ONLY_MESSAGE, "info");
      return;
    }
    if (!ctx.hasUI) {
      // No dialog surface: report the neutral manual path, prepare nothing,
      // and never place analysis or instructions into model context.
      ctx.ui.notify(MANUAL_INSTRUCTION, "info");
      return;
    }
    if (intent.kind === "explain") {
      ctx.ui.notify(SCOPE_UNSUPPORTED_MESSAGE, "info");
      return;
    }
    await prepareManifest(intent.manifestPath, ctx);
  }

  function extension(pi: ExtensionAPI): void {
    pi.setLabel("Session Retrospective");

    pi.registerCommand(COMMAND_NAME, {
      description:
        "Prepare a local retrospective from a human-authored local manifest",
      handler: async (args, ctx) => {
        await handleCommand(String(args), ctx);
      },
    });
  }

  return { extension, handleCommand, prepareManifest };
}

export default function ompSessionRetrospective(pi: ExtensionAPI): void {
  createRetrospectiveAdapter().extension(pi);
}
