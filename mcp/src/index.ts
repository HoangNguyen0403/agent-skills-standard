#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { buildServer } from "./server";
import { resolveConfig } from "./config";

async function main() {
  const config = await resolveConfig();
  const transportMode = process.env.MCP_TRANSPORT || "stdio";

  // Log to stderr — stdout is reserved for MCP JSON-RPC frames in stdio mode.
  process.stderr.write(`[ags-mcp] transport: ${transportMode}\n`);
  if (config.skillsDir) {
    process.stderr.write(`[ags-mcp] serving skills from ${config.skillsDir}\n`);
  } else {
    process.stderr.write(
      `[ags-mcp] no skills installed yet (${config.setup.kind}). Tools will return setup guidance until you run \`agent-skills-standard sync\`.\n`,
    );
  }

  const server = await buildServer(config);

  if (transportMode === "sse") {
    // createMcpExpressApp handles DNS rebinding protection and localhost security by default.
    const app = createMcpExpressApp();
    const port = process.env.PORT || 8768;

    const transport = new StreamableHTTPServerTransport();
    await server.connect(transport);

    // Handle MCP over HTTP (GET for SSE, POST for messages)
    // We map both the new standard endpoint and legacy endpoints to the same handler.
    const handleRequest = async (req: any, res: any) => {
      await transport.handleRequest(req, res);
    };

    app.all("/mcp", handleRequest);
    app.all("/sse", handleRequest);
    app.all("/messages", handleRequest);

    app.listen(port, () => {
      process.stderr.write(`[ags-mcp] SSE server listening on port ${port}\n`);
      process.stderr.write(`[ags-mcp] MCP endpoint: http://localhost:${port}/mcp\n`);
      process.stderr.write(`[ags-mcp] (Legacy) SSE endpoint: http://localhost:${port}/sse\n`);
      process.stderr.write(`[ags-mcp] (Legacy) Message endpoint: http://localhost:${port}/messages\n`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write(`[ags-mcp] stdio transport connected\n`);
  }
}

main().catch((err) => {
  process.stderr.write(
    `[ags-mcp] fatal: ${err instanceof Error ? err.stack : String(err)}\n`,
  );
  process.exit(1);
});

