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

  if (failures.length > 0) {
    console.error(pc.red("❌ Release tag validation failed:"));
    for (const failure of failures) {
      console.error(pc.red(`- ${failure}`));
    }
    process.exit(1);
  }

  console.log(
    pc.green(
      `✅ Release tag validation passed for ${Object.keys(categories).length} categories, each reachable from publish.yml.`,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(pc.red(`❌ ${message}`));
  process.exit(1);
});
