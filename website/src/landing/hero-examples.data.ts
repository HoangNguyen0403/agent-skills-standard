export interface SkillExample {
  readonly id: string;
  readonly label: string;
  readonly sampleFile: string;
  readonly fileTriggerDescription: string;
  readonly filePattern: string;
  readonly categoryIndex: string;
  readonly categoryName: string;
  readonly skillName: string;
  readonly skillPath: string;
  readonly ruleTitle: string;
  readonly ruleExcerpt: string;
  readonly sourceUrl: string;
}

export const HERO_SKILL_EXAMPLES: readonly SkillExample[] = [
  {
    id: "typescript",
    label: "TypeScript",
    sampleFile: "checkout.ts",
    fileTriggerDescription: "Editing a TypeScript file",
    filePattern: "**/*.ts, **/*.tsx",
    categoryIndex: "skills/typescript/_INDEX.md",
    categoryName: "typescript",
    skillName: "typescript-language",
    skillPath: "skills/typescript/typescript-language/SKILL.md",
    ruleTitle: "Immutability & Safety",
    ruleExcerpt:
      "Immutability: readonly arrays/objects. Const Assertions: as const, satisfies.",
    sourceUrl:
      "https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/skills/typescript/typescript-language/SKILL.md",
  },
  {
    id: "react",
    label: "React",
    sampleFile: "Button.tsx",
    fileTriggerDescription: "Editing a React component",
    filePattern: "**/*.jsx, **/*.tsx",
    categoryIndex: "skills/react/_INDEX.md",
    categoryName: "react",
    skillName: "react-component-patterns",
    skillPath: "skills/react/react-component-patterns/SKILL.md",
    ruleTitle: "React 19 & Composition",
    ruleExcerpt:
      "React 19: ref is a regular prop on function components — no forwardRef needed for new code.",
    sourceUrl:
      "https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/skills/react/react-component-patterns/SKILL.md",
  },
  {
    id: "golang",
    label: "Go",
    sampleFile: "checkout_test.go",
    fileTriggerDescription: "Editing a Go test",
    filePattern: "**/*_test.go",
    categoryIndex: "skills/golang/_INDEX.md",
    categoryName: "golang",
    skillName: "golang-testing",
    skillPath: "skills/golang/golang-testing/SKILL.md",
    ruleTitle: "Table-Driven Testing",
    ruleExcerpt:
      "[BE-TEST-01] Table-Driven Subtests for Equivalent Cases: Prefer table-driven tests ([]struct{ name, input, expected, expectErr } with t.Run).",
    sourceUrl:
      "https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/skills/golang/golang-testing/SKILL.md",
  },
] as const;

export const DEFAULT_HERO_SKILL_EXAMPLE = HERO_SKILL_EXAMPLES[0];
