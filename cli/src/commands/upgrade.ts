import { execSync } from 'child_process';
import pc from 'picocolors';
import pkg from '../../package.json';
import { GithubService } from '../services/GithubService';

export class UpgradeCommand {
  private githubService = new GithubService();
  private owner = 'HoangNguyen0403';
  private repo = 'agent-skills-standard';

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

    console.log(pc.yellow(`📦 Upgrading to v${latestVersion}...`));

    try {
      // We assume global installation for the upgrade command to make sense
      const command = 'npm install -g agent-skills-standard@latest';
      console.log(pc.gray(`  Running: ${command}`));

      execSync(command, { stdio: 'inherit' });

      console.log(pc.green(`✅ Successfully upgraded to v${latestVersion}!`));
      console.log(
        pc.cyan(
          "Please restart your terminal if the version doesn't update immediately.",
        ),
      );
    } catch (error) {
      console.error(
        pc.red('❌ Upgrade failed:'),
        error instanceof Error ? error.message : String(error),
      );
      console.log(
        pc.yellow(
          'Tip: You might need to run with sudo if you encounter permission errors.',
        ),
      );
    }
  }
}
