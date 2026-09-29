import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DoctorCheck, DoctorService } from '../../services/DoctorService';
import { DoctorCommand } from '../doctor';

describe('DoctorCommand', () => {
  let service: DoctorService;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    process.exitCode = undefined;
    service = {
      runChecks: vi
        .fn()
        .mockResolvedValue([
          { name: 'config', status: 'ok', evidence: '.skillsrc parsed' },
        ]),
    } as unknown as DoctorService;
  });

  afterEach(() => {
    vi.mocked(console.log).mockRestore();
    process.exitCode = undefined;
  });

  it('1. --json prints exactly one line that parses to { schema_version: 1, kind: "doctor.report", data: ... } with data.healthy matching checks', async () => {
    const cmd = new DoctorCommand(service);
    await cmd.run({ json: true });
    expect(vi.mocked(console.log)).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(vi.mocked(console.log).mock.calls[0][0]);
    expect(parsed).toEqual({
      schema_version: 1,
      kind: 'doctor.report',
      data: expect.objectContaining({
        schema_version: 1,
        healthy: true,
      }),
    });

    vi.mocked(console.log).mockClear();
    vi.mocked(service.runChecks).mockResolvedValueOnce([
      { name: 'config', status: 'fail', evidence: 'missing' },
    ]);
    await cmd.run({ json: true });
    expect(vi.mocked(console.log)).toHaveBeenCalledTimes(1);
    const parsedUnhealthy = JSON.parse(vi.mocked(console.log).mock.calls[0][0]);
    expect(parsedUnhealthy.data.healthy).toBe(false);
  });

  it('2. Unhealthy + no --exit-on-fail -> process.exitCode stays undefined', async () => {
    vi.mocked(service.runChecks).mockResolvedValue([
      { name: 'config', status: 'fail', evidence: 'missing' },
    ]);
    const cmd = new DoctorCommand(service);
    await cmd.run({});

    expect(process.exitCode).toBeUndefined();
  });

  it('3. Unhealthy + --exit-on-fail -> process.exitCode === 1; Healthy + --exit-on-fail -> stays undefined', async () => {
    vi.mocked(service.runChecks).mockResolvedValue([
      { name: 'config', status: 'fail', evidence: 'missing' },
    ]);
    const cmd = new DoctorCommand(service);
    await cmd.run({ exitOnFail: true });
    expect(process.exitCode).toBe(1);

    process.exitCode = undefined;
    vi.mocked(service.runChecks).mockResolvedValue([
      { name: 'config', status: 'ok', evidence: 'ok' },
    ]);
    await cmd.run({ exitOnFail: true });
    expect(process.exitCode).toBeUndefined();
  });

  it('4. --fix --json without --yes: the stubbed fix apply is not called and confirm is not called', async () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    const confirm = vi.fn().mockResolvedValue(true);
    vi.mocked(service.runChecks).mockResolvedValue([
      {
        name: 'mcp',
        status: 'fail',
        evidence: 'missing',
        fix: { description: 'fix mcp', apply },
      } as DoctorCheck,
    ]);

    const cmd = new DoctorCommand(service, () => false, confirm);
    await cmd.run({ fix: true, json: true });

    expect(apply).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('5. --fix --yes: apply is called once, then runChecks is called a second time (re-check)', async () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    vi.mocked(service.runChecks)
      .mockResolvedValueOnce([
        {
          name: 'mcp',
          status: 'fail',
          evidence: 'missing',
          fix: { description: 'fix mcp', apply },
        } as DoctorCheck,
      ])
      .mockResolvedValueOnce([
        { name: 'mcp', status: 'ok', evidence: 'registered' } as DoctorCheck,
      ]);

    const cmd = new DoctorCommand(service);
    await cmd.run({ fix: true, yes: true });

    expect(apply).toHaveBeenCalledTimes(1);
    expect(service.runChecks).toHaveBeenCalledTimes(2);
  });

  it('6. --fix in a TTY without --yes: confirm is called with message containing fix description; answer false -> apply not called', async () => {
    const apply = vi.fn().mockResolvedValue(undefined);
    const confirm = vi.fn().mockResolvedValue(false);
    vi.mocked(service.runChecks).mockResolvedValue([
      {
        name: 'mcp',
        status: 'fail',
        evidence: 'missing',
        fix: { description: 'register MCP for claude', apply },
      } as DoctorCheck,
    ]);

    const cmd = new DoctorCommand(service, () => true, confirm);
    await cmd.run({ fix: true });

    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('register MCP for claude'),
    );
    expect(apply).not.toHaveBeenCalled();
  });

  it('7. Human output (no --json) contains a line Summary: <ok> ✓ <warn> ⚠ <fail> ✗ <skip> ◦', async () => {
    vi.mocked(service.runChecks).mockResolvedValue([
      { name: 'config', status: 'ok', evidence: 'ok' },
      { name: 'lockfile', status: 'warn', evidence: 'warn' },
      { name: 'mcp', status: 'fail', evidence: 'fail' },
      { name: 'hooks', status: 'skip', evidence: 'skip' },
    ]);

    const cmd = new DoctorCommand(service);
    await cmd.run({});

    const calls = vi.mocked(console.log).mock.calls.map((c) => c[0]);
    const summaryLine = calls.find(
      (line: string) => typeof line === 'string' && line.includes('Summary:'),
    );
    expect(summaryLine).toBeDefined();
    expect(summaryLine).toContain('Summary: 1 ✓ 1 ⚠ 1 ✗ 1 ◦');
  });
});
