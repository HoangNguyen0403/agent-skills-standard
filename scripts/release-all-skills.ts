import { execFileSync } from "child_process";
import fs from "fs-extra";
import inquirer from "inquirer";
import path from "path";
import pc from "picocolors";
import { buildTagName } from "./release-utils";

const ROOT_DIR = path.resolve(__dirname, "..");
const METADATA_PATH = path.join(ROOT_DIR, "skills/metadata.json");

async function main() {
  console.log(pc.bold(pc.blue("\n🚀 Agent Skills - Bulk Release Manager\n")));

  if (!fs.existsSync(METADATA_PATH)) {
    console.error(pc.red(`❌ Metadata file not found at ${METADATA_PATH}`));
    process.exit(1);
  }

  const metadata = await fs.readJson(METADATA_PATH);
  const categories = Object.keys(metadata.categories ?? {});
  const releases = Object.keys(metadata.releases ?? {});

  const itemsToRelease: Array<{
    name: string;
    version: string;
    tag_prefix?: string;
  }> = [];

  for (const category of categories) {
    const categoryMetadata = metadata.categories[category];
    itemsToRelease.push({
      name: category,
      version: categoryMetadata.version,
      tag_prefix: categoryMetadata.tag_prefix,
    });
  }

  for (const release of releases) {
    const releaseMetadata = metadata.releases[release];
    itemsToRelease.push({
      name: release,
      version: releaseMetadata.version,
      tag_prefix: releaseMetadata.tag_prefix,
    });
  }

  console.log(
    pc.yellow(
      `Found ${categories.length} categories and ${releases.length} releases to process.`,
    ),
  );

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: `Do you want to release all ${itemsToRelease.length} entries with their current version in metadata.json?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(pc.gray("Release cancelled."));
    return;
  }

  for (const item of itemsToRelease) {
    const { name, version, tag_prefix } = item;
    const tag = buildTagName(tag_prefix, version);

    console.log(
      pc.cyan(`\n📦 Processing ${pc.bold(name)} (v${version})...`),
    );

    try {
      // 1. Check if tag already exists
      const tagExists = execFileSync("git", ["tag", "-l", tag], {
        encoding: "utf8",
      }).trim();

      if (tagExists) {
        console.log(pc.yellow(`⚠️  Tag ${tag} already exists. Skipping...`));
        continue;
      }

      // 2. Create tag
      console.log(pc.gray(`Creating tag: ${tag}`));
      execFileSync("git", [
        "tag",
        tag,
        "-m",
        `release: ${name} v${version}`,
      ]);

      // 3. Push tag
      console.log(pc.gray(`Pushing tag: ${tag}`));
      execFileSync("git", ["push", "origin", tag]);
      console.log(pc.green(`✅ Successfully released ${name} v${version}`));
    } catch (error) {
      console.error(
        pc.red(`❌ Failed to release ${name}:`),
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log(pc.bold(pc.green("\n✨ Bulk release completed!\n")));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
