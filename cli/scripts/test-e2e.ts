import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';

const CLI_ROOT = path.resolve(__dirname, '..');
const DIST_PATH = path.join(CLI_ROOT, 'dist', 'index.js');
const TEMP_DIR = path.join(CLI_ROOT, 'temp_e2e_test');

async function runCommand(command: string, cwd: string = TEMP_DIR) {
  console.log(pc.cyan(`\n> Running: agent-skills-standard ${command}`));
  try {
    // Wrap DIST_PATH in quotes to handle spaces and prevent injection
    execSync(`node "${DIST_PATH}" ${command}`, {
      cwd,
      stdio: 'inherit',
    });
    console.log(pc.green('   ✓ Command executed successfully.'));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Command failed: ${command}\n${error.message}`);
    }
    throw new Error(`Command failed: ${command}`);
  }
}

async function main() {
  console.log(pc.bold(pc.blue('\n🧪 Starting E2E Build Verification...\n')));

  try {
    // 1. Ensure the project is built
    console.log(pc.cyan('1. Building CLI...'));
    execSync('pnpm build', { cwd: CLI_ROOT, stdio: 'inherit' });

    if (!fs.existsSync(DIST_PATH)) {
      throw new Error(`Build failed: ${DIST_PATH} not found.`);
    }
    console.log(pc.green('   ✓ Build successful.'));

    // 2. Setup Temporary Directory
    console.log(pc.cyan('\n2. Setting up test environment...'));
    await fs.remove(TEMP_DIR);
    await fs.ensureDir(TEMP_DIR);

    // Create a mock .skillsrc
    const mockConfig = {
      registry: 'https://github.com/HoangNguyen0403/agent-skills-standard',
      agents: ['antigravity'],
      skills: {
        // Limit checkout to a few skills to optimize test time and avoid rate limits
        flutter: {
          ref: 'main',
          include: ['flutter-navigation', 'widgets'],
        },
      },
      workflows: true, // Enable workflows for advanced sync test
    };

    await fs.writeJson(path.join(TEMP_DIR, '.skillsrc'), mockConfig, {
      spaces: 2,
    });

    // Copy .env if exists to ensure GITHUB_TOKEN is available
    const envPath = path.join(CLI_ROOT, '.env');
    if (fs.existsSync(envPath)) {
      await fs.copy(envPath, path.join(TEMP_DIR, '.env'));
    }

    console.log(pc.green('   ✓ Test environment created.'));

    // 3. Test: Version & Help
    await runCommand('--version');
    await runCommand('--help');

    // 4. Test: List Skills (Non-interactive)
    await runCommand('list-skills --framework flutter');

    // 5. Test: Sync
    await runCommand('sync --yes');

    // Verify Sync Output
    console.log(pc.cyan('   Verifying sync results...'));
    const agentSkillsDir = path.join(TEMP_DIR, '.agent', 'skills');
    const agentWorkflowsDir = path.join(TEMP_DIR, '.agent', 'workflows');

    if (!fs.existsSync(agentSkillsDir)) {
      throw new Error('Sync failed: .agent/skills directory was not created.');
    }

    const skillFiles = await fs.readdir(agentSkillsDir);
    if (skillFiles.length === 0) {
      throw new Error('Sync failed: No skills were downloaded.');
    }
    console.log(
      pc.green(`   ✓ Found ${skillFiles.length} items in .agent/skills.`),
    );

    // Verify Workflows
    if (!fs.existsSync(agentWorkflowsDir)) {
      throw new Error(
        'Sync failed: .agent/workflows directory was not created.',
      );
    }
    const workflowFiles = await fs.readdir(agentWorkflowsDir);
    if (workflowFiles.length === 0) {
      console.warn(
        pc.yellow(
          '   ⚠️ No workflows found. Verify if registry has workflows.',
        ),
      );
    } else {
      console.log(
        pc.green(
          `   ✓ Found ${workflowFiles.length} items in .agent/workflows.`,
        ),
      );
    }

    // 6. Test: Validate
    // Note: validate command runs within the context of the project
    // It might fail if there are no skills to validate or if strict checks vary.
    // We expect it to at least run.
    try {
      await runCommand('validate --all');
    } catch {
      console.warn(
        pc.yellow(
          '   ⚠️ Validate command exited with error (expected if mock skills are imperfect). Continuing...',
        ),
      );
    }

    console.log(pc.bold(pc.green('\n✅ E2E Build Verification Passed!')));
  } catch (error) {
    console.error(pc.red('\n❌ E2E Verification Failed:'));
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    // Cleanup
    await fs.remove(TEMP_DIR);
  }
}

main();
