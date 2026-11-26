import { updateCLIVersion } from "../release-utils";
import {
  type HookSyncResult,
  loadCanonicalHookTemplate,
  syncGeneratedHooks,
} from "./sync-generated-hooks";

/**
 * Prepares the local state for a CLI release without publishing anything:
 * version surfaces plus the tracked hook copies whose embedded version marker
 * would otherwise stay on the previous release.
 *
 * Release effects (build, commit, tag, push) stay in scripts/release-cli.ts.
 */
export async function prepareCliReleaseVersion(
  rootDir: string,
  version: string,
  opts: { template?: string } = {},
): Promise<HookSyncResult> {
  await updateCLIVersion(rootDir, version);
  const template = opts.template ?? (await loadCanonicalHookTemplate());
  return syncGeneratedHooks({ rootDir, version, template });
}
