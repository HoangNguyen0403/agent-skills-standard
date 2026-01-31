import { Agent } from '../constants';

export interface SkillEntry {
  ref?: string;
  exclude?: string[];
  include?: string[];
}

// Alias for clarity in ConfigService
export type CategoryConfig = SkillEntry;

export interface SkillConfig {
  registry: string;
  agents: Agent[];
  skills: {
    [key: string]: SkillEntry;
  };
  custom_overrides?: string[];
}
