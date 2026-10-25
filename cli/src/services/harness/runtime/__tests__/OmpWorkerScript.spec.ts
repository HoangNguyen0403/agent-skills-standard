import { describe, expect, it, vi } from 'vitest';
import {
  getAssistantTextDelta,
  installExperimentalCredentialGuard,
} from '../OmpWorkerScript';
describe('getAssistantTextDelta', () => {
  it('reads the pinned SDK nested text_delta event without replaying message snapshots', () => {
    const event = {
      type: 'message_update',
      assistantMessageEvent: { type: 'text_delta', delta: 'hello' },
      message: { content: [{ type: 'text', text: 'cumulative snapshot' }] },
    };

    expect(getAssistantTextDelta(event)).toBe('hello');
  });

  it('ignores non-delta and malformed session events', () => {
    expect(
      getAssistantTextDelta({
        type: 'message_update',
        assistantMessageEvent: {
          type: 'thinking_delta',
          delta: 'private reasoning',
        },
      }),
    ).toBeNull();
    expect(
      getAssistantTextDelta({ type: 'text_delta', delta: 'legacy shape' }),
    ).toBeNull();
    expect(getAssistantTextDelta(null)).toBeNull();
  });
});

describe('experimental credential boundary', () => {
  it('rejects the self-resolving ambient sentinel before model work and permits an explicit bearer', async () => {
    const modelRequest = vi.fn();
    const registry = {
      find: () => undefined,
      getApiKey: vi.fn(async () => ({ apiKey: '<authenticated>' })),
      getApiKeyForProvider: vi.fn(async () => 'selected-explicit-bearer'),
    };
    installExperimentalCredentialGuard(registry);

    const ambientRequest = async () => {
      const credential = await registry.getApiKey();
      modelRequest(credential.apiKey);
    };
    await expect(ambientRequest()).rejects.toMatchObject({
      code: 'AMBIENT_CREDENTIALS_FORBIDDEN',
    });
    expect(modelRequest).not.toHaveBeenCalled();

    const selectedBearer = await registry.getApiKeyForProvider();
    modelRequest(selectedBearer);
    expect(modelRequest).toHaveBeenCalledOnce();
    expect(modelRequest).toHaveBeenCalledWith('selected-explicit-bearer');
  });
});
