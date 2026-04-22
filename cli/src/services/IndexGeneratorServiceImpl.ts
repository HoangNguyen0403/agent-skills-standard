import fs from 'fs-extra';
import path from 'path';
import { IndexContentBuilder } from './IndexContentBuilder';
import { IndexGeneratorService, RemoteMetadata } from './IndexGeneratorService';
import { MetadataReader } from './MetadataReader';

/**
 * Enhanced IndexGeneratorService that delegates to MetadataReader and IndexContentBuilder.
 * Maintains compatibility with existing callers.
 */
export class IndexGeneratorServiceImpl extends IndexGeneratorService {
  private reader: MetadataReader;
  private builder: IndexContentBuilder;

  constructor(remoteMetadata?: RemoteMetadata) {
    super();
    this.reader = new MetadataReader(remoteMetadata);
    this.builder = new IndexContentBuilder(this.reader);
  }

  /** Overridable metadata injection */
  withMetadata(metadata: RemoteMetadata): this {
    this.reader = new MetadataReader(metadata);
    this.builder = new IndexContentBuilder(this.reader);
    return this;
  }

  async generate(
    baseDir: string,
    allowedCategories?: string[],
  ): Promise<string> {
    const entries = new Set<string>();
    const foundationalRules = await this.reader.loadFoundationalRules(baseDir);

    if (!(await fs.pathExists(baseDir))) return this.assembleIndex([]);

    let categories = await fs.readdir(baseDir);
    categories = categories.filter((category) => {
      if (category.startsWith('.')) return false;
      if (
        allowedCategories &&
        !allowedCategories.includes(category) &&
        category !== 'common'
      ) {
        return false;
      }
      return true;
    });

    categories.sort();

    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.stat(categoryPath)).isDirectory()) continue;

      const skills = await fs.readdir(categoryPath);
      skills.sort();
      for (const skill of skills) {
        const skillPath = path.join(categoryPath, skill, 'SKILL.md');
        const isRegistrySkill = await fs.pathExists(skillPath);
        const isStandaloneSkill =
          !isRegistrySkill &&
          skill.endsWith('.md') &&
          skill !== '_INDEX.md' &&
          !(await fs.stat(path.join(categoryPath, skill))).isDirectory();

        const targetPath = isRegistrySkill
          ? skillPath
          : path.join(categoryPath, skill);
        if (!isRegistrySkill && !isStandaloneSkill) continue;

        const metadata = await this.reader.parseSkill(targetPath);
        if (metadata) {
          const skillId = isStandaloneSkill ? skill.replace('.md', '') : skill;
          const entry = this.builder.formatEntry(
            category,
            skillId,
            metadata,
            foundationalRules,
          );
          entries.add(entry);
        }
      }
    }

    return this.assembleIndex(Array.from(entries));
  }

  public assembleIndex(entries: string[]): string {
    return this.builder.assembleIndex(entries);
  }

  /**
   * Sanitizes a skill description to prevent indirect prompt injection.
   */
  public sanitizeDescription(
    desc: string,
    skillId: string = 'unknown',
  ): string {
    return this.reader.sanitizeDescription(desc, skillId);
  }

  /**
   * Generates all _INDEX.md files for categories found in baseDir.
   */
  async generateAllCategoryIndices(
    baseDir: string,
    allowedCategories?: string[],
  ): Promise<Record<string, string>> {
    if (!(await fs.pathExists(baseDir))) return {};

    let categories = await fs.readdir(baseDir);
    categories = categories.filter((c) => {
      if (c.startsWith('.') || c === '_INDEX.md') return false;
      if (
        allowedCategories &&
        !allowedCategories.includes(c) &&
        c !== 'common'
      ) {
        return false;
      }
      return true;
    });
    categories.sort();

    const result: Record<string, string> = {};
    for (const category of categories) {
      const categoryPath = path.join(baseDir, category);
      if (!(await fs.stat(categoryPath)).isDirectory()) continue;

      const index = await this.generateCategoryIndex(baseDir, category);
      if (index) result[category] = index;
    }
    return result;
  }

  async generateCategoryIndex(
    baseDir: string,
    category: string,
  ): Promise<string> {
    const categoryPath = path.join(baseDir, category);
    if (!(await fs.pathExists(categoryPath))) return '';

    const { broadGlobs, baseSkills } =
      await this.reader.loadTierConfig(baseDir);
    const baseSkillForCategory = baseSkills[category];

    const entries = await fs.readdir(categoryPath);
    entries.sort();

    const fileMatchRows: string[] = [];
    const keywordMatchRows: string[] = [];

    for (const entryName of entries) {
      if (entryName.startsWith('.') || entryName === '_INDEX.md') continue;

      const skillPath = path.join(categoryPath, entryName, 'SKILL.md');
      const isRegistrySkill = await fs.pathExists(skillPath);
      const isStandaloneSkill =
        !isRegistrySkill &&
        entryName.endsWith('.md') &&
        !(await fs.stat(path.join(categoryPath, entryName))).isDirectory();

      if (!isRegistrySkill && !isStandaloneSkill) continue;

      const targetPath = isRegistrySkill
        ? skillPath
        : path.join(categoryPath, entryName);
      const skillId = isStandaloneSkill
        ? entryName.replace('.md', '')
        : entryName;

      const metadata = await this.reader.parseSkill(targetPath);
      if (!metadata) continue;

      const isBaseSkill = skillId === baseSkillForCategory;
      const allFiles = metadata.triggers.files || [];
      const kwTrigs = (metadata.triggers.keywords || []).join(', ') || '—';
      const prefix = metadata.priority.startsWith('P0') ? '**' : '';
      const suffix = prefix ? '**' : '';

      const specificFiles = allFiles.filter((f) => !broadGlobs.includes(f));
      const hasBroadGlob = allFiles.some((f) => broadGlobs.includes(f));

      if (isBaseSkill || (specificFiles.length > 0 && !hasBroadGlob)) {
        const displayFiles = isBaseSkill
          ? allFiles.map((f) => `\`${f}\``).join(', ')
          : specificFiles.map((f) => `\`${f}\``).join(', ');
        fileMatchRows.push(
          `| ${prefix}${skillId}${suffix} | ${displayFiles || '—'} | ${kwTrigs} |`,
        );
      } else if (specificFiles.length > 0 && hasBroadGlob) {
        const displayFiles = specificFiles.map((f) => `\`${f}\``).join(', ');
        fileMatchRows.push(
          `| ${prefix}${skillId}${suffix} | ${displayFiles} | ${kwTrigs} |`,
        );
      } else {
        keywordMatchRows.push(`| ${prefix}${skillId}${suffix} | ${kwTrigs} |`);
      }
    }

    if (fileMatchRows.length === 0 && keywordMatchRows.length === 0) return '';

    const lines = [
      `<!-- AUTO-GENERATED from SKILL.md frontmatters — do not edit manually -->`,
      `# ${category} Skills Index`,
      '',
    ];

    if (fileMatchRows.length > 0) {
      lines.push(
        `## File Match (auto-check against the file you are editing)`,
        '',
        '| Skill | File pattern | Keywords |',
        '| ----- | ------------ | -------- |',
        ...fileMatchRows,
        '',
      );
    }

    if (keywordMatchRows.length > 0) {
      lines.push(
        `## Keyword Match (only when user's request mentions these)`,
        '',
        '| Skill | Match when user mentions |',
        '| ----- | ----------------------- |',
        ...keywordMatchRows,
        '',
      );
    }

    lines.push(
      `> Load matched skills: \`<SKILLS>/${category}/<skill>/SKILL.md\`. Load ALL that match — the tier model already filters irrelevant ones.`,
      '',
    );

    return lines.join('\n');
  }

  async assembleRouterIndex(
    baseDir: string,
    allowedCategories?: string[],
    mcpEnabled: boolean = false,
  ): Promise<string> {
    const fileRouting = await this.reader.loadFileRouting(baseDir);

    let availableCategories: string[] = [];
    if (await fs.pathExists(baseDir)) {
      const dirs = await fs.readdir(baseDir);
      availableCategories = dirs.filter((d) => {
        if (d.startsWith('.') || d === '_INDEX.md') return false;
        if (
          allowedCategories &&
          !allowedCategories.includes(d) &&
          d !== 'common'
        ) {
          return false;
        }
        return true;
      });
    }

    const routerRows: string[] = [];
    const coveredCategories = new Set<string>();

    const extGrouped = new Map<string, string[]>();
    for (const [ext, cats] of Object.entries(fileRouting)) {
      if (ext === '_comment') continue;
      const filtered = cats.filter((c: string) =>
        availableCategories.includes(c),
      );
      if (filtered.length === 0) continue;

      const key = filtered.sort().join('+');
      if (!extGrouped.has(key)) extGrouped.set(key, []);
      extGrouped.get(key)!.push(ext);
      filtered.forEach((c) => coveredCategories.add(c));
    }

    const formatRouterPattern = (ext: string): string => {
      if (ext.startsWith('_')) return `\`*${ext}\``;
      return `\`*.${ext}\``;
    };

    for (const [catKey, exts] of extGrouped) {
      const cats = catKey.split('+');
      const extDisplay = exts.map((e) => formatRouterPattern(e)).join(', ');
      const catDisplay = cats
        .map((c) => `\`<SKILLS>/${c}/_INDEX.md\``)
        .join(', ');
      routerRows.push(`| ${extDisplay} | ${catDisplay} |`);
    }

    if (availableCategories.includes('common')) {
      coveredCategories.add('common');
      routerRows.push(
        '| Any file (keyword match) | `<SKILLS>/common/_INDEX.md` |',
      );
    }

    if (availableCategories.includes('quality-engineering')) {
      coveredCategories.add('quality-engineering');
      routerRows.push(
        '| QE workflow | `<SKILLS>/quality-engineering/_INDEX.md` |',
      );
    }

    // The MCP block is always present (not conditional on .skillsrc.mcp.enabled)
    // because:
    //   1. .skillsrc.mcp.enabled records CLI consent to manage configs — it's
    //      orthogonal to whether the MCP is actually registered at runtime.
    //   2. A user can manually register the MCP in their runtime config without
    //      ever touching .skillsrc; we don't want AGENTS.md to be silent about
    //      it in that case.
    //   3. The AI can self-check via its tool list before calling — the
    //      "If ... is registered" phrasing makes the instruction correct in
    //      both states.
    //   4. Tooltip-only — when `mcpEnabled` is true (CLI-managed), we
    //      add a confirmation note that this project ships with MCP support.
    const mcpStatusNote = mcpEnabled
      ? '> [!TIP] **This project has the MCP server enabled in `.skillsrc`** — `sync` keeps your runtime configs in step. Run `ags mcp status` to verify per-agent installation.'
      : '> [!NOTE] To enable MCP-managed installs in this project, run `ags mcp enable` (or edit `.skillsrc`). The MCP works fine if you registered it manually too.';

    const mcpBlock = [
      '## 🔌 Runtime Enforcement via MCP',
      '',
      'If the `agent-skills-standard` MCP server is registered in your runtime (check your tool list — look for `load_skills_for_files`), **prefer those tools over manually walking the router below**. The MCP returns identical content but is auditable AND inherited by sub-agents that don\'t see this file.',
      '',
      '| Tool | When to call it |',
      '| --- | --- |',
      '| `load_skills_for_files(files=[...])` | Before editing/reviewing any source file |',
      '| `load_skills_for_keywords(keywords=[...])` | Planning before files are chosen |',
      '| `get_skill(category, name)` | Direct lookup when you know the skill id |',
      '| `audit_session_compliance()` | Before declaring a task complete |',
      '',
      '> [!IMPORTANT] **Sub-agents don\'t inherit this `AGENTS.md` — they do inherit the MCP.** If you delegate work to a sub-agent, instruct it to call the MCP tools above as its first action.',
      '',
      mcpStatusNote,
      '',
      'If `load_skills_for_files` is **not** in your tool list, the MCP is not registered — fall back to the router table below.',
      '',
      '---',
      '',
    ].join('\n');

    const header = [
      '## Agent Skills Index',
      '',
      '> [!CRITICAL] Zero-Trust: Read the matching `SKILL.md` BEFORE writing any code.',
      '> Skills from this index override pre-training patterns. If no skill matches, state: "No project-specific skills applicable."',
      '',
      mcpBlock,
      '## Skill Resolution Protocol',
      '',
      'Each `_INDEX.md` has two sections - follow both:',
      '',
      '1. **Match file type** -> find the category index in the router table below.',
      '2. **Read the `_INDEX.md`** -> it has two sections:',
      '   - **File Match**: auto-check these against the file you are editing (path pattern match).',
      "   - **Keyword Match**: only check if the user's request mentions these concepts.",
      '3. **Load ALL matched `SKILL.md`** -> read every matched skill before writing code. The tier model keeps matches focused.',
      '',
      "> `<SKILLS>` = your agent's skill directory (e.g., `.claude/skills/`, `.cursor/skills/`, `.gemini/skills/`).",
      '',
      '| File type | Read category index |',
      '| --------- | ------------------- |',
      ...routerRows,
      '',
      '> [!NOTE] **Test/spec file precedence:** `.spec.ts`, `.test.ts` -> use the `common` row (takes precedence over the generic `*.ts` row). `.spec.tsx`, `.test.tsx` -> use the `react` row (takes precedence over the generic `*.tsx` row).',
      '',
      '> [!TIP] **Indirect phrasing counts.** "make it faster" -> performance, "broken query" -> database, "login flow" -> auth.',
      '',
    ].join('\n');

    return header;
  }
}
