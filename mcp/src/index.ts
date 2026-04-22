#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server";
import { resolveConfig } from "./config";

async function main() {
  const config = await resolveConfig();
  // Log to stderr — stdout is reserved for MCP JSON-RPC frames.
  if (config.skillsDir) {
    process.stderr.write(`[ags-mcp] serving skills from ${config.skillsDir}\n`);
  } else {
    process.stderr.write(
      `[ags-mcp] no skills installed yet (${config.setup.kind}). Tools will return setup guidance until you run \`agent-skills-standard sync\`.\n`,
    );
  }

  const server = await buildServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(
    `[ags-mcp] fatal: ${err instanceof Error ? err.stack : String(err)}\n`,
  );
  process.exit(1);
});
