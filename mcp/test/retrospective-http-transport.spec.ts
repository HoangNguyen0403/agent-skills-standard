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

/**
 * The retrospective tools are stdio-only. The HTTP factory must pin its own
 * transport instead of inheriting `MCP_TRANSPORT`, otherwise an HTTP deployment
 * can silently grow local session collection.
 */
describe("MCP HTTP surface and retrospective tools", () => {
  let projectRoot: string;
  const originalTransport = process.env.MCP_TRANSPORT;

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "ags-mcp-http-retro-"),
    );
  });

  afterEach(async () => {
    if (originalTransport === undefined) {
      delete process.env.MCP_TRANSPORT;
    } else {
      process.env.MCP_TRANSPORT = originalTransport;
    }
    await fs.remove(projectRoot);
  });

  async function listToolNamesThroughHttp(): Promise<string[]> {
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
    const httpServer: Server = app.listen(0);
    await new Promise<void>((resolve) => httpServer.once("listening", resolve));

    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("HTTP test server did not bind a TCP port.");
    }

    const client = new Client({
      name: "http-retrospective-surface-test",
      version: "1.0.0",
    });
    try {
      await client.connect(
        new StreamableHTTPClientTransport(
          new URL(`http://127.0.0.1:${address.port}/mcp`),
        ),
      );
      const tools = await client.listTools();
      return tools.tools.map((tool) => tool.name);
    } finally {
      await client.close();
      if (httpServer.listening) {
        await new Promise<void>((resolve, reject) => {
          httpServer.close((error) => (error ? reject(error) : resolve()));
        });
      }
    }
  }

  it("omits retrospective tools when MCP_TRANSPORT is unset", async () => {
    delete process.env.MCP_TRANSPORT;

    const names = await listToolNamesThroughHttp();
    expect(names).toContain("list_categories");
    expect(names).not.toContain("prepare_retrospective");
    expect(names).not.toContain("get_retrospective_status");
    expect(names).not.toContain("prepare_retrospective_index");
  });

  it("omits retrospective tools even when the ambient MCP_TRANSPORT is stdio", async () => {
    process.env.MCP_TRANSPORT = "stdio";

    const names = await listToolNamesThroughHttp();
    expect(names).toContain("list_categories");
    expect(names).not.toContain("prepare_retrospective");
    expect(names).not.toContain("get_retrospective_status");
    expect(names).not.toContain("prepare_retrospective_index");
  });
});
