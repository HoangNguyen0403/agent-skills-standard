/**
 * The `agent-skills-standard-mcp` version this CLI release was built and
 * tested against. Used as the default pin in generated MCP configs so a
 * fresh `ags sync`/`ags init` doesn't emit an unversioned `npx -y
 * agent-skills-standard-mcp`, which would silently pull whatever is latest
 * on npm at the moment the agent starts.
 *
 * Bumped automatically by `scripts/release-mcp.ts` when the MCP package is
 * released and gated in CI, so this pin always matches `mcp/package.json`.
 */
export const MCP_COMPATIBLE_VERSION = '0.8.0';

/**
 * Minimum `agent-skills-standard-mcp` version required for session retrospectives.
 */
export const RETROSPECTIVE_MIN_MCP_VERSION = '0.8.0';
