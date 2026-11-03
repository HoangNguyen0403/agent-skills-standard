import { PRODUCT_MANAGEMENT_FOUNDATION_SKILLS } from "../../../cli/src/services/CategoryDefaults";
import metadata from "../../../skills/metadata.json";
import skillIndex from "../../../skills/index.json";

/**
 * Build-time derived coverage data for Agent Skills Standard.
 *
 * Canonical inputs are imported statically, so a missing or drifted registry
 * source fails the build instead of rendering an empty catalog:
 * - skills/metadata.json: category versions/counts, base skills, repository URL
 * - skills/index.json: canonical skill ids and descriptions per category
 * - cli/src/services/CategoryDefaults.ts: default product-management selection
 *
 * Only grouping/display taxonomy is hand-authored here (which categories are
 * featured, their display labels, and readable skill titles). Every count,
 * skill entry, and description comes from the canonical files above.
 */

export interface CoverageItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly skillCount?: number;
  readonly sourceUrl: string;
}

export interface CapabilityDistinction {
  readonly kind: "skill" | "specialist" | "workflow";
  readonly title: string;
  readonly mechanism: string;
  readonly invocation: string;
  readonly delivery: string;
}

export interface ProductManagementCoverage {
  readonly foundationTitle: string;
  readonly foundationDescription: string;
  readonly foundationSkills: readonly CoverageItem[];
  readonly optionalTitle: string;
  readonly optionalDescription: string;
  readonly optionalSkills: readonly CoverageItem[];
}

type CategoryId = keyof typeof metadata.categories;
type BaseSkillCategoryId = Exclude<
  keyof typeof metadata.base_language_skills,
  "_comment"
>;
type FeaturedCategoryId = Extract<CategoryId, BaseSkillCategoryId>;
type LeafCategoryId = Extract<
  keyof typeof skillIndex,
  "specialists" | "product-management" | "quality-engineering"
>;

const GITHUB_REPO = metadata.global.repository;
const TREE_BASE = `${GITHUB_REPO}/tree/main/skills`;
const DOCS_BASE = `${GITHUB_REPO}/blob/main/docs`;

export const CAPABILITY_DISTINCTIONS: readonly CapabilityDistinction[] = [
  {
    kind: "skill",
    title: "Guidance Skills",
    mechanism:
      "Coding standards and architectural rules auto-matched by touched file globs or keywords.",
    invocation:
      "Automatic trigger upon file editing, or loaded on demand via MCP server tools.",
    delivery:
      "Injected as modular SKILL.md context without altering agent core reasoning.",
  },
  {
    kind: "specialist",
    title: "Specialist Subagents",
    mechanism:
      "Modular persona configurations with specialized tool scopes and boundaries.",
    invocation:
      "Exported to host-native agent surfaces (.claude/agents, .cursor/agents, .codex/agents, .github/agents, .gemini/agents, .opencode/agents, .kiro/agents).",
    delivery:
      "Runtime dispatch varies: native subagents where supported, instruction-only in Cursor/Kiro, unsupported in Trae/Windsurf/Antigravity/Roo. See docs/agent-capabilities.md.",
  },
  {
    kind: "workflow",
    title: "SDLC Workflows",
    mechanism:
      "Multi-stage lifecycle procedures from discovery and design to testing and release.",
    invocation:
      "Invoked according to host surface: commands, prompt files, native workflows, or skills depending on agent integration.",
    delivery:
      "Structured Markdown contracts guiding agents through phased, gated deliverables.",
  },
] as const;

interface ParsedSkill {
  readonly id: string;
  readonly category: string;
  readonly description: string;
}

/** Canonical `skills/_INDEX.md` line: `- **[category/skill]**: description`. */
const SKILL_LINE =
  /^-\s+\*\*\[([^/]+)\/([^\]]+)\]\*\*:\s*(?:🚨\s*)?(.+)$/;

function parseSkillIndex(
  category: string,
  indexText: string,
): readonly ParsedSkill[] {
  const skills = indexText
    .split("\n")
    .map((line) => SKILL_LINE.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({
      id: match[2],
      category: match[1],
      description: match[3].trim(),
    }));

  if (skills.length === 0) {
    throw new Error(
      `skills/index.json has no parseable skill entries for category "${category}"; the canonical index format changed.`,
    );
  }

  return skills;
}

const SKILLS_BY_CATEGORY: Readonly<
  Record<string, readonly ParsedSkill[] | undefined>
> = Object.fromEntries(
  Object.entries(skillIndex).map(([category, indexText]) => [
    category,
    parseSkillIndex(category, indexText),
  ]),
);

function assertRegistryConsistency(): void {
  const categoryIds = Object.keys(metadata.categories) as CategoryId[];
  const indexedCategories = Object.keys(skillIndex);

  const missingFromIndex = categoryIds.filter(
    (category) => !indexedCategories.includes(category),
  );
  const missingFromMetadata = indexedCategories.filter(
    (category) => !(category in metadata.categories),
  );

  if (missingFromIndex.length > 0 || missingFromMetadata.length > 0) {
    throw new Error(
      `skills/metadata.json and skills/index.json disagree on categories. Missing index entries: [${missingFromIndex.join(", ")}]. Missing metadata entries: [${missingFromMetadata.join(", ")}].`,
    );
  }

  for (const category of categoryIds) {
    const parsed = SKILLS_BY_CATEGORY[category]?.length;
    const claimed = metadata.categories[category].token_metrics.total_skills;
    if (parsed !== claimed) {
      throw new Error(
        `skills/index.json lists ${parsed ?? 0} skills for "${category}" but skills/metadata.json claims ${claimed}. Regenerate the index instead of publishing stale coverage counts.`,
      );
    }
  }
}

function categorySkills(category: CategoryId): readonly ParsedSkill[] {
  const skills = SKILLS_BY_CATEGORY[category];
  if (!skills) {
    throw new Error(
      `skills/index.json is missing category "${category}" required by the coverage taxonomy.`,
    );
  }
  return skills;
}

function requireSkillDescription(category: string, skillId: string): string {
  const skill = SKILLS_BY_CATEGORY[category]?.find(
    (entry) => entry.id === skillId,
  );
  if (!skill) {
    throw new Error(
      `skills/index.json has no "${category}/${skillId}" entry; the canonical base-skill mapping and the registry index have drifted.`,
    );
  }
  return skill.description;
}

/** Display title only; canonical identity and description stay registry-derived. */
const SKILL_NAME_OVERRIDES: Readonly<Record<string, string | undefined>> = {
  "business-requirements": "Business Requirements (BRD)",
  requirements: "Product Requirements (PRD)",
  roadmap: "Roadmap Prioritization",
};

const ACRONYMS: Readonly<Record<string, true>> = {
  ac: true,
  api: true,
  aspm: true,
  brd: true,
  cd: true,
  ci: true,
  cli: true,
  dast: true,
  dsl: true,
  http: true,
  id: true,
  llm: true,
  mcp: true,
  owasp: true,
  pom: true,
  pr: true,
  prd: true,
  sast: true,
  sca: true,
  sdk: true,
  sre: true,
  tc: true,
  tdd: true,
  ui: true,
  url: true,
  ux: true,
  wcag: true,
};

const DISPLAY_PREFIX: Readonly<Record<LeafCategoryId, string>> = {
  specialists: "specialist-",
  "product-management": "product-",
  "quality-engineering": "quality-engineering-",
};

function formatSkillName(skillId: string, category: LeafCategoryId): string {
  const prefix = DISPLAY_PREFIX[category];
  const base = skillId.startsWith(prefix)
    ? skillId.slice(prefix.length)
    : skillId;
  const override = SKILL_NAME_OVERRIDES[base];
  if (override) return override;
  return base
    .split("-")
    .map((word) =>
      ACRONYMS[word] ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function toCoverageItem(
  category: LeafCategoryId,
  skill: ParsedSkill,
): CoverageItem {
  return {
    id: skill.id,
    name: formatSkillName(skill.id, category),
    description: skill.description,
    category: skill.category,
    sourceUrl: `${TREE_BASE}/${skill.category}/${skill.id}/SKILL.md`,
  };
}

function categoryCoverageItem(
  category: CategoryId,
  name: string,
  baseSkillId: string,
): CoverageItem {
  return {
    id: category,
    name,
    category,
    description: requireSkillDescription(category, baseSkillId),
    skillCount: metadata.categories[category].token_metrics.total_skills,
    sourceUrl: `${TREE_BASE}/${category}/_INDEX.md`,
  };
}

const LANGUAGE_TAXONOMY: readonly {
  readonly id: FeaturedCategoryId;
  readonly name: string;
}[] = [
  { id: "typescript", name: "TypeScript" },
  { id: "javascript", name: "JavaScript" },
  { id: "python", name: "Python" },
  { id: "golang", name: "Go" },
  { id: "java", name: "Java" },
  { id: "kotlin", name: "Kotlin" },
  { id: "swift", name: "Swift" },
  { id: "dart", name: "Dart" },
  { id: "php", name: "PHP" },
];

export const LANGUAGE_COVERAGE: readonly CoverageItem[] = LANGUAGE_TAXONOMY.map(
  (definition) =>
    categoryCoverageItem(
      definition.id,
      definition.name,
      metadata.base_language_skills[definition.id],
    ),
);

const FRAMEWORK_TAXONOMY: readonly {
  readonly id: FeaturedCategoryId;
  readonly name: string;
}[] = [
  { id: "react", name: "React" },
  { id: "nextjs", name: "Next.js" },
  { id: "angular", name: "Angular" },
  { id: "nestjs", name: "NestJS" },
  { id: "spring-boot", name: "Spring Boot" },
  { id: "laravel", name: "Laravel" },
  { id: "flutter", name: "Flutter" },
  { id: "react-native", name: "React Native" },
  { id: "android", name: "Android" },
  { id: "ios", name: "iOS" },
  { id: "database", name: "Databases & Storage" },
];

export const FRAMEWORK_COVERAGE: readonly CoverageItem[] =
  FRAMEWORK_TAXONOMY.map((definition) =>
    categoryCoverageItem(
      definition.id,
      definition.name,
      metadata.base_language_skills[definition.id],
    ),
  );

export const SPECIALIST_COVERAGE: readonly CoverageItem[] = categorySkills(
  "specialists",
).map((skill) => toCoverageItem("specialists", skill));

const PRODUCT_MANAGEMENT_SKILLS = categorySkills("product-management");
const FOUNDATION_SKILL_IDS: readonly string[] =
  PRODUCT_MANAGEMENT_FOUNDATION_SKILLS;

const missingFoundationSkills = FOUNDATION_SKILL_IDS.filter(
  (foundationId) =>
    !PRODUCT_MANAGEMENT_SKILLS.some((skill) => skill.id === foundationId),
);
if (missingFoundationSkills.length > 0) {
  throw new Error(
    `cli/src/services/CategoryDefaults.ts selects product-management foundation skills missing from skills/index.json: [${missingFoundationSkills.join(", ")}].`,
  );
}

const FOUNDATION_SKILLS = PRODUCT_MANAGEMENT_SKILLS.filter((skill) =>
  FOUNDATION_SKILL_IDS.includes(skill.id),
).map((skill) => toCoverageItem("product-management", skill));

const OPTIONAL_SKILLS = PRODUCT_MANAGEMENT_SKILLS.filter(
  (skill) => !FOUNDATION_SKILL_IDS.includes(skill.id),
).map((skill) => toCoverageItem("product-management", skill));

export const PRODUCT_MANAGEMENT_COVERAGE: ProductManagementCoverage = {
  foundationTitle: "Default Foundation (Installed by Default)",
  foundationDescription:
    "Included automatically when the product-management category is enabled. Establishes core requirement contracts.",
  foundationSkills: FOUNDATION_SKILLS,
  optionalTitle: "Optional Specialized Capabilities (Opt-in via .skillsrc)",
  optionalDescription:
    "Advanced product governance and discovery capabilities enabled on demand, keeping base prompt tokens lean.",
  optionalSkills: OPTIONAL_SKILLS,
};

export const QUALITY_ENGINEERING_COVERAGE: readonly CoverageItem[] =
  categorySkills("quality-engineering").map((skill) =>
    toCoverageItem("quality-engineering", skill),
  );

interface CrossCuttingDefinition {
  readonly id: Extract<CategoryId, "common" | "system-design" | "cybersecurity">;
  readonly name: string;
  /** Representative canonical skill whose description introduces the category. */
  readonly baseSkill: string;
}

const CROSS_CUTTING_TAXONOMY: readonly CrossCuttingDefinition[] = [
  {
    id: "common",
    name: "Common Engineering Standards",
    baseSkill: "common-best-practices",
  },
  {
    id: "system-design",
    name: "System Design & Architecture",
    baseSkill: "system-design-principles",
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity & Defenses",
    baseSkill: "cyber-detection-engineering",
  },
];

export const CROSS_CUTTING_COVERAGE: readonly CoverageItem[] =
  CROSS_CUTTING_TAXONOMY.map((definition) =>
    categoryCoverageItem(
      definition.id,
      definition.name,
      definition.baseSkill,
    ),
  );

assertRegistryConsistency();

export const COVERAGE_META = {
  totalCategories: Object.keys(metadata.categories).length,
  specialistTotal: SPECIALIST_COVERAGE.length,
  qualityEngineeringTotal: QUALITY_ENGINEERING_COVERAGE.length,
  productManagementTotal: PRODUCT_MANAGEMENT_SKILLS.length,
  capabilitiesDocUrl: `${DOCS_BASE}/agent-capabilities.md`,
  workflowDocUrl: `${DOCS_BASE}/sdlc-workflow-quick-reference.md`,
  configurationDocUrl: `${GITHUB_REPO}/blob/main/README.md#configuration`,
  catalogBrowseUrl: `${GITHUB_REPO}/tree/main/skills`,
} as const;
