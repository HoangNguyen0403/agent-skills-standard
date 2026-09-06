/**
 * The `agent-skills-standard-mcp` version this CLI release was built and
 * tested against. Used as the default pin in generated MCP configs so a
 * fresh `ags sync`/`ags init` doesn't emit an unversioned `npx -y
 * agent-skills-standard-mcp`, which would silently pull whatever is latest
 * on npm at the moment the agent starts.
 *
 * Bump this alongside mcp/package.json's version when releasing — there is
 * no automated sync between the two (mirrors how skills/metadata.json
 * category versions are maintained today).
 */
export const MCP_COMPATIBLE_VERSION = '0.6.0';
