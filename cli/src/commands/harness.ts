import { Command } from 'commander';
import { HarnessSetupService } from '../services/harness/HarnessSetupService';
import { HarnessDiscoveryService } from '../services/harness/HarnessDiscoveryService';
import { FleetCommand, registerFleetCommands } from './fleet';

export interface HarnessSetupOptions {
  paseoCommand?: string;
  origin?: string;
  stateDir?: string;
}

export interface HarnessCommonOptions {
  stateDir?: string;
}

export function sanitizeError(err: unknown): string {
  let message = err instanceof Error ? err.message : String(err);
  // Redact URLs with credentials (e.g., https://user:pass@host)
  message = message.replace(
    /(https?:\/\/)[^:@\s]+:[^@\s]+@/gi,
    '$1[REDACTED]@',
  );
  // Redact token-like or password-like parameters
  message = message.replace(
    /(password|token|secret|key|bearer)\s*[:=]\s*[^\s,]+/gi,
    '$1=[REDACTED]',
  );
  message = message.replace(
    /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi,
    'Bearer [REDACTED]',
  );
  return message;
}

export class HarnessCommand {
  private setupServiceFactory: (stateDir?: string) => HarnessSetupService;
  private discoveryServiceFactory: () => HarnessDiscoveryService;
  private exitFn: (code: number) => void;
  private printFn: (msg: string) => void;

  constructor(
    setupServiceFactory?: (stateDir?: string) => HarnessSetupService,
    discoveryServiceFactory?: () => HarnessDiscoveryService,
    exitFn?: (code: number) => void,
    printFn?: (msg: string) => void,
  ) {
    this.setupServiceFactory =
      setupServiceFactory ?? ((stateDir) => new HarnessSetupService(stateDir));
    this.discoveryServiceFactory =
      discoveryServiceFactory ?? (() => new HarnessDiscoveryService());
    this.exitFn =
      exitFn ??
      ((code) => {
        process.exitCode = code;
      });
    this.printFn =
      printFn ??
      ((msg) => {
        console.log(msg);
      });
  }

  printJson(data: unknown): void {
    this.printFn(JSON.stringify(data, null, 2));
  }

  exit(code: number): void {
    this.exitFn(code);
  }

  async setup(options: HarnessSetupOptions): Promise<void> {
    if (!options.paseoCommand) {
      this.exit(1);
      this.printJson({
        error: 'Missing required option: --paseo-command <absolute-path>',
      });
      return;
    }

    try {
      const service = this.setupServiceFactory(options.stateDir);
      const result = await service.setup({
        schemaVersion: 1,
        paseoCommand: options.paseoCommand,
        ...(options.origin !== undefined ? { origin: options.origin } : {}),
      });
      this.printJson(result);
    } catch (err: unknown) {
      this.exit(1);
      this.printJson({ error: sanitizeError(err) });
    }
  }

  async status(options: HarnessCommonOptions): Promise<void> {
    try {
      const service = this.setupServiceFactory(options.stateDir);
      const result = await service.status();
      this.printJson(result);
      if (!result.configured) {
        this.exit(1);
      }
    } catch (err: unknown) {
      this.exit(1);
      this.printJson({ error: sanitizeError(err) });
    }
  }

  async discover(options: HarnessCommonOptions): Promise<void> {
    try {
      const setupService = this.setupServiceFactory(options.stateDir);
      const statusResult = await setupService.status();
      if (!statusResult.configured || !statusResult.config) {
        this.exit(1);
        this.printJson({
          schemaVersion: 1,
          complete: false,
          hosts: [],
          error:
            'Harness is not configured. Run `ags harness setup --paseo-command <path>` first.',
        });
        return;
      }

      const discoveryService = this.discoveryServiceFactory();
      const inventory = await discoveryService.discover(statusResult.config);
      this.printJson(inventory);
      if (!inventory.complete) {
        this.exit(1);
      }
    } catch (err: unknown) {
      this.exit(1);
      this.printJson({
        schemaVersion: 1,
        complete: false,
        hosts: [],
        error: sanitizeError(err),
      });
    }
  }

  async uninstall(options: HarnessCommonOptions): Promise<void> {
    try {
      const service = this.setupServiceFactory(options.stateDir);
      const result = await service.uninstall();
      this.printJson(result);
      if (!result.removed) {
        this.exit(1);
      }
    } catch (err: unknown) {
      this.exit(1);
      this.printJson({ error: sanitizeError(err) });
    }
  }
}

function configureHarnessOutput(
  cmd: Command,
  printFn: (msg: string) => void,
  exitFn: (code: number) => void,
): void {
  cmd.exitOverride((err) => {
    if (
      err.code === 'commander.helpDisplayed' ||
      err.code === 'commander.version'
    ) {
      return;
    }
    exitFn(err.exitCode || 1);
    throw err;
  });

  cmd.configureOutput({
    writeOut: (str) => {
      process.stdout.write(str);
    },
    writeErr: () => {
      // Suppress duplicate text on stderr
    },
    outputError: (str) => {
      const cleaned = str.replace(/^error:\s*/i, '').trim();
      printFn(JSON.stringify({ error: sanitizeError(cleaned) }, null, 2));
      exitFn(1);
    },
  });
}

export function registerHarnessCommands(
  program: Command,
  commandInstance?: HarnessCommand,
  exitFn?: (code: number) => void,
  printFn?: (msg: string) => void,
  fleetCommandInstance?: FleetCommand,
): Command {
  const effectiveExit =
    exitFn ??
    ((code) => {
      process.exitCode = code;
    });
  const effectivePrint =
    printFn ??
    ((msg) => {
      console.log(msg);
    });

  const harnessCmd = program
    .command('harness')
    .description(
      'Manage global Paseo harness configuration and read-only fleet inventory discovery. Does not execute experiments or install runtime extensions.',
    );

  const harnessCommand =
    commandInstance ??
    new HarnessCommand(undefined, undefined, effectiveExit, effectivePrint);

  configureHarnessOutput(harnessCmd, effectivePrint, effectiveExit);

  const setupCmd = harnessCmd
    .command('setup')
    .description(
      'One-time per-user/per-host harness configuration (read-only discovery, no runtime execution)',
    )
    .requiredOption(
      '--paseo-command <path>',
      'Absolute path to Paseo executable',
    )
    .option('--origin <target>', 'Optional default host or origin alias')
    .option(
      '--state-dir <path>',
      'Custom absolute state directory (overrides default user config)',
    )
    .action(async (options: HarnessSetupOptions) => {
      await harnessCommand.setup(options);
    });
  configureHarnessOutput(setupCmd, effectivePrint, effectiveExit);

  const statusCmd = harnessCmd
    .command('status')
    .description('Check global harness configuration status')
    .option(
      '--state-dir <path>',
      'Custom absolute state directory (overrides default user config)',
    )
    .action(async (options: HarnessCommonOptions) => {
      await harnessCommand.status(options);
    });
  configureHarnessOutput(statusCmd, effectivePrint, effectiveExit);

  const discoverCmd = harnessCmd
    .command('discover')
    .description(
      'Perform read-only project and host inventory discovery across reachable Paseo targets',
    )
    .option(
      '--state-dir <path>',
      'Custom absolute state directory (overrides default user config)',
    )
    .action(async (options: HarnessCommonOptions) => {
      await harnessCommand.discover(options);
    });
  configureHarnessOutput(discoverCmd, effectivePrint, effectiveExit);

  const uninstallCmd = harnessCmd
    .command('uninstall')
    .description('Remove owned global harness configuration and receipt')
    .option(
      '--state-dir <path>',
      'Custom absolute state directory (overrides default user config)',
    )
    .action(async (options: HarnessCommonOptions) => {
      await harnessCommand.uninstall(options);
    });
  configureHarnessOutput(uninstallCmd, effectivePrint, effectiveExit);
  registerFleetCommands(
    harnessCmd,
    fleetCommandInstance,
    effectiveExit,
    effectivePrint,
  );

  return harnessCmd;
}
