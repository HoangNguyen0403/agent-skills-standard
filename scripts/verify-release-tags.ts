import fs from "fs-extra";
import path from "path";
import pc from "picocolors";
import { buildTagName } from "./release-utils";

interface CategoryMetadata {
  version?: string;
  tag_prefix?: string;
}

interface RegistryMetadata {
  categories?: Record<string, CategoryMetadata>;
}

const ROOT_DIR = path.resolve(__dirname, "..");
const METADATA_PATH = path.join(ROOT_DIR, "skills/metadata.json");
const PUBLISH_WORKFLOW_PATH = path.join(
  ROOT_DIR,
  ".github/workflows/publish.yml",
);
const ROOT_README_PATH = path.join(ROOT_DIR, "README.md");
const CLI_README_PATH = path.join(ROOT_DIR, "cli/README.md");

/**
 * Both READMEs hand-maintain their own "Current release" line for the same
 * `agent-skills-standard` CLI package — root README.md for GitHub,
 * cli/README.md because npm renders the package's own README, not the repo
 * root's. Nothing keeps them in sync: cli/README.md was found three releases
 * behind (`v2.5.1` while the repo was on `cli-v2.6.2`), and that stale copy is
 * exactly what ends up on npmjs.com once publish succeeds.
 */
async function readCurrentReleaseTag(
  filePath: string,
): Promise<string | null> {
  if (!(await fs.pathExists(filePath))) return null;
  const content = await fs.readFile(filePath, "utf8");
  const match = content.match(/\*\*Current release:\*\*\s*`([^`]+)`/);
  return match ? match[1] : null;
}

/**
 * `publish.yml` triggers on an explicit list of tag globs. A category whose
 * prefix is missing from that list can be tagged and pushed successfully while
 * the release job never runs — no version validation, no GitHub Release, no
 * error. That silence is why this is checked rather than trusted: adding a
 * category to metadata.json must also reach the publish trigger.
 *
 * A blanket `*-v*` glob is not an option: it would also match unrelated tags
 * such as `skillspector-verified-v<date>`, whose category lookup would fail the
 * release job.
 */
async function publishTriggerPatterns(): Promise<string[] | null> {
  if (!(await fs.pathExists(PUBLISH_WORKFLOW_PATH))) return null;
  const content = await fs.readFile(PUBLISH_WORKFLOW_PATH, "utf8");
  const triggerBlock = content.split(/^permissions:/m)[0] ?? "";
  return [...triggerBlock.matchAll(/^\s+-\s+'([^']+)'/gm)].map(
    (match) => match[1],
  );
}

async function main() {
  if (!(await fs.pathExists(METADATA_PATH))) {
    throw new Error(`Metadata file not found at ${METADATA_PATH}`);
  }

  const metadata = (await fs.readJson(METADATA_PATH)) as RegistryMetadata;
  const categories = metadata.categories ?? {};
  const failures: string[] = [];
  const patterns = await publishTriggerPatterns();

  for (const [category, config] of Object.entries(categories)) {
    if (!config.version) {
      failures.push(`${category}: missing version`);
      continue;
    }

    if (!config.tag_prefix) {
      failures.push(`${category}: missing tag_prefix`);
      continue;
    }

    const tagName = buildTagName(config.tag_prefix, config.version);
    if (!tagName.startsWith(config.tag_prefix)) {
      failures.push(
        `${category}: tag "${tagName}" does not start with "${config.tag_prefix}"`,
      );
    }

    if (!tagName.endsWith(config.version)) {
      failures.push(
        `${category}: tag "${tagName}" does not end with version "${config.version}"`,
      );
    }

    if (patterns && !patterns.includes(`${config.tag_prefix}*`)) {
      failures.push(
        `${category}: .github/workflows/publish.yml has no trigger for "${config.tag_prefix}*" — ` +
          `releasing this category would push a tag that publishes nothing`,
      );
    }
  }

  if (patterns === null) {
    console.warn(
      pc.yellow(
        "⚠️  .github/workflows/publish.yml not found — skipped publish-trigger coverage check.",
      ),
    );
  } else {
    const knownPrefixes = new Set([
      ...Object.values(categories).map((config) => `${config.tag_prefix}*`),
      "cli-v*",
      "mcp-v*",
    ]);
    for (const pattern of patterns) {
      if (!knownPrefixes.has(pattern)) {
        console.warn(
          pc.yellow(
            `⚠️  publish.yml triggers on "${pattern}", which matches no category in metadata.json (dead pattern).`,
          ),
        );
      }
    }
  }

  const rootReleaseTag = await readCurrentReleaseTag(ROOT_README_PATH);
  const cliReleaseTag = await readCurrentReleaseTag(CLI_README_PATH);
  if (rootReleaseTag === null) {
    failures.push(`README.md: missing a "**Current release:** \`...\`" line`);
  } else if (cliReleaseTag === null) {
    failures.push(`cli/README.md: missing a "**Current release:** \`...\`" line`);
  } else if (rootReleaseTag !== cliReleaseTag) {
    failures.push(
      `README.md says the current release is "${rootReleaseTag}" but cli/README.md says "${cliReleaseTag}" — ` +
        `npm renders cli/README.md, so this is what ships to npmjs.com. Update both together.`,
    );
  }

  if (failures.length > 0) {
    console.error(pc.red("❌ Release tag validation failed:"));
    for (const failure of failures) {
      console.error(pc.red(`- ${failure}`));
    }
    process.exit(1);
  }

  console.log(
    pc.green(
      `✅ Release tag validation passed for ${Object.keys(categories).length} categories, each reachable from publish.yml, and README.md/cli/README.md agree on "${rootReleaseTag}".`,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(pc.red(`❌ ${message}`));
  process.exit(1);
});
