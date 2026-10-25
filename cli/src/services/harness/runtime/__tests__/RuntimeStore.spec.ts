import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HarnessSetupService } from '../../HarnessSetupService';
import { RuntimeStore } from '../RuntimeStore';
import { HarnessError } from '../RuntimeTypes';

describe('RuntimeStore', () => {
  let tempBaseDir: string;
  let stateDir: string;
  let setupService: HarnessSetupService;

  beforeEach(async () => {
    tempBaseDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), 'ags-store-test-'),
    );
    stateDir = path.join(tempBaseDir, 'harness-state');

    setupService = new HarnessSetupService(stateDir);
    await setupService.setup({
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
    });
  });

  afterEach(async () => {
    await fs.remove(tempBaseDir);
  });

  it('fails closed when base setup receipt is missing or tampered', async () => {
    const uninitializedDir = path.join(tempBaseDir, 'uninit');
    const store = new RuntimeStore(uninitializedDir);

    await expect(store.read('test', { val: 1 })).rejects.toThrow(HarnessError);
    await expect(store.write('test', { val: 1 })).rejects.toThrow(HarnessError);
  });

  it('rejects unsafe record names with path traversal or illegal characters', () => {
    const store = new RuntimeStore(stateDir, setupService);

    expect(() => store.resolveRecordPath('../escape')).toThrow(HarnessError);
    expect(() => store.resolveRecordPath('dir/name')).toThrow(HarnessError);
    expect(() => store.resolveRecordPath('.')).toThrow(HarnessError);
    expect(() => store.resolveRecordPath('..')).toThrow(HarnessError);
    expect(() => store.resolveRecordPath('invalid name with spaces')).toThrow(
      HarnessError,
    );
    expect(() => store.resolveRecordPath('illegal$char')).toThrow(HarnessError);
  });

  it('reads fallback when file does not exist without mutating caller object', async () => {
    const store = new RuntimeStore(stateDir, setupService);
    const fallback = { defaultVal: 'hello', nested: { count: 0 } };
    const data = await store.read('nonexistent', fallback);

    expect(data).toEqual(fallback);
    expect(data).not.toBe(fallback); // Must be a clone (C9)
  });

  it('writes and reads records atomically', async () => {
    const store = new RuntimeStore(stateDir, setupService);
    const payload = { counter: 42, label: 'test' };

    await store.write('test-record', payload);
    const readBack = await store.read('test-record', { counter: 0, label: '' });

    expect(readBack).toEqual(payload);
  });

  it('refuses to read a store record that is a symlink', async () => {
    const store = new RuntimeStore(stateDir, setupService);
    const targetFile = path.join(tempBaseDir, 'target.json');
    await fs.promises.writeFile(
      targetFile,
      JSON.stringify({ secret: true }),
      'utf8',
    );

    const linkFile = path.join(stateDir, 'linked.json');
    await fs.promises.symlink(targetFile, linkFile);

    await expect(store.read('linked', {})).rejects.toThrow(HarnessError);
  });

  it('executes atomic mutations under authority transaction lock and isolates fallback', async () => {
    const store = new RuntimeStore(stateDir, setupService);
    const initialFallback = { count: 0, items: ['a'] };

    const res1 = await store.transaction('tx-record', initialFallback, (s) => {
      s.count += 1;
      s.items.push('b');
      return s;
    });
    expect(res1).toEqual({ count: 1, items: ['a', 'b'] });

    // Ensure initialFallback was not mutated by transaction callback (C9)
    expect(initialFallback).toEqual({ count: 0, items: ['a'] });

    const res2 = await store.transaction('tx-record', initialFallback, (s) => ({
      ...s,
      count: s.count + 5,
    }));
    expect(res2.count).toBe(6);

    const finalRead = await store.read('tx-record', initialFallback);
    expect(finalRead.count).toBe(6);
  });

  it('handles createImmutable idempotently on matching content and refuses differing content', async () => {
    const store = new RuntimeStore(stateDir, setupService);
    const record = { id: 'plan-1', digest: 'abc' };

    // Initial write
    await store.createImmutable('plan-record', record);

    // Idempotent second write
    await expect(
      store.createImmutable('plan-record', record),
    ).resolves.not.toThrow();

    // Differing content write refused
    await expect(
      store.createImmutable('plan-record', {
        id: 'plan-1',
        digest: 'different',
      }),
    ).rejects.toThrow(HarnessError);
  });

  it('serializes unrelated concurrent transactions on one store instance (C5)', async () => {
    const store = new RuntimeStore(stateDir, setupService);
    const order: string[] = [];
    let signalEntered!: () => void;
    const entered = new Promise<void>((resolve) => {
      signalEntered = resolve;
    });
    let releaseA!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseA = resolve;
    });

    const transactionA = store.transaction(
      'shared-counter',
      { count: 0 },
      async (s) => {
        order.push('a-enter');
        signalEntered();
        await gate;
        s.count += 1;
        order.push('a-exit');
        return s;
      },
    );

    await entered;

    const transactionB = store.transaction(
      'shared-counter',
      { count: 0 },
      (s) => {
        order.push('b-enter');
        s.count += 1;
        return s;
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(order).toEqual(['a-enter']);

    releaseA();
    const [stateA, stateB] = await Promise.all([transactionA, transactionB]);

    expect(order).toEqual(['a-enter', 'a-exit', 'b-enter']);
    expect(stateA.count).toBe(1);
    expect(stateB.count).toBe(2);
    expect((await store.read('shared-counter', { count: 0 })).count).toBe(2);
  });

  it('reacquires the authority lock for async descendants after their owner releases it', async () => {
    const store = new RuntimeStore(stateDir, setupService);
    const order: string[] = [];
    const childGate = Promise.withResolvers<void>();
    let staleChild: Promise<void> | undefined;

    await store.transaction('stale-owner-counter', { count: 0 }, (state) => {
      staleChild = (async () => {
        await childGate.promise;
        await store.transaction(
          'stale-owner-counter',
          { count: 0 },
          (childState) => {
            order.push('child-enter');
            childState.count += 1;
            return childState;
          },
        );
      })();
      state.count += 1;
      return state;
    });

    if (!staleChild) {
      throw new Error(
        'Expected the delayed transaction descendant to be scheduled',
      );
    }

    const entered = Promise.withResolvers<void>();
    const ownerGate = Promise.withResolvers<void>();
    const currentOwner = store.transaction(
      'stale-owner-counter',
      { count: 0 },
      async (state) => {
        order.push('owner-enter');
        entered.resolve();
        await ownerGate.promise;
        state.count += 1;
        order.push('owner-exit');
        return state;
      },
    );

    await entered.promise;
    childGate.resolve();
    const orderWhileOwnerHoldsLock = [...order];

    ownerGate.resolve();
    await Promise.all([currentOwner, staleChild]);

    expect(orderWhileOwnerHoldsLock).toEqual(['owner-enter']);
    expect(order).toEqual(['owner-enter', 'owner-exit', 'child-enter']);
    expect((await store.read('stale-owner-counter', { count: 0 })).count).toBe(
      3,
    );
  });

  it('rejects nested mutations in a live authority context but permits reads', async () => {
    const store = new RuntimeStore(stateDir, setupService);

    await expect(
      store.transaction('outer', { count: 0 }, async (state) => {
        await expect(store.read('missing', { value: 1 })).resolves.toEqual({
          value: 1,
        });
        await store.write('nested', { value: 1 });
        return state;
      }),
    ).rejects.toMatchObject({ code: 'NESTED_MUTATION_UNSUPPORTED' });
  });

  it('fails with LOCK_TIMEOUT rather than auto-stealing an existing lock file (deterministic clock)', async () => {
    const store = new RuntimeStore(stateDir, setupService);
    const lockPath = path.join(stateDir, '.runtime-authority.lock');

    // Simulate an existing external active lock
    const foreignData = JSON.stringify({
      pid: 99999,
      time: Date.now(),
      token: 'external-token',
    });
    await fs.promises.writeFile(lockPath, foreignData, { mode: 0o600 });

    let now = 0;
    const clock = vi.spyOn(Date, 'now').mockImplementation(() => {
      now += 1000;
      return now;
    });

    try {
      await expect(
        store.transaction('contested', { x: 1 }, (s) => s),
      ).rejects.toMatchObject({ code: 'LOCK_TIMEOUT' });
    } finally {
      clock.mockRestore();
    }

    // Verify lock still exists intact and was not auto-stolen or modified
    expect(await fs.pathExists(lockPath)).toBe(true);
    expect(await fs.promises.readFile(lockPath, 'utf8')).toBe(foreignData);
  });
});
