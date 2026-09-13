import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import path from 'path';
import pc from 'picocolors';
import inquirer from 'inquirer';
import pkg from '../../package.json';

/**
 * Command for upgrading the `agent-skills-standard` CLI to the latest version.
 * It checks the latest version on npm and performs the upgrade using the detected package manager.
 */
export class UpgradeCommand {
  private currentVersion = pkg.version;

  /**
   * Executes the upgrade flow.
   * @param options Command options, including `dryRun` to check for updates without installing.
   */
  async run(options: { dryRun?: boolean }) {
    console.log(pc.cyan('🔍 Checking for updates...'));

    const currentVersion = this.currentVersion;
    let latestVersion: string;

    try {
      latestVersion = execSync('npm view agent-skills-standard version', {
        encoding: 'utf8',
      }).trim();
    } catch {
      console.log(pc.red('❌ Failed to check for updates via npm.'));
      return;
    }

    if (!latestVersion) {
      console.log(pc.red('❌ Could not determine latest version.'));
      return;
    }

    // Validate semver to prevent command injection or unexpected behavior
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
    if (!semverRegex.test(latestVersion)) {
      console.log(
        pc.red(`❌ Invalid version received from npm: ${latestVersion}`),
      );
      return;
    }

    console.log(pc.gray(`  Current version: ${currentVersion}`));
    console.log(pc.gray(`  Latest version:  ${latestVersion}`));

    if (currentVersion === latestVersion) {
      console.log(pc.green('✨ You are already using the latest version!'));
      return;
    }

    if (options.dryRun) {
      console.log(
        pc.yellow(
          `🚀 A new version (${latestVersion}) is available! Run without --dry-run to upgrade.`,
        ),
      );
      return;
    }

    const pm = this.detectPackageManager();
    const upgradeCmd = this.getUpgradeCommand(pm, latestVersion);

    console.log(pc.yellow(`📦 Upgrading to v${latestVersion} using ${pm}...`));

    try {
      console.log(pc.gray(`  Running: ${upgradeCmd}`));

      try {
        execSync(upgradeCmd, { stdio: 'inherit' });
      } catch {
        console.log(
          pc.yellow(
            `⚠️  Failed to install v${latestVersion}. Retrying with @latest...`,
          ),
        );
        const fallbackCmd = this.getUpgradeCommand(pm, 'latest');
        execSync(fallbackCmd, { stdio: 'inherit' });
      }

      if (pm === 'pnpm') {
        const installedVersion = this.getInstalledVersionFromPnpm(latestVersion);

        if (installedVersion !== latestVersion) {
          console.log(
            '\n' +
              pc.red(
                `❌ pnpm install completed, but the installed package still reports v${installedVersion ?? 'unknown'}.`,
              ),
          );
          console.log(
            pc.gray(
              '   This means the global install itself is stale or incomplete, not just the shell shim.',
            ),
          );
          this.printShellMismatchHint();
          return;
        }

        try {
          const output = execSync('ags -V', {
            encoding: 'utf8',
            stdio: 'pipe',
          }).trim();
          const lines = output.split('\n');
          const shellVersion = lines[lines.length - 1].trim();

          if (shellVersion.includes(latestVersion)) {
            console.log(
              pc.green(`✅ Successfully upgraded to v${latestVersion}!`),
            );
          } else {
            console.log(
              '\n' +
                pc.yellow(
                  `⚠️  pnpm installed v${latestVersion}, but 'ags -V' still reports v${shellVersion}.`,
                ),
            );
            console.log(
              pc.gray(
                '   Your shell is still resolving a stale shim or PATH entry.',
              ),
            );
            await this.detectAndFixStaleShim(latestVersion);
          }
        } catch {
          console.log(pc.green('\n✅ Upgrade command finished.'));
          console.log(
            pc.gray(
              "   (Installed version verified via pnpm; please check the shell command with 'ags -V')",
            ),
          );
        }
      } else {
        // Soft Verification
        try {
          const output = execSync('ags -V', {
            encoding: 'utf8',
            stdio: 'pipe',
          }).trim();
          const lines = output.split('\n');
          const installedVersion = lines[lines.length - 1].trim();

          if (installedVersion.includes(latestVersion)) {
            console.log(
              pc.green(`✅ Successfully upgraded to v${latestVersion}!`),
            );
          } else {
            const resolvedBinary = execSync('type -a ags', {
              encoding: 'utf8',
              stdio: 'pipe',
            }).trim();

            console.log(
              '\n' +
                pc.yellow(
                  `⚠️  Installation complete, but 'ags -V' still reports v${installedVersion}.`,
                ),
            );
            console.log(
              pc.gray(
                '   This usually means your shell is still resolving a stale shim or PATH entry.',
              ),
            );
            console.log(pc.gray(`   Resolved binary:\n${resolvedBinary}`));
            console.log(
              pc.cyan(
                `👉 Recommendation: make sure ${pc.bold('~/Library/pnpm')} comes before ${pc.bold('~/Library/pnpm/bin')} in PATH, then run ${pc.bold('hash -r')} and recheck with 'ags -V'.`,
              ),
            );
          }
        } catch {
          console.log(pc.green('\n✅ Upgrade command finished.'));
          console.log(
            pc.gray(
              "   (Unable to verify version automatically, please check with 'ags -V')",
            ),
          );
        }
      }

      console.log(
        pc.cyan(
          '\nNote: You may need to restart your terminal session for changes to take effect.',
        ),
      );
    } catch {
      console.log('\n' + pc.red('❌ Automatic upgrade failed.'));
      this.printManualInstructions(pm, latestVersion);
    }
  }

  private detectPackageManager(): 'npm' | 'pnpm' | 'yarn' {
    const execPath = process.argv[1] || '';

    // 1. Check if we are running from a pnpm global bin
    if (
      execPath.includes('pnpm') ||
      (process.env.npm_config_user_agent || '').includes('pnpm')
    ) {
      return 'pnpm';
    }

    // 2. Check if we are running from a yarn global bin
    if (
      execPath.includes('yarn') ||
      (process.env.npm_config_user_agent || '').includes('yarn')
    ) {
      return 'yarn';
    }

    // 3. Check for nvm or npm paths
    if (execPath.includes('nvm') || execPath.includes('npm')) {
      return 'npm';
    }

    // Fallback: Check for existing binaries, but default to npm for maximum safety
    try {
      execSync('pnpm --version', { stdio: 'ignore' });
      // Only return pnpm if we're reasonably sure it's configured (avoiding PATH issues)
      if (execPath.includes('pnpm')) return 'pnpm';
    } catch {
      // pnpm not available or not configured for this path
    }

    return 'npm';
  }

  private getUpgradeCommand(
    pm: 'npm' | 'pnpm' | 'yarn',
    version: string,
  ): string {
    switch (pm) {
      case 'pnpm':
        return `pnpm add -g agent-skills-standard@${version}`;
      case 'yarn':
        return `yarn global add agent-skills-standard@${version}`;
      default:
        // Default to npm install -g
        return `npm install -g agent-skills-standard@${version}`;
    }
  }

  private getInstalledVersionFromPnpm(
    version: string,
  ): string | null {
    try {
      const globalRoot = execSync('pnpm root -g', {
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim();
      const packageJsonPath = path.join(
        globalRoot,
        '.pnpm',
        `agent-skills-standard@${version}`,
        'node_modules',
        'agent-skills-standard',
        'package.json',
      );
      const output = execSync(
        `node -p "require(${JSON.stringify(packageJsonPath)}).version"`,
        {
          encoding: 'utf8',
          stdio: 'pipe',
        },
      ).trim();
      return output || null;
    } catch {
      return null;
    }
  }

  /**
   * Shown when the pnpm package store itself is stale/incomplete (Case 1).
   * Falls back to a resolved-binary hint and PATH guidance.
   */
  private printShellMismatchHint(): void {
    try {
      const resolvedBinary = execSync('type -a ags', {
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim();
      console.log(pc.gray(`   Resolved binary:\n${resolvedBinary}`));
    } catch {
      /* non-fatal */
    }
    this.printShimPathHint();
  }

  /**
   * Prints the standard PATH-order fix recommendation.
   */
  private printShimPathHint(): void {
    console.log(
      pc.cyan(
        `👉 Make sure ${pc.bold('~/Library/pnpm')} comes before ${pc.bold('~/Library/pnpm/bin')} in PATH, then run ${pc.bold('hash -r')} and recheck with ${pc.bold('ags -V')}.`,
      ),
    );
  }

  /**
   * Called when the pnpm store is correct but `ags -V` still reports an old
   * version (Case 2 — stale shim).  Attempts to locate and remove the stale
   * shim file at <pnpm-bin>/bin/ags, which is created by older pnpm versions
   * using a content-addressed hash path that is never updated on reinstall.
   */
  private async detectAndFixStaleShim(latestVersion: string): Promise<void> {
    // Show resolved binary for diagnostics
    try {
      const resolvedBinary = execSync('type -a ags', {
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim();
      console.log(pc.gray(`   Resolved binary:\n${resolvedBinary}`));
    } catch {
      /* non-fatal */
    }

    try {
      const pnpmBin = execSync('pnpm bin -g', {
        encoding: 'utf8',
        stdio: 'pipe',
      }).trim();

      // Old pnpm shims live in <pnpm-bin>/bin/ags; new ones in <pnpm-bin>/ags
      const staleShimPath = path.join(pnpmBin, 'bin', 'ags');

      if (!existsSync(staleShimPath)) {
        this.printShimPathHint();
        return;
      }

      const shimContent = readFileSync(staleShimPath, 'utf8');

      // If the shim already embeds the correct version tag it is not stale
      if (shimContent.includes(`agent-skills-standard@${latestVersion}`)) {
        this.printShimPathHint();
        return;
      }

      // Confirm the replacement shim exists before offering to remove the stale one
      const correctShimPath = path.join(pnpmBin, 'ags');
      if (!existsSync(correctShimPath)) {
        console.log(
          pc.yellow(
            `⚠️  Correct shim not found at ${correctShimPath}. Re-run: ${pc.bold('pnpm add -g agent-skills-standard@latest')}`,
          ),
        );
        this.printShimPathHint();
        return;
      }

      console.log(
        '\n' + pc.yellow(`🔍 Stale shim detected: ${staleShimPath}`),
      );
      console.log(
        pc.gray(
          '   It points to an old install path and will always report the wrong version.',
        ),
      );

      const { remove } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'remove',
          message: `Remove stale shim at ${staleShimPath}?`,
          default: true,
        },
      ]);

      if (remove) {
        unlinkSync(staleShimPath);
        console.log(pc.green('✅ Stale shim removed.'));
        console.log(
          pc.cyan(
            `   Run ${pc.bold('hash -r')} then ${pc.bold('ags -V')} to confirm the correct version.`,
          ),
        );
      } else {
        this.printShimPathHint();
      }
    } catch {
      // Non-fatal — fall back to manual guidance
      this.printShimPathHint();
    }
  }

  private printManualInstructions(
    pm: 'npm' | 'pnpm' | 'yarn',
    version: string,
  ) {
    const isWindows = process.platform === 'win32';
    const sudoPrefix = isWindows ? '' : 'sudo ';

    console.log(pc.yellow('Possible reasons:'));
    console.log(pc.gray(' - Permission denied (requires sudo/administrator)'));
    console.log(pc.gray(' - Network connectivity issues'));
    console.log(pc.gray(` - ${pm} is not configured for global installs`));

    console.log(
      '\n' + pc.cyan('👉 Please run the following command manually:'),
    );
    console.log(
      pc.white(
        pc.bold(`  ${sudoPrefix}${this.getUpgradeCommand(pm, version)}`),
      ),
    );

    if (pm !== 'npm') {
      console.log(pc.gray('\nAlternative (npm):'));
      console.log(
        pc.gray(
          `  ${sudoPrefix}npm install -g agent-skills-standard@${version}`,
        ),
      );
    }

    console.log(pc.gray('\nOr run via npx (no install required):'));
    console.log(pc.gray(`  npx agent-skills-standard@${version} sync`));
  }
}
