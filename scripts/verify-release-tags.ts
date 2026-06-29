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

async function main() {
  if (!(await fs.pathExists(METADATA_PATH))) {
    throw new Error(`Metadata file not found at ${METADATA_PATH}`);
  }

  const metadata = (await fs.readJson(METADATA_PATH)) as RegistryMetadata;
  const categories = metadata.categories ?? {};
  const failures: string[] = [];

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
      `✅ Release tag validation passed for ${Object.keys(categories).length} categories.`,
    ),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(pc.red(`❌ ${message}`));
  process.exit(1);
});
