/**
 * MCP version truth gate.
 *
 * `mcp/package.json` is the single source of truth for the server version.
 * This gate fails when:
 *   1. `cli/src/constants/mcp.ts`'s `MCP_COMPATIBLE_VERSION` pin drifts from
 *      `mcp/package.json` (the pin is the default spec in generated configs).
 *   2. `mcp/src/server.ts` stops deriving `SERVER_VERSION` from the package
 *      manifest — e.g. someone reintroduces a hardcoded semver literal, which
 *      would silently desync `--version` and telemetry records.
 *
 * Usage:
 *   pnpm check:mcp-version
 */
import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";

const ROOT_DIR = path.join(__dirname, "..");
const MCP_PACKAGE_PATH = path.join(ROOT_DIR, "mcp", "package.json");
const CLI_CONSTANTS_PATH = path.join(
  ROOT_DIR,
  "cli",
  "src",
  "constants",
  "mcp.ts",
);
const SERVER_SOURCE_PATH = path.join(ROOT_DIR, "mcp", "src", "server.ts");

const SEMVER = /^\d+\.\d+\.\d+$/;
/** Binds the pinned constant — the pin lives in the CLI's constants module. */
const CLI_PIN = /export const MCP_COMPATIBLE_VERSION\s*=\s*['"]([^'"]+)['"]/;
/** `import pkg from "../package.json"` (any local identifier). */
const PACKAGE_IMPORT =
  /import\s+([A-Za-z_$][\w$]*)\s+from\s+["'][^"']*package\.json["']/;
/** `export const SERVER_VERSION = pkg.version;` */
const DERIVED_VERSION =
  /export const SERVER_VERSION(?:\s*:\s*[^=]+)?\s*=\s*([A-Za-z_$][\w$]*)\.version\s*;/;
/** `export const SERVER_VERSION = "0.8.0";` — the regression we guard against. */
const HARDCODED_VERSION =
  /export const SERVER_VERSION(?:\s*:\s*[^=]+)?\s*=\s*["'`]?\d+\.\d+\.\d+/;

/** Reads the manifest version without trusting its shape. */
function manifestVersion(): string | null {
  const manifest: unknown = JSON.parse(
    fs.readFileSync(MCP_PACKAGE_PATH, "utf8"),
  );
  if (
    manifest === null ||
    typeof manifest !== "object" ||
    !("version" in manifest) ||
    typeof manifest.version !== "string"
  ) {
    return null;
  }
  return manifest.version;
}

function relative(filePath: string): string {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join("/");
}

/** Returns every violation found; an empty array means the versions agree. */
export function checkMcpVersionSync(): string[] {
  const errors: string[] = [];

  const version = manifestVersion();
  if (version === null) {
    errors.push(
      `${relative(MCP_PACKAGE_PATH)} has no string "version" — it is the single source of truth.`,
    );
  } else if (!SEMVER.test(version)) {
    errors.push(
      `${relative(MCP_PACKAGE_PATH)} version '${version}' is not a plain X.Y.Z semver.`,
    );
  }

  const pin = CLI_PIN.exec(fs.readFileSync(CLI_CONSTANTS_PATH, "utf8"));
  if (!pin) {
    errors.push(
      `${relative(CLI_CONSTANTS_PATH)} is missing "export const MCP_COMPATIBLE_VERSION = '<version>'" — the CLI pin cannot be verified.`,
    );
  } else if (version !== null && pin[1] !== version) {
    errors.push(
      `MCP_COMPATIBLE_VERSION is '${pin[1]}' in ${relative(CLI_CONSTANTS_PATH)} but ${relative(MCP_PACKAGE_PATH)} version is '${version}'. Bump the CLI pin alongside the MCP release (pnpm mcp:release rewrites both).`,
    );
  }

  const server = fs.readFileSync(SERVER_SOURCE_PATH, "utf8");
  const importMatch = PACKAGE_IMPORT.exec(server);
  const derived = DERIVED_VERSION.exec(server);

  if (HARDCODED_VERSION.test(server)) {
    errors.push(
      `${relative(SERVER_SOURCE_PATH)} hardcodes a semver literal for SERVER_VERSION. Derive it from package.json (\`export const SERVER_VERSION = pkg.version\`) so the bundled version cannot drift.`,
    );
  } else if (!importMatch) {
    errors.push(
      `${relative(SERVER_SOURCE_PATH)} does not import ../package.json — SERVER_VERSION must be baked from the manifest at build time.`,
    );
  } else if (!derived) {
    errors.push(
      `${relative(SERVER_SOURCE_PATH)} does not assign SERVER_VERSION from a package.json import (\`export const SERVER_VERSION = pkg.version\`).`,
    );
  } else if (derived[1] !== importMatch[1]) {
    errors.push(
      `${relative(SERVER_SOURCE_PATH)} builds SERVER_VERSION from "${derived[1]}.version" but imports package.json as "${importMatch[1]}". Use the imported manifest.`,
    );
  }

  return errors;
}

function main(): void {
  const errors = checkMcpVersionSync();
  if (errors.length > 0) {
    console.error(
      pc.red(`\n❌ MCP version sync check failed (${errors.length} issue(s)):`),
    );
    for (const error of errors) console.error(pc.red(`   - ${error}`));
    console.error("");
    process.exit(1);
  }
  console.log(
    pc.green(
      `✅ MCP version sync OK (mcp/package.json = ${manifestVersion()})`,
    ),
  );
}

main();
