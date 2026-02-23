import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { ConfigService } from '../../services/ConfigService';
import { DetectionService } from '../../services/DetectionService';
import { SkillService } from '../../services/SkillService';
import { ListSkillsCommand } from '../list-skills';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

vi.mock('picocolors', () => ({
  default: {
    green: vi.fn((t) => t),
    cyan: vi.fn((t) => t),
    gray: vi.fn((t) => t),
    bold: vi.fn((t) => t),
    blue: vi.fn((t) => t),
    yellow: vi.fn((t) => t),
    red: vi.fn((t) => t),
  },
}));

describe('ListSkillsCommand', () => {
  let command: ListSkillsCommand;
  let mockSkillService: Mocked<SkillService>;
  let mockConfigService: Mocked<ConfigService>;
  let mockDetectionService: Mocked<DetectionService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSkillService = {
      getSkillsWithStatus: vi.fn().mockResolvedValue([
        { name: 'skill1', status: 'detected' },
        { name: 'skill2', status: 'no-rule' },
        { name: 'skill3', status: 'not-detected' },
      ]),
    } as unknown as Mocked<SkillService>;
    mockDetectionService = {
      getProjectDeps: vi.fn().mockResolvedValue(new Set()),
    } as unknown as Mocked<DetectionService>;
    mockConfigService = {
      getRegistryUrl: vi.fn().mockResolvedValue('url'),
    } as unknown as Mocked<ConfigService>;

    // Explicitly pass undefined to cover constructor branch 18-20
    command = new ListSkillsCommand(undefined, undefined, undefined);

    // @ts-expect-error - testing private instance patching
    command.configService = mockConfigService;
    // @ts-expect-error - testing private instance patching
    command.detectionService = mockDetectionService;
    // @ts-expect-error - testing private instance patching
    command.skillService = mockSkillService;

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    vi.mocked(inquirer.prompt).mockResolvedValue({ framework: 'flutter' });
  });

  it('should list skills correctly when framework is provided', async () => {
    await command.run({ framework: 'flutter' });
    expect(mockSkillService.getSkillsWithStatus).toHaveBeenCalledWith(
      'flutter',
      'url',
      expect.any(Set),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Available skills for flutter'),
    );
  });

  it('should prompt for framework if not provided', async () => {
    await command.run();
    expect(inquirer.prompt).toHaveBeenCalled();
    expect(mockSkillService.getSkillsWithStatus).toHaveBeenCalledWith(
      'flutter',
      'url',
      expect.any(Set),
    );
  });

  it('should exit with error for invalid framework', async () => {
    await command.run({ framework: 'invalid' });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Invalid framework'),
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should return if no framework is selected from prompt', async () => {
    vi.mocked(inquirer.prompt).mockResolvedValue({ framework: undefined });
    await command.run();
    expect(mockSkillService.getSkillsWithStatus).not.toHaveBeenCalled();
  });
});
