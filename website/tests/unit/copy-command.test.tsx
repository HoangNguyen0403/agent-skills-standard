import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { CopyCommand } from '@/landing/CopyCommand.client';

function deferred<T>(): { promise: Promise<T>; resolve: (value?: T) => void; reject: (reason?: unknown) => void } {
  let resolvePromise: (value: T | PromiseLike<T>) => void = () => undefined;
  let rejectPromise: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return {
    promise,
    resolve: (value) => resolvePromise(value as T),
    reject: (reason) => rejectPromise(reason),
  };
}

describe('CopyCommand', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => vi.restoreAllMocks());

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it('CopyCommand_WhenCopyIsPendingAndThenResolves_AnnouncesSuccessOnlyAfterResolution', async () => {
    const user = userEvent.setup();
    const command = 'npx agent-skills-standard@latest init';
    const write = deferred<void>();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(() => write.promise) }, writable: true, configurable: true,
    });
    render(<CopyCommand id="init" command={command} />);

    const copy = screen.getByRole('button', { name: /copy init command/i });
    await user.click(copy);

    expect(copy).toBeDisabled();
    expect(screen.queryByText(/copied/i)).not.toBeInTheDocument();
    write.resolve();
    await within(copy).findByText(/^Copied$/);
    expect(screen.getByRole('status')).toHaveTextContent('Copied init command to clipboard');
  });

  it('CopyCommand_WhenMultipleRowsAreRendered_ChangesOnlyTheActivatedRow', async () => {
    const user = userEvent.setup();
    const initCommand = 'npx agent-skills-standard@latest init';
    const syncCommand = 'npx agent-skills-standard@latest sync';
    const write = deferred<void>();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(() => write.promise) }, writable: true, configurable: true,
    });
    render(<><CopyCommand id="init" command={initCommand} /><CopyCommand id="sync" command={syncCommand} /></>);

    const init = screen.getByRole('button', { name: /copy init command/i });
    const sync = screen.getByRole('button', { name: /copy sync command/i });
    const initRow = screen.getByText(initCommand).closest('[data-command]');
    const syncRow = screen.getByText(syncCommand).closest('[data-command]');
    if (!(initRow instanceof HTMLElement) || !(syncRow instanceof HTMLElement)) {
      throw new Error('Both command rows must be HTML elements.');
    }
    const initStatus = within(initRow).getByRole('status');
    const syncStatus = within(syncRow).getByRole('status');
    await user.click(init);
    expect(init).toBeDisabled();
    expect(sync).toBeEnabled();
    write.resolve();
    await within(init).findByText(/^Copied$/);
    expect(initStatus).toHaveTextContent('Copied init command to clipboard');
    expect(syncStatus).toBeEmptyDOMElement();
    expect(sync).toHaveAccessibleName('Copy sync command');
  });

  it('CopyCommand_WhenClipboardWriteRejects_AnnouncesFailureAndSelectCommandSelectsTheExactValue', async () => {
    const user = userEvent.setup();
    const command = 'npx agent-skills-standard@latest sync';
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied')) }, writable: true, configurable: true,
    });
    render(<CopyCommand id="sync" command={command} />);

    await user.click(screen.getByRole('button', { name: /copy sync command/i }));
    const retry = await screen.findByRole('button', { name: /retry/i });
    expect(screen.getByRole('alert')).toHaveTextContent(/copy failed.*select the command.*retry/i);
    await user.click(screen.getByRole('button', { name: /select sync command text/i }));

    expect(window.getSelection()?.toString().trim()).toBe(command);
    expect(retry).toBeVisible();
    expect(screen.queryByText(/copied/i)).not.toBeInTheDocument();
  });

  it('CopyCommand_WhenClipboardApiIsUnavailable_OffersFailureRecoveryInsteadOfSuccess', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, writable: true, configurable: true });
    render(<CopyCommand id="init" command="npx agent-skills-standard@latest init" />);

    await user.click(screen.getByRole('button', { name: /copy init command/i }));

    expect(await screen.findByRole('button', { name: /retry/i })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(/copy failed.*select the command.*retry/i);
    expect(screen.queryByText(/copied/i)).not.toBeInTheDocument();
  });

  const staleRequestCases = [
    [
      'id-only resolve',
      'sync',
      'npx agent-skills-standard@latest init',
      'resolve',
    ],
    [
      'id-only reject',
      'sync',
      'npx agent-skills-standard@latest init',
      'reject',
    ],
    [
      'command-only resolve',
      'init',
      'npx agent-skills-standard@latest sync',
      'resolve',
    ],
    [
      'command-only reject',
      'init',
      'npx agent-skills-standard@latest sync',
      'reject',
    ],
    [
      'id-and-command resolve',
      'sync',
      'npx agent-skills-standard@latest sync',
      'resolve',
    ],
  ] as const;

  it.each(staleRequestCases)(
    'CopyCommand_WhenRequestChangesDuringPendingWrite_%s_DiscardsOldOutcome',
    async (_caseName, nextId, nextCommand, outcome) => {
      const user = userEvent.setup();
      const oldWrite = deferred<void>();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn(() => oldWrite.promise) }, writable: true, configurable: true,
      });
      const { rerender } = render(<CopyCommand id="init" command="npx agent-skills-standard@latest init" />);
      await user.click(screen.getByRole('button', { name: /copy init command/i }));

      rerender(<CopyCommand id={nextId} command={nextCommand} />);
      await act(async () => {
        if (outcome === 'resolve') oldWrite.resolve();
        else oldWrite.reject(new Error('Stale clipboard failure'));
        await oldWrite.promise.catch(() => undefined);
      });

      const currentControl = screen.getByRole('button', { name: `Copy ${nextId} command` });
      expect(currentControl).toBeEnabled();
      expect(screen.getByText(nextCommand)).toBeVisible();
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('CopyCommand_WhenRetryingAfterRejection_ReportsSuccessAfterTheRetryResolves', async () => {
    const user = userEvent.setup();
    const retryWrite = deferred<void>();
    const writeText = vi.fn().mockRejectedValueOnce(new Error('Permission denied')).mockReturnValueOnce(retryWrite.promise);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText }, writable: true, configurable: true,
    });
    render(<CopyCommand id="sync" command="npx agent-skills-standard@latest sync" />);

    const copy = screen.getByRole('button', { name: /copy sync command/i });
    await user.click(copy);
    const retry = await screen.findByRole('button', { name: /retry/i });
    await user.click(retry);
    expect(retry).toBeDisabled();
    expect(screen.queryByText(/copied/i)).not.toBeInTheDocument();

    retryWrite.resolve();
    await within(copy).findByText(/^Copied$/);
    expect(screen.getByRole('status')).toHaveTextContent('Copied sync command to clipboard');
    expect(writeText).toHaveBeenCalledTimes(2);
  });
});
