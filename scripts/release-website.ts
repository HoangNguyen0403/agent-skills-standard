import { execFileSync } from "child_process";
import fs from "fs-extra";
import inquirer from "inquirer";
import path from "path";
import pc from "picocolors";
import {
  getGitLogs,
  getSmartChangelog,
  updateChangelog,
} from "./release-utils";

const ROOT_DIR = path.resolve(__dirname, "..");
const WEBSITE_DIR = path.join(ROOT_DIR, "website");
const PACKAGE_JSON_PATH = path.join(WEBSITE_DIR, "package.json");
const CHANGELOG_PATH = path.join(ROOT_DIR, "CHANGELOG.md");
const TAG_PREFIX = "website-v";
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

/** Interactive semver choice displayed by inquirer. */
export interface VersionChoice {
  readonly name: string;
  readonly value: string;
}

/** Input options used to construct a deterministic website release plan. */
export interface WebsiteReleasePlanInput {
  readonly currentVersion: string;
  readonly nextVersion: string;
  readonly notes?: string;
  readonly hasChangelog?: boolean;
}

/** Deterministic release plan for previewing or executing a website tag release. */
export interface WebsiteReleasePlan {
  readonly currentVersion: string;
  readonly nextVersion: string;
  readonly tagName: string;
  readonly commitMessage: string;
  readonly filesToStage: readonly string[];
  readonly notes: string;
  readonly pushCommands: readonly (readonly string[])[];
}

/** Parsed CLI flags for scripts/release-website.ts. */
export interface CliOptions {
  readonly dryRun: boolean;
  readonly noEdit: boolean;
  readonly noChangelog: boolean;
  readonly version?: string;
}

/** Validates and splits a strict X.Y.Z semver string. */
export function parseSemver(version: string): [number, number, number] {
  if (!SEMVER_PATTERN.test(version)) {
    throw new Error(`Invalid semver "${version}". Format must be X.Y.Z`);
  }
  const [major, minor, patch] = version.split(".").map(Number);
  return [major, minor, patch];
}

/** Builds interactive semver bump options for the website package. */
export function buildWebsiteVersionChoices(
  currentVersion: string,
): VersionChoice[] {
  const [major, minor, patch] = parseSemver(currentVersion);
  return [
    {
      name: `Patch (${major}.${minor}.${patch + 1})`,
      value: `${major}.${minor}.${patch + 1}`,
    },
    {
      name: `Minor (${major}.${minor + 1}.0)`,
      value: `${major}.${minor + 1}.0`,
    },
    {
      name: `Major (${major + 1}.0.0)`,
      value: `${major + 1}.0.0`,
    },
    { name: "Custom Input", value: "custom" },
  ];
}

/** Formats the Cloudflare Pages deployment trigger tag for a validated version. */
export function buildWebsiteTagName(version: string): string {
  parseSemver(version);
  return `${TAG_PREFIX}${version}`;
}

/** Returns only explicit release artifacts to stage (never `git add .`). */
export function resolveFilesToStage(hasChangelogUpdate: boolean): string[] {
  return hasChangelogUpdate
    ? ["website/package.json", "CHANGELOG.md"]
    : ["website/package.json"];
}

/** Builds the deterministic release plan used for dry-run preview and execution. */
export function buildWebsiteReleasePlan(
  input: WebsiteReleasePlanInput,
): WebsiteReleasePlan {
  parseSemver(input.currentVersion);
  parseSemver(input.nextVersion);
  const tagName = buildWebsiteTagName(input.nextVersion);
  const notes = input.notes ?? "";
  const hasChangelogUpdate = input.hasChangelog ?? notes.trim().length > 0;

  return {
    currentVersion: input.currentVersion,
    nextVersion: input.nextVersion,
    tagName,
    commitMessage: `chore(release): ${tagName}`,
    filesToStage: resolveFilesToStage(hasChangelogUpdate),
    notes,
    pushCommands: [
      ["git", "push"],
      ["git", "push", "origin", tagName],
    ],
  };
}

function parseCliArgs(argv: readonly string[]): CliOptions {
  let version: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--version=")) {
      version = arg.slice("--version=".length);
    } else if (arg === "--version") {
      const nextArg = argv[i + 1];
      if (!nextArg || nextArg.startsWith("-")) {
        throw new Error("Missing value for --version. Format must be X.Y.Z");
      }
      version = nextArg;
      i += 1;
    }
  }

  if (version !== undefined) {
    parseSemver(version);
  }

  return {
    dryRun: argv.includes("--dry-run"),
    noEdit: argv.includes("--no-edit"),
    noChangelog:
      argv.includes("--no-changelog") || argv.includes("--skip-changelog"),
    version,
  };
}

async function resolveNextVersion(
  currentVersion: string,
  cliVersion?: string,
): Promise<string> {
  if (cliVersion !== undefined) {
    parseSemver(cliVersion);
    return cliVersion;
  }

  const choices = buildWebsiteVersionChoices(currentVersion);
  const { nextVersion } = await inquirer.prompt<{ nextVersion: string }>([
    {
      type: "rawlist",
      name: "nextVersion",
      message: "Select release type:",
      choices,
    },
  ]);

  if (nextVersion !== "custom") {
    return nextVersion;
  }

  const { customVer } = await inquirer.prompt<{ customVer: string }>([
    {
      type: "input",
      name: "customVer",
      message: "Enter version (X.Y.Z):",
      default: currentVersion,
      validate: (input: string) =>
        SEMVER_PATTERN.test(input) ? true : "Format must be X.Y.Z",
    },
  ]);
  return customVer;
}

function buildDefaultNotes(currentVersion: string): string {
  try {
    const prevTag = buildWebsiteTagName(currentVersion);
    const logs = getGitLogs(prevTag, "website/");
    return logs ? getSmartChangelog(logs) : "### Initial Website Release";
  } catch {
    return "### Website Update";
  }
}

async function resolveChangelogNotes(
  currentVersion: string,
  options: CliOptions,
): Promise<{ notes: string; hasChangelog: boolean }> {
  if (options.noChangelog || !fs.existsSync(CHANGELOG_PATH)) {
    return { notes: "", hasChangelog: false };
  }

  const { shouldUpdateChangelog } = await inquirer.prompt<{
    shouldUpdateChangelog: boolean;
  }>([
    {
      type: "confirm",
      name: "shouldUpdateChangelog",
      message: "Update CHANGELOG.md?",
      default: true,
    },
  ]);

  if (!shouldUpdateChangelog) {
    return { notes: "", hasChangelog: false };
  }

  const defaultNotes = buildDefaultNotes(currentVersion);
  if (options.noEdit) {
    return {
      notes: defaultNotes,
      hasChangelog: defaultNotes.trim().length > 0,
    };
  }

  const { notes } = await inquirer.prompt<{ notes: string }>([
    {
      type: "editor",
      name: "notes",
      message:
        "Enter release notes (markdown supported, close editor to save):",
      default: defaultNotes,
    },
  ]);

  return { notes, hasChangelog: notes.trim().length > 0 };
}

function printReleasePlan(plan: WebsiteReleasePlan): void {
  console.log(pc.bold(pc.yellow("\n👀 Release Plan:")));
  console.log(
    `   Version: ${plan.currentVersion} -> ${pc.green(plan.nextVersion)}`,
  );
  console.log(`   Tag: ${pc.cyan(plan.tagName)}`);
  console.log(`   Files: ${plan.filesToStage.join(", ")}`);
  console.log(`   Commit: ${plan.commitMessage}`);
  console.log(
    `   Push: ${plan.pushCommands.map((cmd) => cmd.join(" ")).join(" && ")}`,
  );
}

function gitRun(args: readonly string[]): void {
  execFileSync("git", [...args], { cwd: ROOT_DIR, stdio: "inherit" });
}

async function createOrUpdateTag(tagName: string): Promise<void> {
  try {
    execFileSync("git", ["rev-parse", tagName], {
      cwd: ROOT_DIR,
      stdio: "ignore",
    });
    console.log(pc.yellow(`\n⚠️  Tag ${tagName} already exists locally.`));
    const { overwriteTag } = await inquirer.prompt<{ overwriteTag: boolean }>([
      {
        type: "confirm",
        name: "overwriteTag",
        message: "Force recreate tag?",
        default: false,
      },
    ]);
    if (overwriteTag) {
      gitRun(["tag", "-f", tagName]);
    } else {
      console.log(pc.yellow("Using existing tag."));
    }
  } catch {
    gitRun(["tag", tagName]);
  }
}

async function executeRelease(
  pkg: Record<string, unknown>,
  plan: WebsiteReleasePlan,
  hasChangelog: boolean,
): Promise<void> {
  pkg.version = plan.nextVersion;
  await fs.writeJson(PACKAGE_JSON_PATH, pkg, { spaces: 2 });

  if (hasChangelog && plan.notes) {
    await updateChangelog(CHANGELOG_PATH, plan.tagName, "Website", plan.notes);
  }

  console.log(pc.gray("\n📦 Preparing git commit..."));
  gitRun(["add", ...plan.filesToStage]);

  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: ROOT_DIR,
    encoding: "utf-8",
  });

  if (staged.trim().length > 0) {
    gitRun(["commit", "-m", plan.commitMessage]);
  } else {
    console.log(pc.yellow("  (No changes to commit)"));
  }

  await createOrUpdateTag(plan.tagName);

  console.log(pc.cyan("\n⚠️  Pushing to remote..."));
  for (const [, ...gitArgs] of plan.pushCommands) {
    gitRun(gitArgs);
  }

  console.log(
    pc.bold(pc.magenta(`\n🎉 Website Release ${plan.tagName} triggered!`)),
  );
  console.log(
    pc.gray(
      "The GitHub Action (.github/workflows/deploy-website.yml) will verify and deploy to Cloudflare Pages.\n",
    ),
  );
}

/** Interactive and `--dry-run` CLI entrypoint for `website-v*` releases. */
export async function main(
  argv: readonly string[] = process.argv.slice(2),
): Promise<void> {
  const options = parseCliArgs(argv);

  console.log(
    pc.bold(pc.blue("\n🚀 Agent Skills Website - Release Manager\n")),
  );
  if (options.dryRun) {
    console.log(pc.magenta("🔍 DRY RUN MODE ENABLED"));
  }

  if (!fs.existsSync(PACKAGE_JSON_PATH)) {
    throw new Error(`Missing website package.json at ${PACKAGE_JSON_PATH}`);
  }

  const pkg = (await fs.readJson(PACKAGE_JSON_PATH)) as Record<string, unknown>;
  const currentVersion = pkg.version;
  if (typeof currentVersion !== "string") {
    throw new Error("website/package.json is missing a string version field");
  }
  parseSemver(currentVersion);

  console.log(pc.gray(`\nCurrent Website version: ${currentVersion}`));

  const nextVersion = await resolveNextVersion(currentVersion, options.version);
  const { notes, hasChangelog } = await resolveChangelogNotes(
    currentVersion,
    options,
  );
  const plan = buildWebsiteReleasePlan({
    currentVersion,
    nextVersion,
    notes,
    hasChangelog,
  });

  printReleasePlan(plan);

  if (options.dryRun) {
    console.log(pc.magenta("\n✨ Dry run complete."));
    return;
  }

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
    {
      type: "confirm",
      name: "confirm",
      message: `Execute website release for ${pc.green(plan.tagName)}?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(pc.yellow("Cancelled."));
    return;
  }

  await executeRelease(pkg, plan, hasChangelog);
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(pc.red(`\n❌ Release operation failed: ${message}`));
    process.exit(1);
  });
}
