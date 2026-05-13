import { execSync } from 'child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Mock package.json version
vi.mock('../../package.json', () => ({
  version: '1.0.0',
}));

describe('UpgradeCommand', () => {
  let UpgradeCommand: any;
  let upgradeCommand: any;
  let consoleLogMock: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../upgrade');
    UpgradeCommand = mod.UpgradeCommand;
    upgradeCommand = new UpgradeCommand();

    // Inject version for test to be absolutely sure
    upgradeCommand.currentVersion = '1.0.0';

    consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogMock.mockRestore();
  });

  it('should handle already using the latest version', async () => {
    vi.mocked(execSync).mockReturnValue('1.0.0\n');

    await upgradeCommand.run({});

    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('You are already using the latest version!'),
    );
  });

  it('should notify when a new version is available in dry-run mode', async () => {
    vi.mocked(execSync).mockReturnValue('2.0.0\n');

    await upgradeCommand.run({ dryRun: true });

    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('A new version (2.0.0) is available!'),
    );
  });

  it('should perform upgrade using detected package manager (pnpm)', async () => {
    vi.mocked(execSync).mockReturnValueOnce('2.0.0\n'); // version check
    vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('pnpm');

    await upgradeCommand.run({});

    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('pnpm add -g agent-skills-standard@2.0.0'),
      expect.anything(),
    );
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('Successfully upgraded to v2.0.0!'),
    );
  });

  it('should handle upgrade failure and print manual instructions', async () => {
    vi.mocked(execSync).mockReturnValueOnce('2.0.0\n'); // version check
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('Upgrade failed');
    });
    vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('npm');

    await upgradeCommand.run({});

    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('Automatic upgrade failed.'),
    );
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('npm install -g agent-skills-standard@2.0.0'),
    );
  });

  it('should handle npm check failure', async () => {
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('Network error');
    });

    await upgradeCommand.run({});

    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('Failed to check for updates via npm.'),
    );
  });

  it('should handle empty latest version', async () => {
    vi.mocked(execSync).mockReturnValueOnce(' \n');

    await upgradeCommand.run({});

    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('Could not determine latest version.'),
    );
  });

  it('should handle invalid version format from npm', async () => {
    vi.mocked(execSync).mockReturnValueOnce('not-a-version\n');

    await upgradeCommand.run({});

    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('Invalid version received from npm: not-a-version'),
    );
  });

  describe('detectPackageManager', () => {
    it('should detect pnpm from user agent', () => {
      process.env.npm_config_user_agent = 'pnpm/1.0.0';
      expect(upgradeCommand.detectPackageManager()).toBe('pnpm');
    });

    it('should detect yarn from user agent', () => {
      process.env.npm_config_user_agent = 'yarn/1.0.0';
      expect(upgradeCommand.detectPackageManager()).toBe('yarn');
    });

    it('should detect pnpm if binary is available', () => {
      delete process.env.npm_config_user_agent;
      vi.mocked(execSync).mockReturnValueOnce('8.0.0\n'); // pnpm --version succeeds
      expect(upgradeCommand.detectPackageManager()).toBe('pnpm');
    });

    it('should detect yarn if pnpm is not available but yarn is', () => {
      delete process.env.npm_config_user_agent;
      vi.mocked(execSync).mockImplementationOnce(() => {
        throw new Error('no pnpm');
      });
      vi.mocked(execSync).mockReturnValueOnce('1.22.0\n'); // yarn --version succeeds
      expect(upgradeCommand.detectPackageManager()).toBe('yarn');
    });

    it('should fallback to npm if no others available', () => {
      delete process.env.npm_config_user_agent;
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('none');
      });
      expect(upgradeCommand.detectPackageManager()).toBe('npm');
    });
  });

  describe('getUpgradeCommand', () => {
    it('should return correct commands for different PMs', () => {
      expect(upgradeCommand.getUpgradeCommand('pnpm', '2.0.0')).toBe(
        'pnpm add -g agent-skills-standard@2.0.0',
      );
      expect(upgradeCommand.getUpgradeCommand('yarn', '2.0.0')).toBe(
        'yarn global add agent-skills-standard@2.0.0',
      );
      expect(upgradeCommand.getUpgradeCommand('npm', '2.0.0')).toBe(
        'npm install -g agent-skills-standard@2.0.0',
      );
    });
  });

  describe('printManualInstructions', () => {
    it('should show sudo prefix on non-windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });

      upgradeCommand.printManualInstructions('npm', '2.0.0');
      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('sudo npm install -g'),
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should NOT show sudo prefix on windows', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });

      upgradeCommand.printManualInstructions('pnpm', '2.0.0');
      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('  pnpm add -g'),
      );
      expect(consoleLogMock).not.toHaveBeenCalledWith(
        expect.stringContaining('sudo pnpm'),
      );

      // This also covers the Alternative (npm) branch if pm !== npm
      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('Alternative (npm):'),
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });
  });
});
