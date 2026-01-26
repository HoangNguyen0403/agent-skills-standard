export interface SkillEntry {
  ref?: string;
  exclude?: string[];
  include?: string[];
}

// Alias for clarity in ConfigService
export type CategoryConfig = SkillEntry;

export interface SkillConfig {
  registry: string;
  agents: string[];
  skills: {
    [key: string]: SkillEntry;
  };
  feedback_url?: string;
  custom_overrides?: string[];
}
