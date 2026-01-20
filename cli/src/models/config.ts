export interface SkillEntry {
  ref?: string;
  exclude?: string[];
  include?: string[];
}

export interface SkillConfig {
  registry: string;
  agents: string[];
  skills: {
    [key: string]: SkillEntry;
  };
  custom_overrides?: string[];
}
