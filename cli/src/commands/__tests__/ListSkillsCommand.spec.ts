import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListSkillsCommand } from '../list-skills';

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ framework: 'flutter' }),
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
  },
}));

describe('ListSkillsCommand', () => {
  let command: ListSkillsCommand;
  let mockSkillService: any;
  let mockConfigService: any;
  let mockDetectionService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSkillService = {
      getSkillsWithStatus: vi.fn().mockResolvedValue([
        { name: 'skill1', status: 'detected' },
        { name: 'skill2', status: 'no-rule' },
        { name: 'skill3', status: 'not-detected' },
      ]),
    };
    mockDetectionService = {
      getProjectDeps: vi.fn().mockResolvedValue(new Set()),
    };
    mockConfigService = {
      getRegistryUrl: vi.fn().mockResolvedValue('url'),
    };

    // Explicitly pass undefined to cover constructor branch 18-20
    command = new ListSkillsCommand(undefined, undefined, undefined);

    (command as any).configService = mockConfigService;
    (command as any).detectionService = mockDetectionService;
    (command as any).skillService = mockSkillService;

    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should list skills correctly', async () => {
    await command.run();
    expect(mockSkillService.getSkillsWithStatus).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('Available skills for flutter'),
    );
  });
});
