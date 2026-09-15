import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import yaml from "js-yaml";

/** Where the opt-in came from. */
export type TelemetrySource = "env" | "skillsrc" | "default";

/** Resolved telemetry switch and target file. */
export interface TelemetrySettings {
  enabled: boolean;
  filePath: string;
  source: TelemetrySource;
}

const ON = new Set(["1", "true", "yes", "on"]);
const OFF = new Set(["0", "false", "no", "off"]);

/**
 * Opt-in resolution: AGS_TELEMETRY env (wins), then `.skillsrc`
 * `telemetry: true` in the project root, else off. Path from
 * AGS_TELEMETRY_PATH or ~/.agent-skills-standard/telemetry.jsonl.
 */
export function resolveTelemetry(
  projectRoot: string,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): TelemetrySettings {
  const filePath =
    env.AGS_TELEMETRY_PATH ||
    path.join(home, ".agent-skills-standard", "telemetry.jsonl");
  const flag = (env.AGS_TELEMETRY ?? "").trim().toLowerCase();
  if (ON.has(flag)) return { enabled: true, filePath, source: "env" };
  if (OFF.has(flag)) return { enabled: false, filePath, source: "env" };
  try {
    const file = path.join(projectRoot, ".skillsrc");
    if (fs.existsSync(file)) {
      const parsed = yaml.load(fs.readFileSync(file, "utf8"));
      if (
        parsed &&
        typeof parsed === "object" &&
        (parsed as { telemetry?: unknown }).telemetry === true
      ) {
        return { enabled: true, filePath, source: "skillsrc" };
      }
    }
  } catch {
    // unreadable or malformed config → stay off
  }
  return { enabled: false, filePath, source: "default" };
}
