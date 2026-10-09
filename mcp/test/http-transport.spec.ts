import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import fs from "fs-extra";
import os from "os";
import path from "path";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ResolvedConfig } from "../src/config";
import { SessionTracker } from "../src/services/SessionTracker";
import { createMcpHttpApp } from "../src/http";

describe("MCP Streamable HTTP lifecycle", () => {
  let projectRoot: string;
  let httpServer: Server | undefined;
  let client: Client | undefined;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-http-"));
  });

  afterEach(async () => {
    await client?.close();
    if (httpServer?.listening) {
      await new Promise<void>((resolve, reject) => {
        httpServer?.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await fs.remove(projectRoot);
  });

  it("handles later calls and recovers after a rejected request", async () => {
    const config: ResolvedConfig = {
      projectRoot,
      skillsDir: null,
      setup: {
        kind: "no-skills-dir",
        projectRoot,
        candidates: [],
      },
    };
    const app = createMcpHttpApp(config, new SessionTracker());
    httpServer = app.listen(0);
    await new Promise<void>((resolve) =>
      httpServer?.once("listening", resolve),
    );

    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("HTTP test server did not bind a TCP port.");
    }
    const endpoint = new URL(`http://127.0.0.1:${address.port}/mcp`);
    client = new Client({ name: "http-lifecycle-test", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(endpoint));

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain("list_categories");

    const call = await client.callTool({
      name: "list_categories",
      arguments: {},
    });
    expect(call.isError).not.toBe(true);
    expect(call.content).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "text" })]),
    );

    const rejected = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });
    expect(rejected.status).toBe(400);

    const recoveredTools = await client.listTools();
    expect(recoveredTools.tools.map((tool) => tool.name)).toContain(
      "list_categories",
    );
  });
});
