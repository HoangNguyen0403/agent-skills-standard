#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { buildServer, SERVER_VERSION } from "./server";
import { resolveConfig } from "./config";
import { SessionTracker } from "./services/SessionTracker";
import {
  TelemetryWriter,
  buildTelemetryRecord,
} from "./services/TelemetryWriter";
import { resolveTelemetry } from "./services/telemetryConfig";

async function main() {
  const config = await resolveConfig();
  const transportMode = process.env.MCP_TRANSPORT || "stdio";
  const tracker = new SessionTracker();
  const telemetry = resolveTelemetry(config.projectRoot);
  const writer = new TelemetryWriter({
    enabled: telemetry.enabled,
    filePath: telemetry.filePath,
    debug: !!process.env.DEBUG,
  });
  if (telemetry.enabled) {
    process.stderr.write(
      `[ags-mcp] telemetry: on (${telemetry.source}) → ${telemetry.filePath}\n`,
    );
  }
  let flushed = false;
  const flushOnce = () => {
    if (flushed) return;
    flushed = true;
    writer.flush(
      buildTelemetryRecord(tracker, {
        mcpVersion: SERVER_VERSION,
      }),
    );
  };
  process.on("exit", flushOnce);
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      flushOnce();
      process.exit(signal === "SIGINT" ? 130 : 143);
    });
  }

  // Log to stderr — stdout is reserved for MCP JSON-RPC frames in stdio mode.
  process.stderr.write(`[ags-mcp] transport: ${transportMode}\n`);
  if (config.skillsDir) {
    process.stderr.write(`[ags-mcp] serving skills from ${config.skillsDir}\n`);
  } else {
    process.stderr.write(
      `[ags-mcp] no skills installed yet (${config.setup.kind}). Tools will return setup guidance until you run \`agent-skills-standard sync\`.\n`,
    );
  }

  const server = await buildServer(config, { tracker });

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
      process.stderr.write(
        `[ags-mcp] MCP endpoint: http://localhost:${port}/mcp\n`,
      );
      process.stderr.write(
        `[ags-mcp] (Legacy) SSE endpoint: http://localhost:${port}/sse\n`,
      );
      process.stderr.write(
        `[ags-mcp] (Legacy) Message endpoint: http://localhost:${port}/messages\n`,
      );
    });
  } else {
    const transport = new StdioServerTransport();
    transport.onclose = flushOnce;
    await server.connect(transport);
    process.stdin.once("end", flushOnce);
    process.stderr.write(`[ags-mcp] stdio transport connected\n`);
  }
}

main().catch((err) => {
  process.stderr.write(
    `[ags-mcp] fatal: ${err instanceof Error ? err.stack : String(err)}\n`,
  );
  process.exit(1);
});
