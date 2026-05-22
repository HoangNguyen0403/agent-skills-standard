import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import inquirer from 'inquirer';

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
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
    vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('pnpm');

    vi.mocked(execSync).mockImplementation((command: unknown) => {
      const text = String(command);
      if (text.includes('npm view agent-skills-standard version')) {
        return '2.0.0\n' as any;
      }
      if (text.startsWith('pnpm add -g agent-skills-standard@2.0.0')) {
        return '' as any;
      }
      if (text === 'pnpm root -g') {
        return '/Users/test/Library/pnpm/global/5/node_modules\n' as any;
      }
      if (text.startsWith('node -p')) {
        return '2.0.0\n' as any;
      }
      if (text === 'ags -V') {
        return '2.0.0\n' as any;
      }
      if (text === 'type -a ags') {
        return 'ags is /Users/test/Library/pnpm/ags\n' as any;
      }

      return '' as any;
    });

    await upgradeCommand.run({});

    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('pnpm add -g agent-skills-standard@2.0.0'),
      expect.anything(),
    );
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('Successfully upgraded to v2.0.0!'),
    );
  });

  it('should report pnpm install success even if the shell shim is stale', async () => {
    vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('pnpm');

    vi.mocked(execSync).mockImplementation((command: unknown) => {
      const text = String(command);
      if (text.includes('npm view agent-skills-standard version')) return '2.0.0\n' as any;
      if (text.startsWith('pnpm add -g agent-skills-standard@2.0.0')) return '' as any;
      if (text === 'pnpm root -g') return '/Users/test/Library/pnpm/global/5/node_modules\n' as any;
      if (text.startsWith('node -p')) return '2.0.0\n' as any;
      if (text === 'ags -V') return '1.0.0\n' as any;
      if (text === 'type -a ags') return 'ags is /Users/test/Library/pnpm/bin/ags\n' as any;
      if (text === 'pnpm bin -g') return '/Users/test/Library/pnpm\n' as any;
      return '' as any;
    });

    // No stale shim file — falls through to PATH hint
    vi.mocked(existsSync).mockReturnValue(false);

    await upgradeCommand.run({});

    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "pnpm installed v2.0.0, but 'ags -V' still reports v1.0.0.",
      ),
    );
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('stale shim or PATH entry'),
    );
  });

  it('should detect and remove a stale pnpm shim after upgrade', async () => {
    vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('pnpm');

    vi.mocked(execSync).mockImplementation((command: unknown) => {
      const text = String(command);
      if (text.includes('npm view agent-skills-standard version')) return '2.0.0\n' as any;
      if (text.startsWith('pnpm add -g agent-skills-standard@2.0.0')) return '' as any;
      if (text === 'pnpm root -g') return '/Users/test/Library/pnpm/global/5/node_modules\n' as any;
      if (text.startsWith('node -p')) return '2.0.0\n' as any;
      if (text === 'ags -V') return '1.0.0\n' as any;
      if (text === 'type -a ags') return 'ags is /Users/test/Library/pnpm/bin/ags\n' as any;
      if (text === 'pnpm bin -g') return '/Users/test/Library/pnpm\n' as any;
      return '' as any;
    });

    // Stale shim exists at <pnpm-bin>/bin/ags; correct shim at <pnpm-bin>/ags
    vi.mocked(existsSync).mockImplementation((p) => {
      const s = String(p);
      return s.endsWith('/bin/ags') || s.endsWith('/pnpm/ags');
    });
    // Shim content does NOT contain the new version tag → stale
    vi.mocked(readFileSync).mockReturnValue(
      'exec node "$basedir/../global/v11/abc123/node_modules/agent-skills-standard/dist/index.js"',
    );
    // User confirms removal
    vi.mocked(inquirer.prompt).mockResolvedValue({ remove: true });

    await upgradeCommand.run({});

    expect(unlinkSync).toHaveBeenCalledWith('/Users/test/Library/pnpm/bin/ags');
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('Stale shim removed.'),
    );
  });

  it('should handle upgrade failure and print manual instructions', async () => {
    vi.mocked(execSync).mockReturnValueOnce('2.0.0\n'); // version check
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('Upgrade failed');
    }); // versioned install fails
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('Fallback failed');
    }); // fallback install fails

    vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('npm');

    await upgradeCommand.run({});

    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('Automatic upgrade failed.'),
    );
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining('npm install -g agent-skills-standard@2.0.0'),
    );
  });

  it('should retry with @latest if versioned install fails', async () => {
    vi.mocked(execSync).mockReturnValueOnce('2.0.0\n'); // version check
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('Version not found');
    }); // versioned install fails
    vi.mocked(execSync).mockReturnValueOnce('success\n'); // retry with @latest succeeds
    vi.mocked(execSync).mockReturnValueOnce('2.0.0\n'); // verification succeeds

    vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('npm');

    await upgradeCommand.run({});

    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining('npm install -g agent-skills-standard@latest'),
      expect.anything(),
    );
    expect(consoleLogMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'Failed to install v2.0.0. Retrying with @latest...',
      ),
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
      expect.stringContaining(
        'Invalid version received from npm: not-a-version',
      ),
    );
  });

  describe('detectPackageManager', () => {
    const originalArgv = process.argv;

    afterEach(() => {
      delete (process as any).argv;
      process.argv = originalArgv;
    });

    it('should detect pnpm from user agent', () => {
      process.env.npm_config_user_agent = 'pnpm/1.0.0';
      process.argv = ['node', 'ags'];
      expect(upgradeCommand.detectPackageManager()).toBe('pnpm');
    });

    it('should detect yarn from user agent', () => {
      process.env.npm_config_user_agent = 'yarn/1.0.0';
      process.argv = ['node', 'ags'];
      expect(upgradeCommand.detectPackageManager()).toBe('yarn');
    });

    it('should detect pnpm if execution path contains it', () => {
      delete process.env.npm_config_user_agent;
      process.argv = ['node', '/path/to/pnpm/bin/ags'];
      expect(upgradeCommand.detectPackageManager()).toBe('pnpm');
    });

    it('should fallback to npm if path is generic', () => {
      delete process.env.npm_config_user_agent;
      process.argv = ['node', '/usr/local/bin/ags'];
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('none');
      });
      expect(upgradeCommand.detectPackageManager()).toBe('npm');
    });

    it('should detect npm if path contains nvm', () => {
      delete process.env.npm_config_user_agent;
      process.argv = ['node', '/Users/test/.nvm/versions/node/v18.0.0/bin/ags'];
      expect(upgradeCommand.detectPackageManager()).toBe('npm');
    });

    it('should detect npm if path contains npm', () => {
      delete process.env.npm_config_user_agent;
      process.argv = ['node', '/usr/local/lib/node_modules/npm/bin/ags-cli'];
      expect(upgradeCommand.detectPackageManager()).toBe('npm');
    });

    it('should handle falsy process.argv[1] by defaulting to empty string and returning npm', () => {
      delete process.env.npm_config_user_agent;
      process.argv = ['node'];
      expect(upgradeCommand.detectPackageManager()).toBe('npm');
    });

    it('should fallback to npm even if pnpm version check succeeds but path is not pnpm', () => {
      delete process.env.npm_config_user_agent;
      process.argv = ['node', '/usr/local/bin/ags'];
      vi.mocked(execSync).mockImplementationOnce(() => '8.0.0\n' as any);
      expect(upgradeCommand.detectPackageManager()).toBe('npm');
    });

    it('should return pnpm in fallback if pnpm version check succeeds and path is pnpm', () => {
      delete process.env.npm_config_user_agent;
      const execPathMock = new String('/usr/local/bin/ags');
      let includesCallCount = 0;
      (execPathMock as unknown as { includes: (searchString: string) => boolean }).includes = function(searchString: string) {
        if (searchString === 'pnpm') {
          includesCallCount++;
          return includesCallCount > 1;
        }
        return '/usr/local/bin/ags'.includes(searchString);
      };
      process.argv = ['node', execPathMock as unknown as string];
      vi.mocked(execSync).mockImplementationOnce(() => '8.0.0\n' as any);
      expect(upgradeCommand.detectPackageManager()).toBe('pnpm');
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

  describe('detectAndFixStaleShim additional branches', () => {
    it('should warn and exit if correct shim does not exist', async () => {
      vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('pnpm');

      vi.mocked(execSync).mockImplementation((command: unknown) => {
        const text = String(command);
        if (text.includes('npm view agent-skills-standard version')) return '2.0.0\n' as any;
        if (text.startsWith('pnpm add -g agent-skills-standard@2.0.0')) return '' as any;
        if (text === 'pnpm root -g') return '/Users/test/Library/pnpm/global/5/node_modules\n' as any;
        if (text.startsWith('node -p')) return '2.0.0\n' as any;
        if (text === 'ags -V') return '1.0.0\n' as any;
        if (text === 'type -a ags') return 'ags is /Users/test/Library/pnpm/bin/ags\n' as any;
        if (text === 'pnpm bin -g') return '/Users/test/Library/pnpm\n' as any;
        return '' as any;
      });

      // Stale shim exists, but correct shim does not exist
      vi.mocked(existsSync).mockImplementation((p) => {
        const s = String(p);
        if (s.endsWith('/bin/ags')) return true;
        if (s.endsWith('/pnpm/ags')) return false;
        return false;
      });
      vi.mocked(readFileSync).mockReturnValue('stale content');

      await upgradeCommand.run({});

      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('Correct shim not found at /Users/test/Library/pnpm/ags'),
      );
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });

    it('should not remove the stale shim if user declines', async () => {
      vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('pnpm');

      vi.mocked(execSync).mockImplementation((command: unknown) => {
        const text = String(command);
        if (text.includes('npm view agent-skills-standard version')) return '2.0.0\n' as any;
        if (text.startsWith('pnpm add -g agent-skills-standard@2.0.0')) return '' as any;
        if (text === 'pnpm root -g') return '/Users/test/Library/pnpm/global/5/node_modules\n' as any;
        if (text.startsWith('node -p')) return '2.0.0\n' as any;
        if (text === 'ags -V') return '1.0.0\n' as any;
        if (text === 'type -a ags') return 'ags is /Users/test/Library/pnpm/bin/ags\n' as any;
        if (text === 'pnpm bin -g') return '/Users/test/Library/pnpm\n' as any;
        return '' as any;
      });

      vi.mocked(existsSync).mockImplementation((p) => {
        const s = String(p);
        return s.endsWith('/bin/ags') || s.endsWith('/pnpm/ags');
      });
      vi.mocked(readFileSync).mockReturnValue('stale content');
      vi.mocked(inquirer.prompt).mockResolvedValue({ remove: false });

      await upgradeCommand.run({});

      expect(unlinkSync).not.toHaveBeenCalled();
      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('comes before'),
      );
    });

    it('should catch errors and call printShimPathHint on failure', async () => {
      vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('pnpm');

      vi.mocked(execSync).mockImplementation((command: unknown) => {
        const text = String(command);
        if (text.includes('npm view agent-skills-standard version')) return '2.0.0\n' as any;
        if (text.startsWith('pnpm add -g agent-skills-standard@2.0.0')) return '' as any;
        if (text === 'pnpm root -g') return '/Users/test/Library/pnpm/global/5/node_modules\n' as any;
        if (text.startsWith('node -p')) return '2.0.0\n' as any;
        if (text === 'ags -V') return '1.0.0\n' as any;
        if (text === 'type -a ags') return 'ags is /Users/test/Library/pnpm/bin/ags\n' as any;
        if (text === 'pnpm bin -g') {
          throw new Error('pnpm bin failed');
        }
        return '' as any;
      });

      await upgradeCommand.run({});

      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('comes before'),
      );
    });
  });

  describe('detectAndFixStaleShim and getInstalledVersionFromPnpm edge cases', () => {
    it('should handle failure in getInstalledVersionFromPnpm gracefully', async () => {
      vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('pnpm');

      vi.mocked(execSync).mockImplementation((command: unknown) => {
        const text = String(command);
        if (text.includes('npm view agent-skills-standard version')) return '2.0.0\n' as any;
        if (text.startsWith('pnpm add -g agent-skills-standard@2.0.0')) return '' as any;
        if (text === 'pnpm root -g') throw new Error('pnpm root failed');
        return '' as any;
      });

      await upgradeCommand.run({});

      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('installed package still reports vunknown'),
      );
    });

    it('should return null if getInstalledVersionFromPnpm command returns empty output', async () => {
      vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('pnpm');

      vi.mocked(execSync).mockImplementation((command: unknown) => {
        const text = String(command);
        if (text.includes('npm view agent-skills-standard version')) return '2.0.0\n' as any;
        if (text.startsWith('pnpm add -g agent-skills-standard@2.0.0')) return '' as any;
        if (text === 'pnpm root -g') return '/Users/test/Library/pnpm/global/5/node_modules\n' as any;
        if (text.startsWith('node -p')) return ' \n' as any;
        return '' as any;
      });

      await upgradeCommand.run({});

      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('installed package still reports vunknown'),
      );
    });

    it('should handle type -a ags failure gracefully', async () => {
      vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('pnpm');

      vi.mocked(execSync).mockImplementation((command: unknown) => {
        const text = String(command);
        if (text.includes('npm view agent-skills-standard version')) return '2.0.0\n' as any;
        if (text.startsWith('pnpm add -g agent-skills-standard@2.0.0')) return '' as any;
        if (text === 'pnpm root -g') return '/Users/test/Library/pnpm/global/5/node_modules\n' as any;
        if (text.startsWith('node -p')) return '2.0.0\n' as any;
        if (text === 'ags -V') return '1.0.0\n' as any;
        if (text === 'type -a ags') throw new Error('type -a failed');
        if (text === 'pnpm bin -g') return '/Users/test/Library/pnpm\n' as any;
        return '' as any;
      });

      // No stale shim file — falls through to PATH hint (Case 1)
      vi.mocked(existsSync).mockReturnValue(false);

      await upgradeCommand.run({});

      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining("pnpm installed v2.0.0, but 'ags -V' still reports v1.0.0."),
      );
    });

    it('should skip removal if stale shim content is already correct', async () => {
      vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('pnpm');

      vi.mocked(execSync).mockImplementation((command: unknown) => {
        const text = String(command);
        if (text.includes('npm view agent-skills-standard version')) return '2.0.0\n' as any;
        if (text.startsWith('pnpm add -g agent-skills-standard@2.0.0')) return '' as any;
        if (text === 'pnpm root -g') return '/Users/test/Library/pnpm/global/5/node_modules\n' as any;
        if (text.startsWith('node -p')) return '2.0.0\n' as any;
        if (text === 'ags -V') return '1.0.0\n' as any;
        if (text === 'type -a ags') return 'ags is /Users/test/Library/pnpm/bin/ags\n' as any;
        if (text === 'pnpm bin -g') return '/Users/test/Library/pnpm\n' as any;
        return '' as any;
      });

      vi.mocked(existsSync).mockReturnValue(true);
      // Shim content has the correct version
      vi.mocked(readFileSync).mockReturnValue('agent-skills-standard@2.0.0');

      await upgradeCommand.run({});

      expect(unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('Additional upgrade command verification and check updates error cases', () => {
    it('should print error and return if npm view throws an exception', async () => {
      vi.mocked(execSync).mockImplementation((cmd: unknown) => {
        if (String(cmd).includes('npm view')) {
          throw new Error('npm offline');
        }
        return '' as any;
      });

      await upgradeCommand.run({});

      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check for updates via npm.'),
      );
    });

    it('should show stale warning when npm installed success but ags -V still reports old version', async () => {
      vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('npm');

      vi.mocked(execSync).mockImplementation((command: unknown) => {
        const text = String(command);
        if (text.includes('npm view agent-skills-standard version')) return '2.0.0\n' as any;
        if (text.startsWith('npm install -g agent-skills-standard@2.0.0')) return '' as any;
        if (text === 'ags -V') return '1.0.0\n' as any;
        if (text === 'type -a ags') return 'ags is /usr/local/bin/ags\n' as any;
        return '' as any;
      });

      await upgradeCommand.run({});

      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining("Installation complete, but 'ags -V' still reports v1.0.0."),
      );
      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('Resolved binary:\nags is /usr/local/bin/ags'),
      );
    });

    it('should verify silently if ags -V throws during npm upgrade verification', async () => {
      vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('npm');

      vi.mocked(execSync).mockImplementation((command: unknown) => {
        const text = String(command);
        if (text.includes('npm view agent-skills-standard version')) return '2.0.0\n' as any;
        if (text.startsWith('npm install -g agent-skills-standard@2.0.0')) return '' as any;
        if (text === 'ags -V') throw new Error('Command failed');
        return '' as any;
      });

      await upgradeCommand.run({});

      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade command finished.'),
      );
      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('Unable to verify version automatically'),
      );
    });

    it('should verify silently if ags -V throws during pnpm upgrade verification', async () => {
      vi.spyOn(upgradeCommand, 'detectPackageManager').mockReturnValue('pnpm');

      vi.mocked(execSync).mockImplementation((command: unknown) => {
        const text = String(command);
        if (text.includes('npm view agent-skills-standard version')) return '2.0.0\n' as any;
        if (text.startsWith('pnpm add -g agent-skills-standard@2.0.0')) return '' as any;
        if (text === 'pnpm root -g') return '/Users/test/Library/pnpm/global/5/node_modules\n' as any;
        if (text.startsWith('node -p')) return '2.0.0\n' as any;
        if (text === 'ags -V') throw new Error('Command failed');
        return '' as any;
      });

      await upgradeCommand.run({});

      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('Upgrade command finished.'),
      );
      expect(consoleLogMock).toHaveBeenCalledWith(
        expect.stringContaining('Installed version verified via pnpm; please check the shell command'),
      );
    });
  });
});
