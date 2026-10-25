import { Command } from 'commander';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HarnessSetupService } from '../../services/harness/HarnessSetupService';
import { EvidenceService } from '../../services/harness/runtime/EvidenceService';
import { FleetCoordinator } from '../../services/harness/runtime/FleetCoordinator';
import { FleetPolicyService } from '../../services/harness/runtime/FleetPolicyService';
import { IntegrationService } from '../../services/harness/runtime/IntegrationService';
import { ReleaseService } from '../../services/harness/runtime/ReleaseService';
import {
  AGS_FLEET_RECEIPT_END,
  AGS_FLEET_RECEIPT_START,
  formatReceiptMarker,
} from '../../services/harness/runtime/remoteWorkerProtocol';
import {
  computeRuntimeManifestDigest,
  RUNTIME_CLOSURE_LIMITS,
  RuntimeClosureManifestSchema,
} from '../../services/harness/runtime/RuntimeManifest';
import type { RuntimeClosureManifest } from '../../services/harness/runtime/RuntimeManifest';
import {
  SUPERVISOR_ASSET_ID,
  WORKER_ASSET_ID,
} from '../../services/harness/runtime/RunnerAssets';
import { RuntimeStore } from '../../services/harness/runtime/RuntimeStore';
import {
  FleetConfig,
  FleetTask,
  HarnessBundle,
  SignedApproval,
  SignedWorkerReceipt,
} from '../../services/harness/runtime/RuntimeTypes';
import { createFleetTestConfig } from '../../services/harness/runtime/__tests__/FleetTestFixtures';
import {
  FleetCommand,
  MAX_FLEET_INPUT_SIZE,
  readBoundedJsonFile,
  registerFleetCommands,
} from '../fleet';
import { registerHarnessCommands } from '../harness';

describe('FleetCommand', () => {
  let tempStateDir: string;
  let exitCode: number | undefined;
  let printedLogs: string[];

  const mockExit = (code: number) => {
    exitCode = code;
  };

  const mockPrint = (msg: string) => {
    printedLogs.push(msg);
  };

  const parseLastJson = <T = unknown>(): T => {
    expect(printedLogs.length).toBeGreaterThan(0);
    return JSON.parse(printedLogs[printedLogs.length - 1]) as T;
  };

  beforeEach(async () => {
    tempStateDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'ags-fleet-cmd-test-'),
    );
    exitCode = undefined;
    printedLogs = [];

    const setup = new HarnessSetupService(tempStateDir);
    await setup.setup({
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
    });
  });

  afterEach(async () => {
    if (tempStateDir && (await fs.pathExists(tempStateDir))) {
      await fs.remove(tempStateDir);
    }
  });

  const createProgram = (customCommand?: FleetCommand) => {
    const program = new Command();
    program.name('ags');
    // Injects customCommand through registerHarnessCommands without duplicate registration
    registerHarnessCommands(
      program,
      undefined,
      mockExit,
      mockPrint,
      customCommand,
    );
    return program;
  };

  describe('readBoundedJsonFile helper', () => {
    it('rejects missing files', async () => {
      await expect(
        readBoundedJsonFile('/non/existent/file.json'),
      ).rejects.toThrow('File not found');
    });

    it('rejects non-regular files and symlinks', async () => {
      const targetFile = path.join(tempStateDir, 'regular.json');
      await fs.writeFile(targetFile, '{}');
      const symlinkFile = path.join(tempStateDir, 'symlink.json');
      await fs.symlink(targetFile, symlinkFile);

      await expect(readBoundedJsonFile(symlinkFile)).rejects.toThrow(
        'Path must be a regular file',
      );
    });

    it('rejects oversized files', async () => {
      const hugeFile = path.join(tempStateDir, 'huge.json');
      await fs.writeFile(hugeFile, Buffer.alloc(100));

      await expect(readBoundedJsonFile(hugeFile, 50)).rejects.toThrow(
        'exceeds maximum allowed size',
      );
    });

    it('rejects invalid JSON with stable error code', async () => {
      const badFile = path.join(tempStateDir, 'bad.json');
      await fs.writeFile(badFile, '{ bad: json }');

      await expect(readBoundedJsonFile(badFile)).rejects.toThrow(
        'is not valid JSON',
      );
    });
  });

  describe('configure', () => {
    it('fails when --file option is missing', async () => {
      const program = createProgram();
      await expect(
        program.parseAsync([
          'node',
          'ags',
          'harness',
          'fleet',
          'configure',
          '--state-dir',
          tempStateDir,
        ]),
      ).rejects.toThrow();
    });

    it('configures valid fleet policy using core test fixtures and outputs confirmation JSON', async () => {
      const validConfig = createFleetTestConfig(tempStateDir);
      const configFile = path.join(tempStateDir, 'valid-config.json');
      await fs.writeFile(
        configFile,
        JSON.stringify(validConfig, null, 2),
        'utf8',
      );

      const program = createProgram();
      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'configure',
        '--file',
        configFile,
        '--state-dir',
        tempStateDir,
      ]);

      const res = parseLastJson<{
        success: boolean;
        generation: number;
        policyDigest: string;
      }>();
      expect(res.success).toBe(true);
      expect(res.generation).toBe(validConfig.generation);
      expect(typeof res.policyDigest).toBe('string');
    });

    it('fails closed when given an invalid schema file', async () => {
      const invalidConfig = { invalid: 'schema', generation: 'not-a-number' };
      const configFile = path.join(tempStateDir, 'invalid-config.json');
      await fs.writeFile(configFile, JSON.stringify(invalidConfig), 'utf8');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'configure',
        '--file',
        configFile,
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      const res = parseLastJson<{
        success: boolean;
        error: string;
        code: string;
      }>();
      expect(res.success).toBe(false);
      expect(res.code).toBe('INVALID_CONFIG');
    });
  });

  describe('run command planning and execution gates', () => {
    it('defaults to dry-run plan mode when --execute is absent', async () => {
      const validConfig = createFleetTestConfig(tempStateDir);
      const store = new RuntimeStore(tempStateDir);
      const policyService = new FleetPolicyService(store);
      await policyService.configure(validConfig);

      const taskFile = path.join(tempStateDir, 'task.json');
      const sampleTask: FleetTask = {
        schemaVersion: 1,
        id: 'task-1',
        project: {
          hostId: 'origin',
          projectId: 'p1',
          rootPath: tempStateDir,
          logicalProjectId: 'p1',
        },
        sourceRef: 'HEAD',
        prompt: 'Fix the bug',
        replaySafe: true,
        phase: 'train',
        deadlineMs: 30000,
        toolCallAllowance: 10,
        k: 1,
        baseline: {
          schemaVersion: 1,
          id: 'bundle-1',
          scope: { kind: 'project', key: 'p1' },
          guidance: 'Base guidance',
          platforms: ['darwin', 'linux'],
          ompVersions: ['18.12.6'],
        },
        verification: {
          argv: ['npm', 'test'],
          files: {},
        },
      };
      await fs.writeFile(taskFile, JSON.stringify(sampleTask), 'utf8');

      const program = createProgram();
      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'run',
        '--file',
        taskFile,
        '--state-dir',
        tempStateDir,
      ]);

      const plan = parseLastJson<{ ready: boolean; status: string }>();
      expect(plan.status).toBeDefined();
    });

    it('rejects malformed task schema before execution', async () => {
      const badTaskFile = path.join(tempStateDir, 'bad-task.json');
      await fs.writeFile(
        badTaskFile,
        JSON.stringify({ schemaVersion: 999, id: 'bad' }),
        'utf8',
      );

      const program = createProgram();
      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'run',
        '--file',
        badTaskFile,
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      const res = parseLastJson<{ success: boolean; code: string }>();
      expect(res.success).toBe(false);
      expect(res.code).toBe('INVALID_TASK');
    });
  });

  describe('heldout evaluation and run routing', () => {
    const sampleTask = () => ({
      schemaVersion: 1,
      id: 'task-eval-1',
      project: {
        hostId: 'origin',
        projectId: 'p1',
        rootPath: tempStateDir,
        logicalProjectId: 'p1',
      },
      sourceRef: 'HEAD',
      prompt: 'Fix the bug',
      replaySafe: true,
      phase: 'heldout',
      deadlineMs: 30000,
      toolCallAllowance: 10,
      k: 1,
      baseline: {
        schemaVersion: 1,
        id: 'bundle-1',
        scope: { kind: 'project', key: 'p1' },
        guidance: 'Base guidance',
        platforms: ['darwin', 'linux'],
        ompVersions: ['18.12.6'],
      },
      verification: {
        argv: [process.execPath, 'verify.js'],
        files: { 'verify.js': 'process.exit(0);\n' },
      },
    });
    const writeEvaluationInput = async (): Promise<string> => {
      const inputPath = path.join(tempStateDir, 'evaluation-input.json');
      await fs.writeFile(
        inputPath,
        JSON.stringify({
          schemaVersion: 1,
          id: 'eval-1',
          tasks: [sampleTask()],
          releaseDigest: 'sha256:release-1',
        }),
        'utf8',
      );
      return inputPath;
    };

    const createCoordinatorProgram = (coordinator: FleetCoordinator): Command =>
      createProgram(
        new FleetCommand({
          coordinatorFactory: () => coordinator,
          exitFn: mockExit,
          printFn: mockPrint,
        }),
      );

    it('previews an evaluation without publishing draft attempt ids', async () => {
      const calls: Array<{ method: string; options: unknown }> = [];
      const coordinator = {
        evaluateTasks: async (_input: unknown, options?: unknown) => {
          calls.push({ method: 'evaluateTasks', options });
          return {
            mode: 'preview',
            draftDigest: 'sha256:draft-1',
            draft: true,
            cases: [
              {
                taskDigest: 'sha256:task-1',
                hostId: 'host-1',
                projectId: 'p1',
                logicalProjectId: 'logical-1',
              },
              {
                caseId: 'draft-case-id',
                taskDigest: 'sha256:task-2',
                hostId: 'host-1',
                projectId: 'p1',
                logicalProjectId: 'logical-1',
              },
            ],
          };
        },
      } as unknown as FleetCoordinator;
      const inputPath = await writeEvaluationInput();
      await createCoordinatorProgram(coordinator).parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'evaluate',
        '--file',
        inputPath,
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBeUndefined();
      const printed = parseLastJson<{
        mode: string;
        draft: boolean;
        draftDigest: string;
        cases: Array<Record<string, unknown>>;
      }>();
      expect(printed.mode).toBe('preview');
      expect(printed.draft).toBe(true);
      expect(printed.draftDigest).toBe('sha256:draft-1');
      expect(printed).not.toHaveProperty('planDigest');
      expect(printed.cases[0]).toEqual({
        taskDigest: 'sha256:task-1',
        hostId: 'host-1',
        projectId: 'p1',
        logicalProjectId: 'logical-1',
      });
      expect(printed.cases[1]).toEqual({
        caseId: 'draft-case-id',
        taskDigest: 'sha256:task-2',
        hostId: 'host-1',
        projectId: 'p1',
        logicalProjectId: 'logical-1',
      });
      expect(JSON.stringify(printed)).not.toMatch(/AttemptId|attemptIds/);
      expect(calls).toEqual([
        { method: 'evaluateTasks', options: { execute: false } },
      ]);
    });

    it('requires exactly one evaluation selector', async () => {
      const program = createCoordinatorProgram(
        {} as unknown as FleetCoordinator,
      );
      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'evaluate',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      const printed = parseLastJson<{ code: string }>();
      expect(printed.code).toBe('INVALID_ARGUMENTS');
    });

    const frozenPlanResult = (
      mode: 'preview' | 'executed',
      extras: Record<string, unknown> = {},
    ) => ({
      mode,
      planDigest: 'sha256:plan-1',
      plan: {
        schemaVersion: 1,
        id: 'plan-1',
        releaseDigest: 'sha256:release-1',
        baselineDigest: 'sha256:baseline-1',
        policyDigest: 'sha256:policy-1',
        runtimeDigest: 'sha256:runtime-1',
        requiredProjects: ['logical-1'],
        minImprovement: 0.1,
        maxRegressions: 0,
        cases: [
          {
            id: 'case-1',
            taskDigest: 'sha256:task-1',
            hostId: 'host-1',
            projectId: 'p1',
            logicalProjectId: 'logical-1',
            accountId: 'account-1',
            sourceRevision: 'a'.repeat(40),
            evaluatorDigest: 'sha256:evaluator-1',
            runtimeDigest: 'sha256:runtime-1',
            baselineAttemptId: '00000000-0000-4000-8000-000000000001',
            candidateAttemptId: '00000000-0000-4000-8000-000000000002',
          },
        ],
      },
      ...extras,
    });

    const evaluatePlan = async (
      result: unknown,
      execute = false,
    ): Promise<void> => {
      const coordinator = {
        evaluatePlan: async () => result,
      } as unknown as FleetCoordinator;
      const args = [
        'node',
        'ags',
        'harness',
        'fleet',
        'evaluate',
        '--plan-digest',
        'sha256:plan-1',
      ];
      if (execute) args.push('--execute');
      args.push('--state-dir', tempStateDir);
      await createCoordinatorProgram(coordinator).parseAsync(args);
    };

    it('previews the frozen plan with safe case metadata and mode', async () => {
      await evaluatePlan(frozenPlanResult('preview'));

      expect(exitCode).toBeUndefined();
      const printed = parseLastJson<{
        mode: string;
        planDigest: string;
        cases: Array<Record<string, unknown>>;
      }>();
      expect(printed.mode).toBe('preview');
      expect(printed.planDigest).toBe('sha256:plan-1');
      expect(printed).not.toHaveProperty('draft');
      expect(printed.cases[0]).toEqual({
        caseId: 'case-1',
        taskDigest: 'sha256:task-1',
        hostId: 'host-1',
        projectId: 'p1',
        logicalProjectId: 'logical-1',
      });
      expect(JSON.stringify(printed)).not.toContain(
        '00000000-0000-4000-8000-00000000000',
      );
    });

    it('rejects preview plans that contain execution results', async () => {
      await evaluatePlan(frozenPlanResult('preview', { attemptsSummary: [] }));

      expect(exitCode).toBe(1);
      expect(parseLastJson<{ code: string }>().code).toBe(
        'INVALID_COORDINATOR_RESULT',
      );
    });

    it.each(['unresolved', 'blocked'] as const)(
      'fails an executed %s plan with a complete eligible evaluation',
      async (state) => {
        await evaluatePlan(
          frozenPlanResult('executed', {
            evaluation: {
              schemaVersion: 1,
              id: 'evaluation-1',
              releaseDigest: 'sha256:release-1',
              planDigest: 'sha256:plan-1',
              eligible: true,
              reasonCodes: [],
              projects: ['logical-1'],
              baselinePassed: 1,
              candidatePassed: 1,
              criticalRegressions: [],
            },
            attemptsSummary: [
              {
                logicalProjectId: 'logical-1',
                baselinePassed: true,
                candidatePassed: false,
                attemptIds: [
                  '00000000-0000-4000-8000-000000000001',
                  '00000000-0000-4000-8000-000000000002',
                ],
                state,
              },
            ],
          }),
          true,
        );

        expect(exitCode).toBe(1);
        expect(
          parseLastJson<{ attemptsSummary: Array<{ state: string }> }>()
            .attemptsSummary[0].state,
        ).toBe(state);
      },
    );

    it('fails an executed plan with an ineligible finalized evaluation', async () => {
      await evaluatePlan(
        frozenPlanResult('executed', {
          evaluation: {
            schemaVersion: 1,
            id: 'evaluation-1',
            releaseDigest: 'sha256:release-1',
            planDigest: 'sha256:plan-1',
            eligible: false,
            reasonCodes: ['INSUFFICIENT_EVIDENCE'],
            projects: ['logical-1'],
            baselinePassed: 1,
            candidatePassed: 0,
            criticalRegressions: [],
          },
          attemptsSummary: [
            {
              logicalProjectId: 'logical-1',
              baselinePassed: true,
              candidatePassed: false,
              attemptIds: [
                '00000000-0000-4000-8000-000000000001',
                '00000000-0000-4000-8000-000000000002',
              ],
              state: 'completed',
            },
          ],
        }),
        true,
      );

      expect(exitCode).toBe(1);
    });

    it('accepts an executed completed eligible plan', async () => {
      await evaluatePlan(
        frozenPlanResult('executed', {
          evaluation: {
            schemaVersion: 1,
            id: 'evaluation-1',
            releaseDigest: 'sha256:release-1',
            planDigest: 'sha256:plan-1',
            eligible: true,
            reasonCodes: [],
            projects: ['logical-1'],
            baselinePassed: 1,
            candidatePassed: 1,
            criticalRegressions: [],
          },
          attemptsSummary: [
            {
              logicalProjectId: 'logical-1',
              baselinePassed: true,
              candidatePassed: true,
              attemptIds: [
                '00000000-0000-4000-8000-000000000001',
                '00000000-0000-4000-8000-000000000002',
              ],
              state: 'completed',
            },
          ],
        }),
        true,
      );

      expect(exitCode).toBeUndefined();
      expect(parseLastJson<{ mode: string }>().mode).toBe('executed');
    });
    it('accepts a recovered attempt as terminal success for a frozen plan', async () => {
      await evaluatePlan(
        frozenPlanResult('executed', {
          evaluation: {
            schemaVersion: 1,
            id: 'evaluation-1',
            releaseDigest: 'sha256:release-1',
            planDigest: 'sha256:plan-1',
            eligible: true,
            reasonCodes: [],
            projects: ['logical-1'],
            baselinePassed: 1,
            candidatePassed: 1,
            criticalRegressions: [],
          },
          attemptsSummary: [
            {
              logicalProjectId: 'logical-1',
              baselinePassed: true,
              candidatePassed: true,
              attemptIds: [
                '00000000-0000-4000-8000-000000000001',
                '00000000-0000-4000-8000-000000000002',
              ],
              state: 'recovered',
            },
          ],
        }),
        true,
      );

      expect(exitCode).toBeUndefined();
      expect(
        parseLastJson<{ attemptsSummary: Array<{ state: string }> }>()
          .attemptsSummary[0].state,
      ).toBe('recovered');
    });
    it.each([
      ['recovered', undefined],
      ['unresolved', 1],
      ['blocked', 1],
    ] as const)(
      'applies plan-selector exit semantics to file result state %s',
      async (state, expectedExit) => {
        const inputPath = await writeEvaluationInput();
        const coordinator = {
          evaluateTasks: async () => ({
            mode: 'executed',
            draft: false,
            planDigest: 'sha256:plan-1',
            cases: [
              {
                caseId: 'case-1',
                taskDigest: 'sha256:task-1',
                hostId: 'host-1',
                projectId: 'p1',
                logicalProjectId: 'logical-1',
                baselineAttemptId: '00000000-0000-4000-8000-000000000001',
                candidateAttemptId: '00000000-0000-4000-8000-000000000002',
              },
            ],
            evaluation: {
              schemaVersion: 1,
              id: 'evaluation-1',
              releaseDigest: 'sha256:release-1',
              planDigest: 'sha256:plan-1',
              eligible: true,
              reasonCodes: [],
              projects: ['logical-1'],
              baselinePassed: 1,
              candidatePassed: 1,
              criticalRegressions: [],
            },
            attemptsSummary: [
              {
                logicalProjectId: 'logical-1',
                baselinePassed: true,
                candidatePassed: true,
                attemptIds: [
                  '00000000-0000-4000-8000-000000000001',
                  '00000000-0000-4000-8000-000000000002',
                ],
                state,
              },
            ],
          }),
        } as unknown as FleetCoordinator;

        await createCoordinatorProgram(coordinator).parseAsync([
          'node',
          'ags',
          'harness',
          'fleet',
          'evaluate',
          '--file',
          inputPath,
          '--execute',
          '--state-dir',
          tempStateDir,
        ]);

        expect(exitCode).toBe(expectedExit);
        expect(
          parseLastJson<{
            mode: string;
            attemptsSummary: Array<{ state: string }>;
          }>().attemptsSummary[0].state,
        ).toBe(state);
      },
    );

    it('rejects a file execution result missing finalized evaluation data', async () => {
      const inputPath = await writeEvaluationInput();
      const coordinator = {
        evaluateTasks: async () => ({
          mode: 'executed',
          draft: false,
          planDigest: 'sha256:plan-1',
          cases: [
            {
              caseId: 'case-1',
              taskDigest: 'sha256:task-1',
              hostId: 'host-1',
              projectId: 'p1',
              logicalProjectId: 'logical-1',
              baselineAttemptId: '00000000-0000-4000-8000-000000000001',
              candidateAttemptId: '00000000-0000-4000-8000-000000000002',
            },
          ],
          attemptsSummary: [
            {
              logicalProjectId: 'logical-1',
              baselinePassed: true,
              candidatePassed: true,
              attemptIds: [
                '00000000-0000-4000-8000-000000000001',
                '00000000-0000-4000-8000-000000000002',
              ],
              state: 'completed',
            },
          ],
        }),
      } as unknown as FleetCoordinator;

      await createCoordinatorProgram(coordinator).parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'evaluate',
        '--file',
        inputPath,
        '--execute',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      expect(parseLastJson<{ code: string }>().code).toBe(
        'INVALID_COORDINATOR_RESULT',
      );
    });

    it('rejects malformed frozen plan case data instead of reporting empty success', async () => {
      const result = frozenPlanResult('preview');
      (result.plan.cases as unknown[])[0] = { id: 'case-1' };
      await evaluatePlan(result);

      expect(exitCode).toBe(1);
      expect(parseLastJson<{ code: string }>().code).toBe(
        'INVALID_COORDINATOR_RESULT',
      );
    });

    it('passes the candidate release digest into an executed run', async () => {
      const calls: Array<{ task: unknown; options: unknown }> = [];
      const coordinator = {
        run: async (task: unknown, options?: unknown) => {
          calls.push({ task, options });
          return { passed: false, runId: 'run-1', budgetId: 'budget-1' };
        },
      } as unknown as FleetCoordinator;

      const taskPath = path.join(tempStateDir, 'heldout-task.json');
      await fs.writeFile(taskPath, JSON.stringify(sampleTask()), 'utf8');

      const program = createCoordinatorProgram(coordinator);
      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'run',
        '--file',
        taskPath,
        '--execute',
        '--release-digest',
        'sha256:release-1',
        '--state-dir',
        tempStateDir,
      ]);

      expect(calls).toHaveLength(1);
      expect(calls[0].options).toEqual({ releaseDigest: 'sha256:release-1' });
      expect(exitCode).toBe(1);
    });

    it('exits nonzero for a denied run outcome', async () => {
      const coordinator = {
        run: async () => ({
          passed: true,
          outcome: 'denied',
          runId: 'run-1',
          budgetId: 'budget-1',
        }),
      } as unknown as FleetCoordinator;
      const taskPath = path.join(tempStateDir, 'denied-heldout-task.json');
      await fs.writeFile(taskPath, JSON.stringify(sampleTask()), 'utf8');

      await createCoordinatorProgram(coordinator).parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'run',
        '--file',
        taskPath,
        '--execute',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
    });

    it('gates doctor on the supported flag, not a status label', async () => {
      const coordinator = {
        doctor: async () => ({
          status: 'unhealthy',
          supported: false,
          reasonCodes: ['DOCKER_UNAVAILABLE'],
        }),
      } as unknown as FleetCoordinator;

      const program = createCoordinatorProgram(coordinator);
      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'doctor',
        '--state-dir',
        tempStateDir,
      ]);
      expect(exitCode).toBe(1);
    });

    it('resolves scope-only context without an OMP version', async () => {
      const integrationService = {
        resolveScope: async () => ({
          hostId: 'host-1',
          projectId: 'p1',
          logicalProjectId: 'logical-1',
          rootPath: tempStateDir,
        }),
      } as unknown as IntegrationService;

      const program = createProgram(
        new FleetCommand({
          integrationServiceFactory: () => integrationService,
          exitFn: mockExit,
          printFn: mockPrint,
        }),
      );
      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'context',
        '--cwd',
        tempStateDir,
        '--scope-only',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBeUndefined();
      const printed = parseLastJson<{
        success: boolean;
        scope: { logicalProjectId: string };
      }>();
      expect(printed.success).toBe(true);
      expect(printed.scope.logicalProjectId).toBe('logical-1');
    });
  });

  describe('runtime pin command', () => {
    const createManifest = (
      packageCount = 0,
      variant = 'base',
    ): RuntimeClosureManifest => {
      const content: Omit<RuntimeClosureManifest, 'runtimeDigest'> = {
        schemaVersion: 3,
        closureRoot: tempStateDir,
        sdk: {
          modulePath: path.join(tempStateDir, 'sdk.js'),
          moduleSha256:
            variant === 'replacement' ? '2'.repeat(64) : 'a'.repeat(64),
          packageName: 'test-sdk',
          packageVersion: '1.0.0',
        },
        packages: Array.from({ length: packageCount }, (_, index) => ({
          name: `package-${index}`,
          version: '1.0.0',
          relPath: `node_modules/${'x'.repeat(128)}/package-${index}/package.json`,
          packageJsonSha256: 'b'.repeat(64),
        })),
        files: [
          {
            relPath: 'node_modules/test-sdk/index.js',
            sha256: 'c'.repeat(64),
            bytes: 1,
            executable: false,
          },
        ],
        symlinks: [],
        locks: [],
        executables: {
          node: {
            path: process.execPath,
            sha256: 'd'.repeat(64),
            version: 'v22.0.0',
          },
          bun: {
            path: process.execPath,
            sha256: 'd'.repeat(64),
            version: '1.0.0',
          },
          git: {
            path: process.execPath,
            sha256: 'd'.repeat(64),
            version: '2.0.0',
          },
          docker: {
            path: process.execPath,
            sha256: 'd'.repeat(64),
            version: '27.0.0',
          },
        },
        assets: {
          supervisor: {
            id: SUPERVISOR_ASSET_ID,
            sha256: 'e'.repeat(64),
            bytes: 1,
          },
          worker: {
            id: WORKER_ASSET_ID,
            path: path.join(tempStateDir, 'worker.js'),
            sha256: 'f'.repeat(64),
            bytes: 1,
            modules: [],
          },
        },
        policy: {
          dockerImage: `example/runtime@sha256:${'1'.repeat(64)}`,
          allowedToolNames: ['sandbox_exec'],
          network: 'none',
          readOnlyRoot: true,
          capDropAll: true,
          noNewPrivileges: true,
          user: '1000:1000',
        },
      };
      return {
        ...content,
        runtimeDigest: computeRuntimeManifestDigest(content),
      };
    };
    const runtimeConfig = (
      manifest: RuntimeClosureManifest,
      manifestPath: string,
    ) => ({
      nodeCommand: process.execPath,
      bunCommand: process.execPath,
      sdkModule: manifest.sdk.modulePath,
      dockerCommand: process.execPath,
      gitCommand: process.execPath,
      image: manifest.policy.dockerImage,
      ompVersion: '0.13.0',
      sdkDigest: manifest.sdk.moduleSha256,
      manifestFile: manifestPath,
      manifestDigest: manifest.runtimeDigest,
    });
    const runtimeSpec = (
      manifestPath: string,
      expectedManifestDigest?: string,
    ) => ({
      nodeCommand: process.execPath,
      bunCommand: process.execPath,
      sdkModule: path.join(tempStateDir, 'sdk.js'),
      dockerCommand: process.execPath,
      gitCommand: process.execPath,
      image: `example/runtime@sha256:${'1'.repeat(64)}`,
      ompVersion: '0.13.0',
      manifestFile: manifestPath,
      ...(expectedManifestDigest ? { expectedManifestDigest } : {}),
    });
    it('plans a runtime pin without probing assets or writing the manifest', async () => {
      const manifestPath = path.join(tempStateDir, 'runtime-manifest.json');
      const inputPath = path.join(tempStateDir, 'runtime-spec.json');
      await fs.writeFile(
        inputPath,
        JSON.stringify({
          nodeCommand: process.execPath,
          bunCommand: process.execPath,
          sdkModule: path.join(tempStateDir, 'sdk.js'),
          dockerCommand: process.execPath,
          gitCommand: process.execPath,
          image: 'example/runtime@sha256:' + 'a'.repeat(64),
          ompVersion: '0.13.0',
          manifestFile: manifestPath,
        }),
      );
      const runtimeManifestFactory = vi.fn(async () => {
        throw new Error('builder must not be called during metadata-only plan');
      });
      const command = new FleetCommand({
        runtimeManifestFactory,
        exitFn: mockExit,
        printFn: mockPrint,
      });
      await createProgram(command).parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'runtime',
        'pin',
        '--file',
        inputPath,
        '--state-dir',
        tempStateDir,
      ]);

      expect(runtimeManifestFactory).not.toHaveBeenCalled();
      expect(await fs.pathExists(manifestPath)).toBe(false);
      expect(
        parseLastJson<{ applied: boolean; action: string }>().applied,
      ).toBe(false);
      expect(parseLastJson<{ action: string }>().action).toBe('create');
    });
    it.skipIf(process.platform !== 'darwin')(
      'accepts a supported Darwin state-directory alias',
      async () => {
        const canonicalRoot = await fs.realpath(tempStateDir);
        expect(canonicalRoot.startsWith('/private/')).toBe(true);
        const aliasRoot = canonicalRoot.slice('/private'.length);
        const manifestPath = path.join(
          aliasRoot,
          'darwin-runtime-manifest.json',
        );
        const inputPath = path.join(tempStateDir, 'darwin-runtime-spec.json');
        await fs.writeFile(
          inputPath,
          JSON.stringify(runtimeSpec(manifestPath)),
          'utf8',
        );
        const factory = vi.fn(async () => {
          throw new Error('metadata-only plan must not build a runtime');
        });

        await createProgram(
          new FleetCommand({
            runtimeManifestFactory: factory,
            exitFn: mockExit,
            printFn: mockPrint,
          }),
        ).parseAsync([
          'node',
          'ags',
          'harness',
          'fleet',
          'runtime',
          'pin',
          '--file',
          inputPath,
          '--state-dir',
          aliasRoot,
        ]);

        expect(exitCode).toBeUndefined();
        expect(factory).not.toHaveBeenCalled();
        expect(parseLastJson<{ applied: boolean }>().applied).toBe(false);
      },
    );
    it('rejects an application symlink in the manifest path', async () => {
      const realParent = path.join(tempStateDir, 'real-parent');
      const linkedParent = path.join(tempStateDir, 'linked-parent');
      await fs.ensureDir(realParent);
      await fs.symlink(realParent, linkedParent);
      const manifestPath = path.join(linkedParent, 'runtime-manifest.json');
      const inputPath = path.join(tempStateDir, 'symlink-runtime-spec.json');
      await fs.writeFile(
        inputPath,
        JSON.stringify(runtimeSpec(manifestPath)),
        'utf8',
      );

      await createProgram(
        new FleetCommand({
          exitFn: mockExit,
          printFn: mockPrint,
        }),
      ).parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'runtime',
        'pin',
        '--file',
        inputPath,
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      expect(parseLastJson<{ code: string }>().code).toBe(
        'INVALID_MANIFEST_PATH',
      );
    });
    it('reads and replaces a valid manifest above the runtime-spec limit', async () => {
      const canonicalStateDir = await fs.realpath(tempStateDir);
      const manifestPath = path.join(
        canonicalStateDir,
        'runtime-manifest.json',
      );
      const inputPath = path.join(canonicalStateDir, 'runtime-spec.json');
      const original = createManifest(RUNTIME_CLOSURE_LIMITS.maxFiles);
      const replacement = createManifest(
        RUNTIME_CLOSURE_LIMITS.maxFiles,
        'replacement',
      );
      const originalBytes = `${JSON.stringify(original, null, 2)}\n`;
      const originalSize = Buffer.byteLength(originalBytes);

      expect(originalSize).toBeGreaterThan(MAX_FLEET_INPUT_SIZE);
      expect(originalSize).toBeLessThan(
        RUNTIME_CLOSURE_LIMITS.maxManifestBytes,
      );
      await fs.writeFile(manifestPath, originalBytes, { mode: 0o600 });
      await fs.writeFile(
        inputPath,
        JSON.stringify(runtimeSpec(manifestPath, original.runtimeDigest)),
        'utf8',
      );

      const runtimeManifestFactory = vi.fn(async () => ({
        manifest: replacement,
        runtime: runtimeConfig(replacement, manifestPath),
        manifestDigest: replacement.runtimeDigest,
      }));
      const applyCommand = new FleetCommand({
        runtimeManifestFactory,
        exitFn: mockExit,
        printFn: mockPrint,
      });
      await createProgram(applyCommand).parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'runtime',
        'pin',
        '--file',
        inputPath,
        '--apply',
        '--state-dir',
        canonicalStateDir,
      ]);

      expect(exitCode).toBeUndefined();
      expect(
        parseLastJson<{ applied: boolean; manifestDigest: string }>().applied,
      ).toBe(true);
      const replacementSize = (await fs.stat(manifestPath)).size;
      expect(replacementSize).toBeGreaterThan(MAX_FLEET_INPUT_SIZE);
      expect(replacementSize).toBeLessThan(
        RUNTIME_CLOSURE_LIMITS.maxManifestBytes,
      );
      const persisted = RuntimeClosureManifestSchema.parse(
        await fs.readJson(manifestPath),
      );
      expect(persisted.runtimeDigest).toBe(replacement.runtimeDigest);
      expect(computeRuntimeManifestDigest(persisted)).toBe(
        replacement.runtimeDigest,
      );

      await fs.writeFile(
        inputPath,
        JSON.stringify(runtimeSpec(manifestPath, replacement.runtimeDigest)),
        'utf8',
      );
      const metadataCommand = new FleetCommand({
        runtimeManifestFactory,
        exitFn: mockExit,
        printFn: mockPrint,
      });
      await createProgram(metadataCommand).parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'runtime',
        'pin',
        '--file',
        inputPath,
        '--state-dir',
        canonicalStateDir,
      ]);

      expect(exitCode).toBeUndefined();
      expect(runtimeManifestFactory).toHaveBeenCalledTimes(1);
      expect(
        parseLastJson<{
          applied: boolean;
          existingManifestDigest: string;
        }>(),
      ).toEqual({
        applied: false,
        manifestFile: manifestPath,
        action: 'replace',
        existingManifestDigest: replacement.runtimeDigest,
        expectedManifestDigest: replacement.runtimeDigest,
      });
    }, 15_000);

    it('rejects an oversized serialized manifest before creating staged files', async () => {
      const canonicalStateDir = await fs.realpath(tempStateDir);
      const manifestPath = path.join(
        canonicalStateDir,
        'runtime-manifest.json',
      );
      const inputPath = path.join(canonicalStateDir, 'runtime-spec.json');
      const manifest = createManifest();
      const originalLimit = RUNTIME_CLOSURE_LIMITS.maxManifestBytes;
      const mutableLimits = RUNTIME_CLOSURE_LIMITS as unknown as {
        maxManifestBytes: number;
      };

      await fs.writeFile(
        inputPath,
        JSON.stringify(runtimeSpec(manifestPath)),
        'utf8',
      );
      mutableLimits.maxManifestBytes = 128;
      try {
        const runtimeManifestFactory = vi.fn(async () => ({
          manifest,
          runtime: runtimeConfig(manifest, manifestPath),
          manifestDigest: manifest.runtimeDigest,
        }));
        const command = new FleetCommand({
          runtimeManifestFactory,
          exitFn: mockExit,
          printFn: mockPrint,
        });
        await createProgram(command).parseAsync([
          'node',
          'ags',
          'harness',
          'fleet',
          'runtime',
          'pin',
          '--file',
          inputPath,
          '--apply',
          '--state-dir',
          canonicalStateDir,
        ]);

        expect(exitCode).toBe(1);
        expect(parseLastJson<{ code: string }>().code).toBe(
          'INVALID_RUNTIME_MANIFEST',
        );
        expect(await fs.pathExists(manifestPath)).toBe(false);
        const stagedFiles = (await fs.readdir(canonicalStateDir)).filter(
          (entry) => entry.startsWith(path.basename(manifestPath)),
        );
        expect(stagedFiles).toEqual([]);
      } finally {
        mutableLimits.maxManifestBytes = originalLimit;
      }
    });
  });

  describe('integration commands', () => {
    const createFakeSources = async (): Promise<{
      paseoHome: string;
      fakeCli: string;
      fakeOmp: string;
    }> => {
      const paseoHome = path.join(tempStateDir, 'paseo-home');
      await fs.ensureDir(paseoHome);
      await fs.writeFile(
        path.join(paseoHome, 'config.json'),
        JSON.stringify({}),
        'utf8',
      );

      const fakeCli = path.join(tempStateDir, 'fake-cli.cjs');
      await fs.writeFile(fakeCli, '#!/usr/bin/env node\n', 'utf8');

      const binDir = path.join(tempStateDir, 'bin');
      await fs.ensureDir(binDir);
      const fakeOmp = path.join(binDir, 'omp');
      await fs.writeFile(fakeOmp, '#!/bin/sh\nprintf "%s\\n" 18.12.6\n', {
        mode: 0o755,
      });

      return { paseoHome, fakeCli, fakeOmp };
    };

    const createIntegrationProgram = (sources: {
      paseoHome: string;
      fakeCli: string;
      fakeOmp: string;
    }): Command => {
      const cmd = new FleetCommand({
        integrationServiceFactory: (store) =>
          new IntegrationService(store, {
            paseoHome: sources.paseoHome,
            cliPath: sources.fakeCli,
            nodeCommand: process.execPath,
            ompVersion: '18.12.6',
          }),
        exitFn: mockExit,
        printFn: mockPrint,
      });
      return createProgram(cmd);
    };

    it('plans integration from explicit trusted sources without writing Paseo config', async () => {
      const sources = await createFakeSources();
      const program = createIntegrationProgram(sources);

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'integration',
        'plan',
        '--paseo-home',
        sources.paseoHome,
        '--omp-binary',
        sources.fakeOmp,
        '--state-dir',
        tempStateDir,
      ]);

      const plan = parseLastJson<{
        status: string;
        launcher: { ompVersion: string; cliPath: string };
        coverage: { synthesizedProviderOverride: boolean };
        jsonPointers: unknown[];
      }>();
      expect(plan.status).toBe('plan');
      expect(plan.launcher.ompVersion).toBe('18.12.6');
      expect(plan.launcher.cliPath).toBe(sources.fakeCli);
      expect(plan.coverage.synthesizedProviderOverride).toBe(true);
      expect(plan.jsonPointers.length).toBeGreaterThan(0);

      expect(
        await fs.readFile(path.join(sources.paseoHome, 'config.json'), 'utf8'),
      ).toBe('{}');
    });

    it('keeps install dry-run as the default', async () => {
      const sources = await createFakeSources();
      const program = createIntegrationProgram(sources);

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'integration',
        'install',
        '--paseo-home',
        sources.paseoHome,
        '--omp-binary',
        sources.fakeOmp,
        '--state-dir',
        tempStateDir,
      ]);

      const result = parseLastJson<{ applied: boolean; plan?: unknown }>();
      expect(result.applied).toBe(false);
      expect(result.plan).toBeDefined();
      expect(
        await fs.pathExists(
          path.join(tempStateDir, 'integration-receipt.json'),
        ),
      ).toBe(false);
    });

    it('returns structured failure JSON when OMP version is missing', async () => {
      const integrationService = {
        context: vi.fn(),
      } as unknown as IntegrationService;
      const integrationServiceFactory = vi.fn(() => integrationService);
      const program = createProgram(
        new FleetCommand({
          integrationServiceFactory,
          exitFn: mockExit,
          printFn: mockPrint,
        }),
      );

      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'context',
        '--cwd',
        tempStateDir,
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      expect(parseLastJson()).toEqual({
        success: false,
        context: null,
        reason: 'MISSING_OMP_VERSION',
      });
      expect(integrationService.context).not.toHaveBeenCalled();
    });
  });

  describe('worker entry point and single-marker transport', () => {
    it('enforces strict XOR: fails if neither request nor control is provided', async () => {
      const program = createProgram();
      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'worker',
        '--state-dir',
        tempStateDir,
      ]);

      expect(exitCode).toBe(1);
      const res = parseLastJson<{ success: boolean; code: string }>();
      expect(res.success).toBe(false);
      expect(res.code).toBe('INVALID_WORKER_ARGS');
    });

    it('enforces strict XOR: fails if both request and control are provided', async () => {
      const program = createProgram();
      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'worker',
        '--state-dir',
        tempStateDir,
        '--request',
        'eyJyZXEiOjF9',
        '--control',
        'eyJjdHJsIjoxfQ==',
      ]);

      expect(exitCode).toBe(1);
      const res = parseLastJson<{ success: boolean; code: string }>();
      expect(res.success).toBe(false);
      expect(res.code).toBe('INVALID_WORKER_ARGS');
    });

    it('emits exactly ONE receipt marker on stdout without trailing duplicate JSON', async () => {
      const mockReceipt: SignedWorkerReceipt = {
        schemaVersion: 1,
        hostId: 'worker-host-1',
        payload: {
          purpose: 'ags-fleet-receipt-v1',
          requestId: 'req-1',
          attemptId: 'att-1',
          generation: 1,
          binding: {
            runId: 'r1',
            budgetId: 'b1',
            taskDigest: 'sha256:task',
            hostId: 'h1',
            projectId: 'p1',
            logicalProjectId: 'p1',
            domain: 'personal',
            accountId: 'acc1',
            provider: 'omp',
            model: 'test',
            sourceRevision: 'abcd',
            harnessDigest: 'sha256:harness',
            evaluatorDigest: 'sha256:eval',
            runtimeDigest: 'sha256:runtime',
            policyDigest: 'sha256:policy',
            phase: 'train',
            stage: 'proposal',
            planDigest: 'sha256:plan',
          },
          workerBootId: 'boot-1',
          observedAt: Date.now(),
          status: 'completed',
          containerIds: [],
        },
        signature: 'c2lnbmF0dXJl',
      };

      const mockCoordinator = {
        handleRemoteRequest: async () => mockReceipt,
      } as unknown as FleetCoordinator;

      const cmd = new FleetCommand({
        coordinatorFactory: () => mockCoordinator,
        exitFn: mockExit,
        printFn: mockPrint,
      });

      const program = createProgram(cmd);
      await program.parseAsync([
        'node',
        'ags',
        'harness',
        'fleet',
        'worker',
        '--state-dir',
        tempStateDir,
        '--request',
        'eyJ0ZXN0IjoxfQ==',
      ]);

      // Exactly ONE stdout output line containing the start and end marker
      expect(printedLogs.length).toBe(1);
      expect(printedLogs[0]).toContain(AGS_FLEET_RECEIPT_START);
      expect(printedLogs[0]).toContain(AGS_FLEET_RECEIPT_END);
      // No duplicate JSON output line
      expect(
        printedLogs.some(
          (l) => l.startsWith('{') && l.includes('"schemaVersion"'),
        ),
      ).toBe(false);
    });
  });
});
