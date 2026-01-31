import { execSync } from 'child_process';
import pc from 'picocolors';
import pkg from '../../package.json';

export class UpgradeCommand {
  async run(options: { dryRun?: boolean }) {
    console.log(pc.cyan('🔍 Checking for updates...'));

    const currentVersion = pkg.version;
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
    const upgradeCmd = this.getUpgradeCommand(pm);

    console.log(pc.yellow(`📦 Upgrading to v${latestVersion} using ${pm}...`));

    try {
      console.log(pc.gray(`  Running: ${upgradeCmd}`));

      execSync(upgradeCmd, { stdio: 'inherit' });

      console.log(pc.green(`✅ Successfully upgraded to v${latestVersion}!`));
      console.log(
        pc.cyan(
          "Please restart your terminal if the version doesn't update immediately.",
        ),
      );
    } catch {
      console.log('\n' + pc.red('❌ Automatic upgrade failed.'));
      this.printManualInstructions(pm);
    }
  }

  private detectPackageManager(): 'npm' | 'pnpm' | 'yarn' {
    const userAgent = process.env.npm_config_user_agent || '';
    if (userAgent.includes('pnpm')) return 'pnpm';
    if (userAgent.includes('yarn')) return 'yarn';

    // Fallback: Check for existing binaries
    try {
      execSync('pnpm --version', { stdio: 'ignore' });
      return 'pnpm';
    } catch {
      try {
        execSync('yarn --version', { stdio: 'ignore' });
        return 'yarn';
      } catch {
        return 'npm';
      }
    }
  }

  private getUpgradeCommand(pm: 'npm' | 'pnpm' | 'yarn'): string {
    switch (pm) {
      case 'pnpm':
        return 'pnpm add -g agent-skills-standard@latest';
      case 'yarn':
        return 'yarn global add agent-skills-standard@latest';
      default:
        return 'npm install -g agent-skills-standard@latest';
    }
  }

  private printManualInstructions(pm: 'npm' | 'pnpm' | 'yarn') {
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
      pc.white(pc.bold(`  ${sudoPrefix}${this.getUpgradeCommand(pm)}`)),
    );

    if (pm !== 'npm') {
      console.log(pc.gray('\nAlternative (npm):'));
      console.log(
        pc.gray(`  ${sudoPrefix}npm install -g agent-skills-standard@latest`),
      );
    }

    console.log(pc.gray('\nOr run via npx (no install required):'));
    console.log(pc.gray(`  npx agent-skills-standard@latest sync`));
  }
}
