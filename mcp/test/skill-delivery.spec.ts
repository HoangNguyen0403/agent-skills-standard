import { createHash } from "node:crypto";
import { once } from "node:events";
import type { Server } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import type { ResolvedConfig } from "../src/config";
import { createMcpHttpApp } from "../src/http";
import { buildServer } from "../src/server";
import { SessionTracker } from "../src/services/SessionTracker";

interface SkillFixture {
  files: string[];
  keywords: string[];
}

const BLOC_ID = "flutter-bloc";
const LANGUAGE_ID = "flutter-language";

function skillBody(id: string, triggers: SkillFixture, marker: string): string {
  return [
    "---",
    `name: ${id}`,
    `description: ${id}`,
    "metadata:",
    "  triggers:",
    `    files: ${JSON.stringify(triggers.files)}`,
    `    keywords: ${JSON.stringify(triggers.keywords)}`,
    "    exclude: []",
    "---",
    `# ${id}`,
    "",
    `Revision marker: ${marker}`,
    "",
  ].join("\n");
}

async function writeSkill(
  root: string,
  category: string,
  id: string,
  triggers: SkillFixture,
  marker: string,
): Promise<string> {
  const target = path.join(root, "skills", category, id);
  await fs.ensureDir(target);
  const skillPath = path.join(target, "SKILL.md");
  await fs.writeFile(skillPath, skillBody(id, triggers, marker));
  return skillPath;
}

async function makeFixture(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-delivery-"));
  const skills = path.join(root, "skills");
  await fs.ensureDir(skills);
  await fs.writeJson(path.join(skills, "metadata.json"), {
    file_routing: { dart: ["flutter"] },
    broad_globs: ["**/*.dart"],
    base_language_skills: { flutter: LANGUAGE_ID },
  });
  await writeSkill(
    root,
    "flutter",
    LANGUAGE_ID,
    { files: ["**/*.dart"], keywords: [] },
    "language-current",
  );
  await writeSkill(
    root,
    "flutter",
    BLOC_ID,
    { files: ["**_bloc.dart"], keywords: ["bloc", "state"] },
    "revision-A",
  );
  await fs.writeFile(path.join(root, "AGENTS.md"), "# fixture\n");
  return root;
}

function configFor(root: string): ResolvedConfig {
  return {
    projectRoot: root,
    skillsDir: path.join(root, "skills"),
    metadataPath: path.join(root, "skills", "metadata.json"),
    setup: { kind: "ready" },
  };
}

function textOf(result: { content: unknown }): string {
  if (!Array.isArray(result.content)) return "";
  return result.content
    .map((block: unknown) => {
      if (typeof block !== "object" || block === null) return "";
      const record = block as { type?: unknown; text?: unknown };
      return record.type === "text" && typeof record.text === "string"
        ? record.text
        : "";
    })
    .join("\n");
}

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function toolInputProperties(
  tools: { tools: Array<{ name: string; inputSchema: unknown }> },
  name: string,
): string[] {
  const tool = tools.tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Tool ${name} is not registered.`);
  const schema = tool.inputSchema as {
    type?: string;
    properties?: Record<string, unknown>;
  };
  return Object.keys(schema.properties ?? {});
}

async function connectInMemory(
  root: string,
  tracker: SessionTracker,
): Promise<{
  client: Client;
  server: McpServer;
}> {
  const server = await buildServer(configFor(root), { tracker });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "delivery-test", version: "1.0.0" });
  await client.connect(clientTransport);
  return { client, server };
}

describe("required skill delivery through a shared server", () => {
  it("returns the full body on a repeated file lookup in one session", async () => {
    const root = await makeFixture();
    const tracker = new SessionTracker();
    const { client, server } = await connectInMemory(root, tracker);
    try {
      const first = await client.callTool({
        name: "load_skills_for_files",
        arguments: { files: ["lib/cart_bloc.dart"] },
      });
      const second = await client.callTool({
        name: "load_skills_for_files",
        arguments: { files: ["lib/cart_bloc.dart"] },
      });

      expect(textOf(first)).toContain("# flutter-bloc");
      expect(textOf(second)).toContain("# flutter-bloc");
      expect(textOf(second)).not.toContain("body omitted");
      expect(textOf(second)).not.toContain("already loaded this session");
    } finally {
      await client.close();
      await server.close();
      await fs.remove(root);
    }
  });

  it("returns the full body on a repeated keyword lookup in one session", async () => {
    const root = await makeFixture();
    const tracker = new SessionTracker();
    const { client, server } = await connectInMemory(root, tracker);
    try {
      const args = { keywords: ["bloc"] };
      const first = await client.callTool({
        name: "load_skills_for_keywords",
        arguments: args,
      });
      const second = await client.callTool({
        name: "load_skills_for_keywords",
        arguments: args,
      });

      expect(textOf(first)).toContain("# flutter-bloc");
      expect(textOf(second)).toContain("# flutter-bloc");
      expect(textOf(second)).not.toContain("body omitted");
    } finally {
      await client.close();
      await server.close();
      await fs.remove(root);
    }
  });

  it("serves a sibling request after a parent lookup through the same HTTP server", async () => {
    const root = await makeFixture();
    const tracker = new SessionTracker();
    const app = createMcpHttpApp(configFor(root), tracker);
    let httpServer: Server | undefined;
    let parent: Client | undefined;
    let sibling: Client | undefined;
    try {
      httpServer = app.listen(0);
      await once(httpServer, "listening");
      const address = httpServer.address();
      if (!address || typeof address === "string") {
        throw new Error("HTTP test server did not bind a TCP port.");
      }
      const endpoint = new URL(`http://127.0.0.1:${address.port}/mcp`);

      parent = new Client({ name: "parent-context", version: "1.0.0" });
      await parent.connect(new StreamableHTTPClientTransport(endpoint));
      sibling = new Client({ name: "sibling-context", version: "1.0.0" });
      await sibling.connect(new StreamableHTTPClientTransport(endpoint));

      const parentBody = await parent.callTool({
        name: "load_skills_for_files",
        arguments: { files: ["lib/cart_bloc.dart"] },
      });
      const siblingBody = await sibling.callTool({
        name: "load_skills_for_files",
        arguments: { files: ["lib/cart_bloc.dart"] },
      });

      expect(textOf(parentBody)).toContain("# flutter-bloc");
      expect(textOf(siblingBody)).toContain("# flutter-bloc");
      expect(textOf(siblingBody)).toContain("# flutter-language");
      expect(textOf(siblingBody)).not.toContain("already loaded this session");
    } finally {
      await parent?.close();
      await sibling?.close();
      if (httpServer?.listening) {
        httpServer.close();
        await once(httpServer, "close");
      }
      await fs.remove(root);
    }
  });

  it("reads the current revision of an edited skill body", async () => {
    const root = await makeFixture();
    const tracker = new SessionTracker();
    const { client, server } = await connectInMemory(root, tracker);
    try {
      const first = await client.callTool({
        name: "load_skills_for_files",
        arguments: { files: ["lib/cart_bloc.dart"] },
      });
      expect(textOf(first)).toContain("Revision marker: revision-A");

      await writeSkill(
        root,
        "flutter",
        BLOC_ID,
        { files: ["**_bloc.dart"], keywords: ["bloc", "state"] },
        "revision-B",
      );
      const second = await client.callTool({
        name: "load_skills_for_files",
        arguments: { files: ["lib/cart_bloc.dart"] },
      });

      expect(textOf(second)).toContain("Revision marker: revision-B");
      expect(textOf(second)).not.toContain("Revision marker: revision-A");
    } finally {
      await client.close();
      await server.close();
      await fs.remove(root);
    }
  });

  it("does not record an unreadable skill as a returned body", async () => {
    const root = await makeFixture();
    const languagePath = path.join(
      root,
      "skills",
      "flutter",
      LANGUAGE_ID,
      "SKILL.md",
    );
    const languageDigest = sha256(await fs.readFile(languagePath, "utf8"));
    const tracker = new SessionTracker();
    const { client, server } = await connectInMemory(root, tracker);
    try {
      await fs.remove(
        path.join(root, "skills", "flutter", BLOC_ID, "SKILL.md"),
      );
      const loaded = await client.callTool({
        name: "load_skills_for_files",
        arguments: { files: ["lib/cart_bloc.dart"] },
      });
      expect(textOf(loaded)).toContain(
        "Could not read skill content for flutter/flutter-bloc",
      );
      expect(textOf(loaded)).toContain("# flutter-language");

      const loadEvents = tracker
        .events_()
        .filter((event) => event.via === "load_skills_for_files");
      expect(loadEvents).toHaveLength(1);
      const returnedBodies = loadEvents.flatMap((event) => event.loaded);
      expect(returnedBodies).toEqual([`flutter/${LANGUAGE_ID}`]);
      expect(tracker.loadedSkills()).toEqual([`flutter/${LANGUAGE_ID}`]);
      expect(loadEvents[0].selected).toEqual(
        expect.arrayContaining([
          `flutter/${BLOC_ID}`,
          `flutter/${LANGUAGE_ID}`,
        ]),
      );
      expect(loadEvents[0].bodyDigests?.[`flutter/${LANGUAGE_ID}`]).toBe(
        languageDigest,
      );
      expect(loadEvents[0].bodyDigests).not.toHaveProperty(
        `flutter/${BLOC_ID}`,
      );
    } finally {
      await client.close();
      await server.close();
      await fs.remove(root);
    }
  });

  it("removes the force_reload option from the public tool schemas", async () => {
    const root = await makeFixture();
    const tracker = new SessionTracker();
    const { client, server } = await connectInMemory(root, tracker);
    try {
      const tools = await client.listTools();

      expect(toolInputProperties(tools, "load_skills_for_files")).toEqual([
        "files",
      ]);
      expect(toolInputProperties(tools, "load_skills_for_keywords")).toEqual([
        "keywords",
      ]);
    } finally {
      await client.close();
      await server.close();
      await fs.remove(root);
    }
  });

  it("does not count an unmatched get_skill request as selected", async () => {
    const root = await makeFixture();
    const tracker = new SessionTracker();
    const { client, server } = await connectInMemory(root, tracker);
    try {
      await client.callTool({
        name: "get_skill",
        arguments: { category: "rust", name: "whatever" },
      });

      const missEvents = tracker
        .events_()
        .filter((event) => event.via === "get_skill");
      expect(missEvents).toHaveLength(1);
      expect(missEvents[0].input).toEqual(["rust/whatever"]);
      expect(missEvents[0].selected).toEqual([]);
      expect(missEvents[0].loaded).toEqual([]);
    } finally {
      await client.close();
      await server.close();
      await fs.remove(root);
    }
  });

  it("records selected skills separately from returned bodies and digests each returned body", async () => {
    const root = await makeFixture();
    const blocBody = await fs.readFile(
      path.join(root, "skills", "flutter", BLOC_ID, "SKILL.md"),
      "utf8",
    );
    const languageBody = await fs.readFile(
      path.join(root, "skills", "flutter", LANGUAGE_ID, "SKILL.md"),
      "utf8",
    );
    const tracker = new SessionTracker();
    const { client, server } = await connectInMemory(root, tracker);
    try {
      const args = { files: ["lib/cart_bloc.dart"] };
      await client.callTool({
        name: "load_skills_for_files",
        arguments: args,
      });
      await client.callTool({
        name: "load_skills_for_files",
        arguments: args,
      });

      const loadEvents = tracker
        .events_()
        .filter((event) => event.via === "load_skills_for_files");
      const selected = new Set(
        loadEvents.flatMap((event) => event.selected ?? []),
      );
      const returnedBodies = loadEvents.flatMap((event) => event.loaded);
      const digests = Object.assign(
        {},
        ...loadEvents.map((event) => event.bodyDigests ?? {}),
      );

      expect(selected).toEqual(
        new Set([`flutter/${BLOC_ID}`, `flutter/${LANGUAGE_ID}`]),
      );
      expect(returnedBodies).toHaveLength(4);
      expect(tracker.loadedSkills()).toEqual([
        `flutter/${BLOC_ID}`,
        `flutter/${LANGUAGE_ID}`,
      ]);
      expect(digests[`flutter/${BLOC_ID}`]).toBe(sha256(blocBody));
      expect(digests[`flutter/${LANGUAGE_ID}`]).toBe(sha256(languageBody));
    } finally {
      await client.close();
      await server.close();
      await fs.remove(root);
    }
  });
});
