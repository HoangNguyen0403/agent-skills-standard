export interface CommandItem {
  readonly id: "init" | "sync";
  readonly command: string;
}

export interface NavigationItem {
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

export interface FaqItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

export interface SourceLinks {
  readonly docs: string;
  readonly skills: string;
  readonly github: string;
  readonly configuration: string;
  readonly capabilities: string;
  readonly workflow: string;
  readonly skill: string;
  readonly benchmark: string;
  readonly evals: string;
  readonly contributing: string;
  readonly license: string;
}

export interface LandingContent {
  readonly hero: {
    readonly title: string;
    readonly subtitle: string;
    readonly primaryCta: string;
    readonly secondaryCta: string;
    readonly microcopy: string;
    readonly diagramLabel: string;
    readonly diagramDescription: string;
    readonly diagramSteps: readonly string[];
  };
  readonly compatibility: {
    readonly title: string;
    readonly description: string;
    readonly notice: string;
  };
  readonly problemChange: {
    readonly beforeTitle: string;
    readonly beforePoints: readonly string[];
    readonly afterTitle: string;
    readonly afterPoints: readonly string[];
  };
  readonly setup: {
    readonly title: string;
    readonly steps: readonly {
      readonly step: string;
      readonly title: string;
      readonly description: string;
      readonly command?: string;
    }[];
  };
  readonly specimen: {
    readonly title: string;
    readonly path: string;
    readonly label: string;
    readonly excerpts: readonly string[];
  };
  readonly workflow: {
    readonly title: string;
    readonly description: string;
    readonly stages: readonly string[];
  };
  readonly customization: {
    readonly title: string;
    readonly description: string;
  };
  readonly evidence: {
    readonly title: string;
    readonly syntheticTitle: string;
    readonly syntheticDesc: string;
    readonly evalsTitle: string;
    readonly evalsDesc: string;
    readonly readinessCaveat: string;
  };
  readonly quickStart: {
    readonly title: string;
    readonly subtitle: string;
    readonly prerequisite: string;
  };
  readonly community: {
    readonly title: string;
    readonly description: string;
  };
  readonly footer: {
    readonly attribution: string;
    readonly licenseNotice: string;
  };
}

export const sourceRevision =
  "73422bdeff746281177d55ccb7d2169471eb475a" as const;

export const commands: readonly CommandItem[] = [
  {
    id: "init",
    command: "npx agent-skills-standard@latest init",
  },
  {
    id: "sync",
    command: "npx agent-skills-standard@latest sync",
  },
] as const;

/**
 * 5 primary in-page and external navigation links:
 * How it works, Skills, Evidence, Docs, GitHub (no Unicode action glyphs; separate Get started CTA).
 */
export const navigation: readonly NavigationItem[] = [
  { id: "how-it-works", label: "How it works", href: "#how-it-works" },
  { id: "skills", label: "Skills", href: "#skills" },
  { id: "evidence", label: "Evidence", href: "#evidence" },
  {
    id: "docs",
    label: "Docs",
    href: "https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/README.md",
  },
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/HoangNguyen0403/agent-skills-standard",
  },
] as const;

export const sourceLinks: SourceLinks = {
  docs: "https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/README.md",
  skills:
    "https://github.com/HoangNguyen0403/agent-skills-standard/tree/main/skills",
  github: "https://github.com/HoangNguyen0403/agent-skills-standard",
  configuration:
    "https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/README.md#configuration",
  capabilities:
    "https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/docs/agent-capabilities.md",
  workflow:
    "https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/docs/sdlc-workflow-quick-reference.md",
  skill: `https://github.com/HoangNguyen0403/agent-skills-standard/blob/${sourceRevision}/skills/typescript/typescript-language/SKILL.md`,
  benchmark: `https://github.com/HoangNguyen0403/agent-skills-standard/blob/${sourceRevision}/benchmark-report.md`,
  evals: `https://github.com/HoangNguyen0403/agent-skills-standard/blob/${sourceRevision}/evals-report.md`,
  contributing:
    "https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/CONTRIBUTING.md",
  license:
    "https://github.com/HoangNguyen0403/agent-skills-standard/blob/main/LICENSE",
} as const;

export const compatibleAgents: readonly string[] = [
  "Cursor",
  "Claude Code",
  "Codex",
  "GitHub Copilot",
  "Gemini",
] as const;

export const faq: readonly FaqItem[] = [
  {
    id: "faq-1",
    question: "Is this another coding agent?",
    answer:
      "No. It supplies standards and workflows to the agent you already use.",
  },
  {
    id: "faq-2",
    question: "Which agents are supported?",
    answer:
      "Multiple integrations are available; skills, hooks, and specialist support differ. Check the capability matrix.",
  },
  {
    id: "faq-3",
    question: "Can I customize the standards?",
    answer: "Yes. Configure .skillsrc and custom_overrides in your repository.",
  },
  {
    id: "faq-4",
    question: "Does it guarantee my agent follows every rule?",
    answer:
      "No. Instructions, MCP tools, and hooks have different capabilities; consult your agent's integration documentation.",
  },
  {
    id: "faq-5",
    question: "Is it free and open source?",
    answer:
      "The project is MIT licensed. Your agent or model provider may have its own costs.",
  },
] as const;

export const content: LandingContent = {
  hero: {
    title: "Your coding agent. Your engineering standards.",
    subtitle:
      "Portable, versioned coding standards and SDLC workflows for the AI tools you already use. Sync once. Load the relevant skills when you work.",
    primaryCta: "Get started",
    secondaryCta: "Explore skills",
    microcopy: "Open source · MIT licensed · No new agent runtime",
    diagramLabel: "Illustrative walkthrough",
    diagramDescription:
      "The agent selects guidance using file and task triggers.",
    diagramSteps: [
      "Editing a TypeScript file",
      "Category index",
      "Matching skill",
    ],
  },
  compatibility: {
    title: "Built for the tools you already use",
    description: "Compatible with leading developer agents and environments.",
    notice:
      "Integration capabilities vary by agent. Consult the capability matrix for details.",
  },
  problemChange: {
    beforeTitle: "Repeated prompts. Drifting rules.",
    beforePoints: [
      "Engineers re-prompting context every session.",
      "Inconsistent rules between team members and tools.",
      "Ad-hoc advice that decays as codebases grow.",
    ],
    afterTitle: "Portable standards. Relevant context.",
    afterPoints: [
      "Single source of truth versioned in your repository.",
      "Context triggered automatically per file and task.",
      "Deterministic SDLC workflows from planning to review.",
    ],
  },
  setup: {
    title: "How it works",
    steps: [
      {
        step: "01",
        title: "Initialize",
        description:
          "Run init to detect existing agents and create .skillsrc configuration.",
        command: "npx agent-skills-standard@latest init",
      },
      {
        step: "02",
        title: "Sync",
        description:
          "Generate native prompt rules and agent configurations in your repository.",
        command: "npx agent-skills-standard@latest sync",
      },
      {
        step: "03",
        title: "Work in your agent",
        description:
          "Your agent loads matching guidance automatically based on touched files and triggers.",
      },
    ],
  },
  specimen: {
    title: "Inspect the standards before you use them",
    path: "skills/typescript/typescript-language/SKILL.md",
    label: "Verified excerpt",
    excerpts: [
      "Type Annotations: Explicit params/returns. Infer locals.",
      "Immutability: readonly arrays/objects. Const Assertions: as const, satisfies.",
      "NEVER use any: Use unknown or specific interface instead.",
    ],
  },
  workflow: {
    title: "From idea to verified delivery",
    description:
      "Synced SDLC workflows invoked directly inside your chosen agent, not external commands.",
    stages: ["Brainstorm", "Plan", "Design", "Implement", "Verify"],
  },
  customization: {
    title: "Your standards stay in your repo",
    description:
      "Configure .skillsrc and custom_overrides to tailor skills, disable categories, or add proprietary organization rules.",
  },
  evidence: {
    title: "Inspect the evidence",
    syntheticTitle: "Token-size benchmark",
    syntheticDesc:
      "Measures prompt token footprint across skill categories and frameworks.",
    evalsTitle: "Live skill evals",
    evalsDesc:
      "Evaluates empirical task success rates with and without loaded skill context.",
    readinessCaveat:
      "Results vary across models. Current catalog readiness in live evals is marked NOT READY.",
  },
  quickStart: {
    title: "Quick start",
    subtitle: "Two commands to configure your repository. No account required.",
    prerequisite:
      "Requires Node.js and npm. See the setup documentation for installation instructions.",
  },
  community: {
    title: "Keep your agent. Raise your standard.",
    description:
      "Join contributors refining portable coding standards for the global AI engineering community.",
  },
  footer: {
    attribution: "Agent Skills Standard by Hoang Nguyen",
    licenseNotice: "Open source software released under the MIT License.",
  },
} as const;
