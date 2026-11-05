import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { buildServer } from "../src/server";
import {
  CONSENT_TEXT_VERSION,
  writeConsent,
  consentFilePath,
  type ConsentRecord,
} from "../src/retrospective/consent";
import {
  DISABLED_RETROSPECTIVE_TEXT,
  RETROSPECTIVE_NUDGE_TEXT,
} from "../src/tools";

// Every case here spawns a real node+tsx server (some spawn it twice), so the
// global 5 s default is too tight on shared CI runners.
vi.setConfig({ testTimeout: 30_000 });

const temporaryRoots: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const base = await fs.realpath(os.tmpdir());
  const directory = await fs.mkdtemp(path.join(base, "ags-retro-slice-"));
  temporaryRoots.push(directory);
  return directory;
}

const activeClients: Client[] = [];

afterEach(async () => {
  while (activeClients.length > 0) {
    const client = activeClients.pop();
    if (client) {
      await client.close().catch(() => undefined);
    }
  }
  await Promise.all(
    temporaryRoots.map((dir) =>
      fs.rm(dir, { recursive: true, force: true }).catch(() => undefined),
    ),
  );
  temporaryRoots.length = 0;
});

async function createProjectWithSkills(workspace: string): Promise<void> {
  await fs.mkdir(workspace, { recursive: true });
  await fs.writeFile(path.join(workspace, "AGENTS.md"), "# Project Agents\n");

  const skillsDir = path.join(workspace, "skills");
  await fs.mkdir(skillsDir, { recursive: true });
  await fs.writeFile(
    path.join(skillsDir, "metadata.json"),
    JSON.stringify({
      file_routing: { ts: ["typescript"] },
      broad_globs: ["**/*.ts"],
      base_language_skills: { typescript: "typescript-language" },
    }),
  );
  const skillDir = path.join(skillsDir, "typescript", "typescript-language");
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    `---\nname: typescript-language\ndescription: typescript rules\nmetadata:\n  triggers:\n    files: ["**/*.ts"]\n    keywords: ["typescript"]\n---\n# typescript\n`,
  );
}

function createConsentRecord(
  allowedRoots: string[],
  storeDir: string,
): ConsentRecord {
  return {
    schemaVersion: 1,
    consentTextVersion: CONSENT_TEXT_VERSION,
    grantedAt: new Date().toISOString(),
    storeRoot: storeDir,
    allowedSourceRoots: allowedRoots,
    storageRiskAcknowledged: true,
  };
}

async function writeSessionFile(
  filePath: string,
  lines: string[],
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, lines.join("\n") + "\n", { mode: 0o600 });
  if (process.platform !== "win32") {
    await fs.chmod(filePath, 0o600);
  }
}

function sessionHeader(options: {
  id: string;
  cwd: string;
  parentSession?: string;
  timestamp?: string;
}): string {
  return JSON.stringify({
    type: "session",
    version: 3,
    id: options.id,
    timestamp: options.timestamp ?? new Date().toISOString(),
    cwd: options.cwd,
    ...(options.parentSession ? { parentSession: options.parentSession } : {}),
  });
}

function ompMcpToolCall(options: {
  callId: string;
  tool: string;
  timestamp: string;
}): string {
  return JSON.stringify({
    type: "message",
    id: `msg-${options.callId}`,
    timestamp: options.timestamp,
    message: {
      role: "assistant",
      content: [
        {
          type: "toolCall",
          id: options.callId,
          name: "write",
          arguments: {
            path: `xd://mcp__agent_skills_standard_${options.tool}`,
          },
        },
      ],
    },
  });
}

function toolResult(options: { callId: string; timestamp: string }): string {
  return JSON.stringify({
    type: "message",
    id: `res-${options.callId}`,
    timestamp: options.timestamp,
    message: {
      role: "toolResult",
      toolCallId: options.callId,
      toolName: "write",
      content: [{ type: "text", text: "ok" }],
    },
  });
}

const currentFileDir = path.dirname(fileURLToPath(import.meta.url));
const tsxLoader = path.resolve(
  currentFileDir,
  "../node_modules/tsx/dist/loader.mjs",
);
const serverSrc = path.resolve(currentFileDir, "../src/index.ts");
const nodeModulesDir = path.resolve(currentFileDir, "../node_modules");

async function startStdioClient(
  workspace: string,
  configHome: string,
): Promise<Client> {
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    XDG_CONFIG_HOME: configHome,
    APPDATA: configHome,
    MCP_TRANSPORT: "stdio",
    NODE_PATH: nodeModulesDir,
  };

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", tsxLoader, serverSrc],
    cwd: workspace,
    env: childEnv,
  });

  const client = new Client(
    { name: "retrospective-slice-test", version: "1.0.0" },
    { capabilities: {} },
  );

  await client.connect(transport);
  activeClients.push(client);
  return client;
}

function extractToolText(res: {
  content?: Array<{ type: string; text?: string }>;
}): string {
  return (res.content ?? []).map((c) => c.text ?? "").join("\n");
}

describe("retrospective vertical slice — real server over stdio", () => {
  it("executes the full prepare lifecycle and restarts cleanly", async () => {
    const root = await temporaryDirectory();
    const workspace = path.join(root, "workspace");
    const store = path.join(root, "store");
    const allowed = path.join(root, "allowed-sessions");
    const configHome = path.join(root, "config");
    await fs.mkdir(allowed, { recursive: true });
    await fs.mkdir(configHome, { recursive: true });

    // Ensure the project has skills so list_categories records instead of returning empty-state guidance
    await createProjectWithSkills(workspace);

    // Write consent
    const consentFile = consentFilePath(
      { XDG_CONFIG_HOME: configHome, APPDATA: configHome },
      process.platform,
    );
    await writeConsent(createConsentRecord([allowed], store), consentFile);

    // Connect client over stdio
    const client = await startStdioClient(workspace, configHome);

    // 1. Tool list contains both new tools on stdio
    const tools = await client.listTools();
    const toolNames = tools.tools.map((t) => t.name);
    expect(toolNames).toContain("prepare_retrospective");
    expect(toolNames).toContain("get_retrospective_status");
    expect(toolNames).toContain("prepare_retrospective_index");

    // Session binding needs a recorded call in the same server process:
    // make a real tracked call and bracket its arrival window
    const beforeCall = Date.now();
    await client.callTool({ name: "list_categories", arguments: {} });
    const afterCall = Date.now();

    // Now write the synthetic session JSONL containing this exact call window
    const sessionDir = path.join(allowed, path.basename(workspace));
    const sessionFile = path.join(sessionDir, "slice-session.jsonl");
    await writeSessionFile(sessionFile, [
      sessionHeader({ id: "slice-sess-1", cwd: workspace }),
      ompMcpToolCall({
        callId: "c_start",
        tool: "list_categories",
        timestamp: new Date(beforeCall - 50).toISOString(),
      }),
      toolResult({
        callId: "c_start",
        timestamp: new Date(afterCall + 50).toISOString(),
      }),
    ]);

    // (a) WITHIN one server process: first call -> Retrospective prepared
    const prepRes = await client.callTool({
      name: "prepare_retrospective",
      arguments: {},
    });
    const prepText = extractToolText(
      prepRes as { content: Array<{ type: string; text: string }> },
    );
    expect(prepText).toContain("Retrospective prepared");

    // Text includes two existing file paths
    const summaryMatch = prepText.match(/Summary:\s*(\S+)/);
    const ledgerMatch = prepText.match(/Ledger:\s*(\S+)/);
    expect(summaryMatch).toBeTruthy();
    expect(ledgerMatch).toBeTruthy();
    const summaryPath = summaryMatch![1];
    const ledgerPath = ledgerMatch![1];

    const summaryStat = await fs.stat(summaryPath);
    expect(summaryStat.isFile()).toBe(true);
    const ledgerStat = await fs.stat(ledgerPath);
    expect(ledgerStat.isFile()).toBe(true);

    // The summary file's first line states coverage
    const summaryFirstLine = (await fs.readFile(summaryPath, "utf8")).split(
      "\n",
    )[0];
    expect(summaryFirstLine.toLowerCase()).toContain("coverage");

    // The ledger parses
    const ledgerJson = await fs.readFile(ledgerPath, "utf8");
    const parsedLedger = JSON.parse(ledgerJson);
    expect(parsedLedger).toBeDefined();

    const artifactIdMatch = prepText.match(/artifact id: ([^,)]+)/);
    expect(artifactIdMatch).toBeTruthy();
    const artifactId = artifactIdMatch![1];

    // Second call in the same process with no new tracked calls and no new substantive rows:
    // returns Retrospective already prepared with the same artifact id and the same two paths
    const prepRes2 = await client.callTool({
      name: "prepare_retrospective",
      arguments: {},
    });
    const prepText2 = extractToolText(
      prepRes2 as { content: Array<{ type: string; text: string }> },
    );
    expect(prepText2).toContain("Retrospective already prepared");
    const artifactIdMatch2 = prepText2.match(/artifact id: ([^,)]+)/);
    expect(artifactIdMatch2).toBeTruthy();
    expect(artifactIdMatch2![1]).toBe(artifactId);
    expect(prepText2).toContain(`Summary: ${summaryPath}`);
    expect(prepText2).toContain(`Ledger: ${ledgerPath}`);

    // (b) ACROSS a restart:
    // (1) The host has not yet written the current call's own row to the session file when a tool runs,
    //     so binding can only use EARLIER recorded calls of the same server process.
    // (2) After a restart the tracker is empty, so the test must record a NEW tracked call (`list_categories`)
    //     and append its call/result rows to the session file. Those rows are genuine new substantive work,
    //     which by the checkpoint definition changes the checkpoint, yielding a new report for the new state.
    await client.close();
    const client2 = await startStdioClient(workspace, configHome);

    const beforeRestart = Date.now();
    await client2.callTool({ name: "list_categories", arguments: {} });
    const afterRestart = Date.now();

    // Append the matching call record into the session file for the restarted process
    const existingLines = (await fs.readFile(sessionFile, "utf8"))
      .trim()
      .split("\n");
    existingLines.push(
      ompMcpToolCall({
        callId: "c_restart",
        tool: "list_categories",
        timestamp: new Date(beforeRestart - 50).toISOString(),
      }),
      toolResult({
        callId: "c_restart",
        timestamp: new Date(afterRestart + 50).toISOString(),
      }),
    );
    await writeSessionFile(sessionFile, existingLines);

    // After restart with new substantive work: returns Retrospective prepared with a DIFFERENT artifact id
    const prepRestart = await client2.callTool({
      name: "prepare_retrospective",
      arguments: {},
    });
    const prepRestartText = extractToolText(
      prepRestart as { content: Array<{ type: string; text: string }> },
    );
    expect(prepRestartText).toContain("Retrospective prepared");
    const restartArtifactMatch = prepRestartText.match(/artifact id: ([^,)]+)/);
    expect(restartArtifactMatch).toBeTruthy();
    const restartArtifactId = restartArtifactMatch![1];
    expect(restartArtifactId).not.toBe(artifactId);

    // The earlier artifact from (a) still resolves on disk (its summary file still exists at the first call's path),
    // proving a restart never deletes or rewrites an earlier report
    const earlierSummaryStat = await fs.stat(summaryPath);
    expect(earlierSummaryStat.isFile()).toBe(true);

    // A second call in the restarted process with nothing new -> already prepared with the second artifact id
    const prepRestartRepeat = await client2.callTool({
      name: "prepare_retrospective",
      arguments: {},
    });
    const prepRestartRepeatText = extractToolText(
      prepRestartRepeat as { content: Array<{ type: string; text: string }> },
    );
    expect(prepRestartRepeatText).toContain("Retrospective already prepared");
    const restartRepeatArtifactMatch = prepRestartRepeatText.match(
      /artifact id: ([^,)]+)/,
    );
    expect(restartRepeatArtifactMatch).toBeTruthy();
    expect(restartRepeatArtifactMatch![1]).toBe(restartArtifactId);
    // 5. Repeated auditSessionCompliance and getSessionCost after >= 20 loads: nudge appears; prepare stops it
    for (let i = 0; i < 20; i++) {
      await client2.callTool({ name: "list_categories", arguments: {} });
    }

    const auditWithNudge = await client2.callTool({
      name: "audit_session_compliance",
      arguments: {},
    });
    expect(
      extractToolText(
        auditWithNudge as { content: Array<{ type: string; text: string }> },
      ),
    ).toContain(RETROSPECTIVE_NUDGE_TEXT);

    const costWithNudge = await client2.callTool({
      name: "get_session_cost",
      arguments: {},
    });
    expect(
      extractToolText(
        costWithNudge as { content: Array<{ type: string; text: string }> },
      ),
    ).toContain(RETROSPECTIVE_NUDGE_TEXT);

    // Prepare once
    await client2.callTool({
      name: "prepare_retrospective",
      arguments: {},
    });

    // Nudge is now stopped
    const auditAfter = await client2.callTool({
      name: "audit_session_compliance",
      arguments: {},
    });
    expect(
      extractToolText(
        auditAfter as { content: Array<{ type: string; text: string }> },
      ),
    ).not.toContain(RETROSPECTIVE_NUDGE_TEXT);

    const costAfter = await client2.callTool({
      name: "get_session_cost",
      arguments: {},
    });
    expect(
      extractToolText(
        costAfter as { content: Array<{ type: string; text: string }> },
      ),
    ).not.toContain(RETROSPECTIVE_NUDGE_TEXT);
  });

  it("in a fresh process with no tracked call or project without skills, prepare_retrospective returns fixed not-substantive text and writes nothing to store", async () => {
    const root = await temporaryDirectory();
    const workspace = path.join(root, "workspace");
    const store = path.join(root, "store");
    const allowed = path.join(root, "allowed-sessions");
    const configHome = path.join(root, "config");
    // Workspace has NO skills installed
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(allowed, { recursive: true });
    await fs.mkdir(configHome, { recursive: true });

    const consentFile = consentFilePath(
      { XDG_CONFIG_HOME: configHome, APPDATA: configHome },
      process.platform,
    );
    await writeConsent(createConsentRecord([allowed], store), consentFile);

    // Launch server process in project without skills and make zero tracked tool calls
    const client = await startStdioClient(workspace, configHome);
    const res = await client.callTool({
      name: "prepare_retrospective",
      arguments: {},
    });
    const text = extractToolText(
      res as { content: Array<{ type: string; text: string }> },
    );
    expect(text).toBe("Retrospective skipped: session is not substantive.");

    // Store remains completely untouched
    const storeExists = await fs.stat(store).catch(() => null);
    if (storeExists) {
      const generations = await fs.readdir(store);
      expect(generations).toEqual([]);
    }
  });

  it("MCP_TRANSPORT=sse semantics excludes both retrospective tools", async () => {
    const root = await temporaryDirectory();
    const sseServer = await buildServer(
      {
        projectRoot: root,
        skillsDir: null,
        setup: { kind: "ready" },
      },
      { transport: "sse" },
    );

    interface ServerWithTools {
      _registeredTools: Record<string, unknown>;
    }
    const registered = (sseServer as unknown as ServerWithTools)
      ._registeredTools;
    expect(registered["prepare_retrospective"]).toBeUndefined();
    expect(registered["get_retrospective_status"]).toBeUndefined();
    expect(registered["prepare_retrospective_index"]).toBeUndefined();
    expect(registered["list_categories"]).toBeDefined();
  });

  it("session file with parentSession header returns child-session text and creates no generation", async () => {
    const root = await temporaryDirectory();
    const workspace = path.join(root, "workspace");
    const store = path.join(root, "store");
    const allowed = path.join(root, "allowed-sessions");
    const configHome = path.join(root, "config");
    await fs.mkdir(allowed, { recursive: true });
    await fs.mkdir(configHome, { recursive: true });

    // Project has skills so list_categories records in tracker
    await createProjectWithSkills(workspace);

    const consentFile = consentFilePath(
      { XDG_CONFIG_HOME: configHome, APPDATA: configHome },
      process.platform,
    );
    await writeConsent(createConsentRecord([allowed], store), consentFile);

    const client = await startStdioClient(workspace, configHome);

    // Track a call so the server observation exists to bind with
    const beforeCall = Date.now();
    await client.callTool({ name: "list_categories", arguments: {} });
    const afterCall = Date.now();

    const sessionDir = path.join(allowed, path.basename(workspace));
    const sessionFile = path.join(sessionDir, "child-session.jsonl");
    await writeSessionFile(sessionFile, [
      sessionHeader({
        id: "child-worker-1",
        cwd: workspace,
        parentSession: "parent-orchestrator",
      }),
      ompMcpToolCall({
        callId: "c_child",
        tool: "list_categories",
        timestamp: new Date(beforeCall - 50).toISOString(),
      }),
      toolResult({
        callId: "c_child",
        timestamp: new Date(afterCall + 50).toISOString(),
      }),
    ]);

    const res = await client.callTool({
      name: "prepare_retrospective",
      arguments: {},
    });
    const text = extractToolText(
      res as { content: Array<{ type: string; text: string }> },
    );
    expect(text).toContain(
      "Retrospective skipped: current session is a child or worker session.",
    );

    const storeExists = await fs.stat(store).catch(() => null);
    if (storeExists) {
      const generations = await fs.readdir(store);
      expect(generations).toEqual([]);
    }
  });

  it("consent absent returns fixed disabled text and leaves store untouched", async () => {
    const root = await temporaryDirectory();
    const workspace = path.join(root, "workspace");
    const store = path.join(root, "store");
    const configHome = path.join(root, "config");
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(configHome, { recursive: true });

    const client = await startStdioClient(workspace, configHome);
    const res = await client.callTool({
      name: "prepare_retrospective",
      arguments: {},
    });
    const text = extractToolText(
      res as { content: Array<{ type: string; text: string }> },
    );
    expect(text).toBe(DISABLED_RETROSPECTIVE_TEXT);

    const storeExists = await fs.stat(store).catch(() => null);
    expect(storeExists).toBeNull();
  });
});
