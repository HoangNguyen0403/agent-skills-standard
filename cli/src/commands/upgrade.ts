import { execSync } from 'child_process';
import pc from 'picocolors';
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
    let latestVersion: string | null = null;

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
          console.log(
            '\n' +
              pc.yellow(
                `⚠️  Installation complete, but 'ags -V' still reports v${installedVersion}.`,
              ),
          );
          console.log(
            pc.gray(
              '   This is common if multiple versions are installed or your shell needs a restart.',
            ),
          );
          console.log(
            pc.cyan(
              `👉 Recommendation: Restart your terminal or run: ${pc.bold(this.getUpgradeCommand(pm, latestVersion) + ' --force')}`,
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
