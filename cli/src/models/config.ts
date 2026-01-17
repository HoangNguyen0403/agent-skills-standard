export interface SkillConfig {
  registry: string;
  agents: string[];
  skills: {
    [key: string]: {
      enabled: boolean;
      ref?: string;
      exclude?: string[];
      include?: string[];
    };
  };
  custom_overrides?: string[];
}
