import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillValidator } from '../../services/SkillValidator';
import { ValidateCommand } from '../validate-skills';

vi.mock('../../services/SkillValidator', () => {
  return {
    SkillValidator: vi.fn(),
  };
});

describe('ValidateCommand', () => {
  let validateCommand: ValidateCommand;
  let exitMock: any;

  beforeEach(() => {
    validateCommand = new ValidateCommand();
    exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    exitMock.mockRestore();
  });

  it('should call validator.run with false when all option is not provided', async () => {
    const mockRun = vi.fn().mockResolvedValue(0);
    vi.mocked(SkillValidator).mockImplementation(function () {
      return { run: mockRun };
    } as any);

    await validateCommand.run({});

    expect(mockRun).toHaveBeenCalledWith(false);
    expect(exitMock).toHaveBeenCalledWith(0);
  });

  it('should call validator.run with true when all option is true', async () => {
    const mockRun = vi.fn().mockResolvedValue(1);
    vi.mocked(SkillValidator).mockImplementation(function () {
      return { run: mockRun };
    } as any);

    await validateCommand.run({ all: true });

    expect(mockRun).toHaveBeenCalledWith(true);
    expect(exitMock).toHaveBeenCalledWith(1);
  });
});
