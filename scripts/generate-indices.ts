import fs from 'fs-extra';
import * as yaml from 'js-yaml';
import path from 'path';
import { Agent, getAgentDefinition } from '../cli/src/constants';
import { AgentBridgeService } from '../cli/src/services/AgentBridgeService';
import { IndexGeneratorServiceImpl } from '../cli/src/services/IndexGeneratorServiceImpl';
import { MarkdownUtils } from '../cli/src/services/utils/MarkdownUtils';
import { SpecialistSyncService } from '../cli/src/services/SpecialistSyncService';
import { ConfigService } from '../cli/src/services/ConfigService';
import { SyncService } from '../cli/src/services/SyncService';
import { CollectedSkill, RegistryMetadata } from '../cli/src/models/types';

function getFirstLine(text: string): string {
  if (!text) return "";
  return text.split("\n")[0];
}

async function collectLocalSkill(
  category: string,
  skillName: string,
  skillPath: string,
): Promise<CollectedSkill | null> {
  if (
    !(await fs.pathExists(skillPath)) ||
    !(await fs.pathExists(path.join(skillPath, "SKILL.md")))
  ) {
    return null;
  }

  const files: CollectedSkill["files"] = [];
  async function readDirRecursive(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await readDirRecursive(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;

      const relPath = path.relative(skillPath, fullPath).replace(/\\/g, "/");
      if (
        relPath !== "SKILL.md" &&
        !/^(references|scripts|assets)\//.test(relPath) &&
        !/^(LICENSE|NOTICE)(?:\.(?:md|txt))?$/i.test(relPath)
      ) {
        continue;
      }

      const bytes = await fs.readFile(fullPath);
      files.push({ name: relPath, content: bytes.toString("utf8"), bytes });
    }
  }

  await readDirRecursive(skillPath);
  const repositoryRoot = path.resolve(skillPath, "../../..");
  const rootEntries = await fs.readdir(repositoryRoot, {
    withFileTypes: true,
  });
  for (const entry of rootEntries) {
    if (
      !entry.isFile() ||
      !/^(LICENSE|NOTICE)(?:\.(?:md|txt))?$/i.test(entry.name)
    ) {
      continue;
    }
    if (
      files.some((file) => file.name.toLowerCase() === entry.name.toLowerCase())
    ) {
      continue;
    }
    const bytes = await fs.readFile(path.join(repositoryRoot, entry.name));
    files.push({ name: entry.name, content: bytes.toString("utf8"), bytes });
  }

  files.sort((left, right) => left.name.localeCompare(right.name));
  return { category, skill: skillName, files };
}

interface SkillMetadata {
  name: string;
  description: string;
  priority: string;
}

async function parseSkill(skillPath: string): Promise<SkillMetadata | null> {
  try {
    const content = await fs.readFile(skillPath, "utf8");
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) return null;

    const fm = yaml.load(frontmatterMatch[1]) as unknown as {
      name?: string;
      description?: string;
    };
    const body = frontmatterMatch[2];

    const priorityMatch = body.match(/## \*\*Priority:\s*([^*]+)\*\*/);
    const priority = priorityMatch ? priorityMatch[1].trim() : "P1";

    return {
      name: fm.name || "",
      description: fm.description || "",
      priority,
    };
  } catch {
    return null;
  }
}

async function generate() {
  // Look for skills directory in the repository root
  const repoRoot = await fs.realpath(path.resolve(__dirname, ".."));
  const physicalCwd = await fs.realpath(process.cwd());

  // Invariant (Task 1): Fail generator before mutation when physical cwd differs from script-derived authoring root
  if (physicalCwd !== repoRoot) {
    throw new Error(
      `Refusing to generate indices from foreign working directory: cwd is "${physicalCwd}", but script root is "${repoRoot}". Run from the repository root.`,
    );
  }

  const skillsDir = path.join(repoRoot, "skills");

  // Boundary: this generator mutates the authoring checkout and derives force
  // paths from its own configuration. Running it from a consumer project would
  // read that project's `.skillsrc` and force writes into its tree, so refuse
  // before any index/write happens. Compare realpaths to reject symlinked or
  // relative foreign working directories.
  const authoringRoot = await fs.realpath(repoRoot);
  const invocationCwd = await fs.realpath(process.cwd());
  if (invocationCwd !== authoringRoot) {
    throw new Error(
      `generate-indices must run from the authoring repository root (${authoringRoot}); refusing to run from ${invocationCwd}`,
    );
  }

  if (!(await fs.pathExists(skillsDir))) {
    throw new Error(`Skills directory not found at ${skillsDir}`);
  }
  const categories = (await fs.readdir(skillsDir)).filter((f) => {
    const p = path.join(skillsDir, f);
    return fs.statSync(p).isDirectory() && !f.startsWith(".");
  });

  const frameworkIndices: Record<string, string> = {};

  for (const category of categories) {
    const categoryPath = path.join(skillsDir, category);
    const skills = await fs.readdir(categoryPath);
    const entries: string[] = [];

    for (const skill of skills) {
      const skillPath = path.join(categoryPath, skill, "SKILL.md");
      if (!(await fs.pathExists(skillPath))) continue;

      const metadata = await parseSkill(skillPath);
      if (metadata) {
        const id = `${category}/${skill}`;

        const prefix = metadata.priority.startsWith("P0") ? "🚨 " : "";

        let desc = metadata.description || "";
        // Wrap triggers in backticks to prevent prettier/markdownlint from parsing globs as emphasis
        desc = desc.replace(/\(triggers:\s*`?(.*?)`?\)/g, "(triggers: `$1`)");

        const content = `${prefix}${desc}`.trim();
        entries.push(`- **[${id}]**: ${content}`);
      }
    }

    if (entries.length > 0) {
      frameworkIndices[category] = entries.join("\n");
    }
  }

  const indexPath = path.join(skillsDir, "index.json");
  await fs.writeJson(indexPath, frameworkIndices, { spaces: 2 });
  console.log(
    `✅ Generated indices for ${Object.keys(frameworkIndices).length} frameworks in skills/index.json`,
  );

  const generator = new IndexGeneratorServiceImpl();

  // Generate per-category _INDEX.md files
  const categoryIndices = await generator.generateAllCategoryIndices(skillsDir);
  for (const [category, indexContent] of Object.entries(categoryIndices)) {
    const indexMdPath = path.join(skillsDir, category, "_INDEX.md");
    await fs.writeFile(indexMdPath, indexContent, "utf8");
  }
  console.log(
    `✅ Generated _INDEX.md for ${Object.keys(categoryIndices).length} categories`,
  );

  // Generate AGENTS.md — router-style index (compact, scalable)
  const routerIndexContent = await generator.assembleRouterIndex(skillsDir);
  await MarkdownUtils.injectIndex(repoRoot, ["AGENTS.md"], routerIndexContent);

  console.log("✅ Updated AGENTS.md in repo root (Router-style)");

  const configService = new ConfigService();
  const syncService = new SyncService();
  const config = await configService.loadConfig();
  const localMetadata = (await fs.readJson(
    path.join(skillsDir, "metadata.json"),
  )) as RegistryMetadata;

  // Use the same resolution logic as the CLI (config > detection > empty)
  const agents = config ? await syncService.resolveTargetAgents(config) : [];

  if (agents.length > 0) {
    const bridgeService = new AgentBridgeService();
    await bridgeService.bridge(repoRoot, agents);
    console.log(`✅ Updated agent rule files for: ${agents.join(", ")}`);
  } else {
    console.log("ℹ️ No active agents detected, skipping rule file updates.");
  }

  // Update README.md with human-readable index
  const readmePath = path.join(skillsDir, "README.md");
  if (await fs.pathExists(readmePath)) {
    let readmeContent = await fs.readFile(readmePath, "utf8");

    const categoryRegex = /### ([^\n]+)\n\n([^\n]+)\n/g;
    let match;
    const categoryMetadata: Record<string, { title: string; desc: string }> =
      {};
    while ((match = categoryRegex.exec(readmeContent)) !== null) {
      const title = match[1];
      const desc = match[2];

      let keyMatch = title.match(/([A-Za-z]+) \(/);
      if (!keyMatch) {
        keyMatch = title.match(/([A-Za-z]+)$/);
      }
      let key = keyMatch ? keyMatch[1].toLowerCase() : null;

      if (title.includes("Quality Engineering")) key = "quality-engineering";
      if (title.includes("Spring Boot")) key = "spring-boot";
      if (title.includes("Next.js")) key = "nextjs";
      if (title.includes("React Native")) key = "react-native";
      if (title.includes("Database")) key = "database";

      if (key) {
        categoryMetadata[key] = { title, desc };
      }
    }

    for (const cat of categories) {
      if (!categoryMetadata[cat]) {
        categoryMetadata[cat] = {
          title: cat.charAt(0).toUpperCase() + cat.slice(1),
          desc: `Standards for ${cat}.`,
        };
      }
    }

    let generatedIndex = "";

    for (const [cat, meta] of Object.entries(categoryMetadata)) {
      const catPath = path.join(skillsDir, cat);
      if (!(await fs.pathExists(catPath))) continue;

      const catSkills = await fs.readdir(catPath);
      const skillEntries: string[] = [];

      for (const skill of catSkills) {
        if (skill.startsWith(".")) continue;
        const skillPath = path.join(catPath, skill, "SKILL.md");
        if (!(await fs.pathExists(skillPath))) continue;

        const info = await parseSkill(skillPath);
        if (info) {
          let formattedName = skill;
          if (formattedName.startsWith(cat + "-")) {
            formattedName = formattedName.substring(cat.length + 1);
          }
          formattedName = formattedName
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

          const relPath = `${cat}/${skill}/SKILL.md`;
          const p = info.priority.split(" ")[0];
          const desc = getFirstLine(info.description);

          skillEntries.push(
            `- [**${formattedName}**](${relPath}) (${p}) - ${desc}`,
          );
        }
      }

      if (skillEntries.length > 0) {
        generatedIndex += `### ${meta.title}\n\n${meta.desc}\n\n`;
        skillEntries.sort((a, b) => {
          const pa = a.match(/\((P[0-9])\)/);
          const pb = b.match(/\((P[0-9])\)/);
          const pra = pa ? pa[1] : "P9";
          const prb = pb ? pb[1] : "P9";
          if (pra !== prb) return pra.localeCompare(prb);
          return a.localeCompare(b);
        });
        generatedIndex += skillEntries.join("\n") + "\n\n";
      }
    }

    const markerStart = "<!-- SKILLS_INDEX_START -->";
    const markerEnd = "<!-- SKILLS_INDEX_END -->";

    const startIndex = readmeContent.indexOf(markerStart);
    const endIndex = readmeContent.indexOf(markerEnd);

    if (startIndex !== -1 && endIndex !== -1) {
      const pre = readmeContent.substring(0, startIndex + markerStart.length);
      const post = readmeContent.substring(endIndex);
      readmeContent = `${pre}\n${generatedIndex.trim()}\n${post}`;
      await fs.writeFile(readmePath, readmeContent, "utf8");
      console.log("✅ Updated skills/README.md with auto-generated index");
    }
  }

  // These native indices are tracked generator outputs, not lockfile-owned
  // consumer files. Refresh them before ownership starts; the owned pass below
  // records their resulting bytes without forcing unknown files.
  if (
    agents.length > 0 &&
    config &&
    !(await fs.pathExists(path.join(repoRoot, ".skills-lock.json")))
  ) {
    await syncService.applyIndices(config, agents, localMetadata);
    await MarkdownUtils.injectIndex(
      repoRoot,
      ["AGENTS.md"],
      routerIndexContent,
    );
  }

  // Local Sync Phase: sync through the ownership lifecycle so removed members
  // of still-selected categories are pruned only when previously owned.
  if (agents.length > 0 && config) {
    try {
      const localWorkflowsDir = path.join(repoRoot, ".agents/workflows");
      let workflowFiles: string[] = [];
      if ((await fs.pathExists(localWorkflowsDir)) && config.workflows) {
        workflowFiles = (await fs.readdir(localWorkflowsDir)).filter((f) =>
          f.endsWith(".md"),
        );
        if (Array.isArray(config.workflows)) {
          const allowed = config.workflows as string[];
          workflowFiles = workflowFiles.filter((f) =>
            allowed.includes(path.basename(f, ".md")),
          );
        }
      }

      // Checked-in repositories commit the generated workflow mirrors without
      // lockfile provenance, so ownership treats them as unowned/edited and
      // silently skips them. Force exactly the deterministic export paths of
      // the selected canonical workflows (no user-authored source is listed);
      // the ownership writer still backs up before replacing.
      //
      // The canonical catalog itself is never forced: `.agents/workflows` is
      // authored source for this checkout, including the Antigravity/Kiro
      // `native` destination that resolves to the same path. A native export
      // whose bytes already equal the canonical body needs no write.
      const canonicalWorkflowExports = new Set(
        workflowFiles.map((wfFile) =>
          path.posix.join(".agents/workflows", wfFile),
        ),
      );
      const forcedWorkflowExports = workflowFiles.flatMap((wfFile) => {
        const baseName = path.basename(wfFile, ".md");
        return agents.flatMap((agent) => {
          const definition = getAgentDefinition(agent);
          if (!definition?.workflowPath) return [];
          const exportPath = (relative: string) =>
            path.posix.join(definition.workflowPath, relative);
          const candidates = (() => {
            switch (definition.workflowFormat) {
              case "command":
                return [exportPath(`${baseName}.md`)];
              case "toml":
                return [exportPath(`${baseName}.toml`)];
              case "prompt":
                return [exportPath(`${baseName}.prompt.md`)];
              case "skill":
                return [exportPath(`${baseName}/SKILL.md`)];
              case "native":
                return [exportPath(`${baseName}.md`)];
              default:
                return [];
            }
          })();
          return candidates.filter(
            (candidate) =>
              !canonicalWorkflowExports.has(candidate) &&
              !candidate.startsWith(".agents/workflows/"),
          );
        });
      });

      await syncService.beginInstall(config, {
        dryRun: false,
        force: forcedWorkflowExports,
      });
      const collectedWorkflows: CollectedSkill[] = [];
      const collectedSkills: CollectedSkill[] = [];

      if (workflowFiles.length > 0) {
        collectedWorkflows.push({
          category: ".agents",
          skill: "workflows",
          files: await Promise.all(
            workflowFiles.map(async (wfFile) => ({
              name: wfFile,
              content: await fs.readFile(
                path.join(localWorkflowsDir, wfFile),
                "utf8",
              ),
            })),
          ),
        });
        await syncService.writeWorkflows(collectedWorkflows, config);
        console.log(
          `✅ Synced ${workflowFiles.length} local workflows to target agent folders`,
        );
      }

      const skillCategories = Object.keys(config.skills || {});
      for (const category of skillCategories) {
        const catPath = path.join(skillsDir, category);
        if (!(await fs.pathExists(catPath))) continue;

        const catConfig = config.skills[category];
        const skillFolders = (await fs.readdir(catPath)).filter((f) => {
          const p = path.join(catPath, f);
          return fs.statSync(p).isDirectory() && !f.startsWith(".");
        });
        const filteredFolders = skillFolders.filter((folder) => {
          if (catConfig.include && !catConfig.include.includes(folder))
            return false;
          if (catConfig.exclude && catConfig.exclude.includes(folder))
            return false;
          return true;
        });

        for (const folder of filteredFolders) {
          const skill = await collectLocalSkill(
            category,
            folder,
            path.join(catPath, folder),
          );
          if (skill) collectedSkills.push(skill);
        }
      }

      if (collectedSkills.length > 0) {
        await syncService.writeSkills(collectedSkills, config);
        console.log(
          `✅ Synced ${collectedSkills.length} local skills to target agent folders`,
        );
      }

      // Refresh indices after ownership pruning so retired members cannot remain
      // in the generated category indexes or their lockfile snapshots.
      await syncService.completeInstall(config, {
        skills: collectedSkills,
        workflows: collectedWorkflows,
        specialistsOk: false,
        refreshIndices: true,
        localMetadata,
        // Local authoring source is a complete desired set for this checkout.
        workflowAcquisition: {
          status: 'complete',
          workflows: collectedWorkflows,
          failures: [],
        },
      });
      await MarkdownUtils.injectIndex(
        repoRoot,
        ["AGENTS.md"],
        routerIndexContent,
      );
    } catch (error) {
      console.error("❌ Failed to sync local skills/workflows:", error);
      throw error;
    }
  }

  // Final Phase: Sync specialists to native agent folders
  if (agents.length > 0) {
    try {
      const specialistSyncService = new SpecialistSyncService();
      await specialistSyncService.syncSpecialists(repoRoot, agents);
      console.log(`✅ Synced specialists for: ${agents.join(", ")}`);
    } catch (error) {
      console.error("❌ Failed to sync specialists:", error);
      throw error;
    }
  }
}

generate().catch((error: unknown) => {
  console.error("❌ Index generation failed:", error);
  process.exitCode = 1;
});
