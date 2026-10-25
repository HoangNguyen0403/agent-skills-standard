import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  classifySdkError,
  DefaultPaseoConnectionFactory,
  DISCOVERY_LIMITS,
  normalizeHostPort,
  normalizeTargetForComparison,
  readLocalCredentialForTarget,
  resolveOriginTarget,
} from '../PaseoSdkConnection';
import type { HarnessConfig } from '../HarnessSetupService';
import { HarnessError } from '../HarnessSetupService';

// The SDK is ESM-only and loaded through dynamic import inside the factory, so
// module mocks are the only injection point for driver ownership assertions.
const sdkMocks = vi.hoisted(() => {
  const close = vi.fn(async () => {});
  const connect = vi.fn(async () => {});
  return {
    close,
    connect,
    createHostClient: vi.fn(() => ({ connect, close })),
    createPaseoApi: vi.fn(() => ({})),
  };
});

vi.mock('@getpaseo/client/node', () => ({
  createHostClient: sdkMocks.createHostClient,
}));
vi.mock('@getpaseo/client', () => ({
  createPaseoApi: sdkMocks.createPaseoApi,
}));

// Exactly 43 chars of base64url: the credential length Paseo accepts.
const validToken = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop1';

describe('PaseoSdkConnection', () => {
  describe('normalizeHostPort', () => {
    it('normalizes IPv4 loopback to localhost', () => {
      expect(normalizeHostPort('127.0.0.1:6767')).toBe('localhost:6767');
      expect(normalizeHostPort('0.0.0.0:6767')).toBe('localhost:6767');
    });

    it('preserves non-loopback IPv4 endpoints', () => {
      expect(normalizeHostPort('192.168.1.100:6767')).toBe(
        '192.168.1.100:6767',
      );
    });

    it('normalizes IPv6 loopback to localhost', () => {
      expect(normalizeHostPort('[::1]:6767')).toBe('localhost:6767');
      expect(normalizeHostPort('[::]:6767')).toBe('localhost:6767');
    });

    it('preserves non-loopback IPv6 endpoints', () => {
      expect(normalizeHostPort('[2001:db8::1]:6767')).toBe(
        '[2001:db8::1]:6767',
      );
    });

    it('throws on invalid formats', () => {
      expect(() => normalizeHostPort('')).toThrow('Host is required');
      expect(() => normalizeHostPort('invalid')).toThrow('Invalid host:port');
      expect(() => normalizeHostPort('[:6767')).toThrow('Invalid host:port');
    });
  });

  describe('normalizeTargetForComparison', () => {
    it('normalizes tcp URIs with loopback', () => {
      expect(normalizeTargetForComparison('tcp://127.0.0.1:6767')).toBe(
        'localhost:6767',
      );
    });

    it('preserves unix socket and pipe URIs', () => {
      expect(normalizeTargetForComparison('unix:///tmp/paseo.sock')).toBe(
        'unix:///tmp/paseo.sock',
      );
      expect(normalizeTargetForComparison('/tmp/paseo.sock')).toBe(
        'unix:///tmp/paseo.sock',
      );
      expect(normalizeTargetForComparison('\\\\.\\pipe\\paseo')).toBe(
        'pipe://\\\\.\\pipe\\paseo',
      );
    });

    it('normalizes bare port to localhost', () => {
      expect(normalizeTargetForComparison('6767')).toBe('localhost:6767');
    });

    it('returns null on invalid input', () => {
      expect(normalizeTargetForComparison(':::invalid:::')).toBeNull();
    });
  });

  describe('readLocalCredentialForTarget', () => {
    it('returns null when paseo.pid does not exist', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paseo-test-'));
      try {
        expect(
          readLocalCredentialForTarget(tempDir, '127.0.0.1:6767'),
        ).toBeNull();
      } finally {
        fs.removeSync(tempDir);
      }
    });

    it('returns null when paseo.pid is malformed or missing listen field', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paseo-test-'));
      try {
        fs.writeFileSync(path.join(tempDir, 'paseo.pid'), 'not json');
        expect(
          readLocalCredentialForTarget(tempDir, '127.0.0.1:6767'),
        ).toBeNull();

        fs.writeFileSync(
          path.join(tempDir, 'paseo.pid'),
          JSON.stringify({ pid: 1234 }),
        );
        expect(
          readLocalCredentialForTarget(tempDir, '127.0.0.1:6767'),
        ).toBeNull();
      } finally {
        fs.removeSync(tempDir);
      }
    });

    it('returns null when target does not match listening daemon', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paseo-test-'));
      try {
        fs.writeFileSync(
          path.join(tempDir, 'paseo.pid'),
          JSON.stringify({ listen: '127.0.0.1:6767' }),
        );
        fs.writeFileSync(path.join(tempDir, 'local-credential'), validToken);
        expect(
          readLocalCredentialForTarget(tempDir, '192.168.1.1:6767'),
        ).toBeNull();
        expect(
          readLocalCredentialForTarget(tempDir, '127.0.0.1:9999'),
        ).toBeNull();
      } finally {
        fs.removeSync(tempDir);
      }
    });

    it('returns null when local-credential file is missing', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paseo-test-'));
      try {
        fs.writeFileSync(
          path.join(tempDir, 'paseo.pid'),
          JSON.stringify({ listen: '127.0.0.1:6767' }),
        );
        expect(
          readLocalCredentialForTarget(tempDir, '127.0.0.1:6767'),
        ).toBeNull();
      } finally {
        fs.removeSync(tempDir);
      }
    });

    it('returns null when local-credential has invalid token format', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paseo-test-'));
      try {
        fs.writeFileSync(
          path.join(tempDir, 'paseo.pid'),
          JSON.stringify({ listen: '127.0.0.1:6767' }),
        );
        fs.writeFileSync(
          path.join(tempDir, 'local-credential'),
          'too-short-token',
        );
        expect(
          readLocalCredentialForTarget(tempDir, '127.0.0.1:6767'),
        ).toBeNull();

        // 45 chars (invalid length)
        fs.writeFileSync(
          path.join(tempDir, 'local-credential'),
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop123',
        );
        expect(
          readLocalCredentialForTarget(tempDir, '127.0.0.1:6767'),
        ).toBeNull();

        // Invalid characters
        fs.writeFileSync(
          path.join(tempDir, 'local-credential'),
          validToken.slice(0, 42) + '!',
        );
        expect(
          readLocalCredentialForTarget(tempDir, '127.0.0.1:6767'),
        ).toBeNull();
      } finally {
        fs.removeSync(tempDir);
      }
    });

    it('returns token when target matches paseo.pid listen and token is valid', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paseo-test-'));
      try {
        fs.writeFileSync(
          path.join(tempDir, 'paseo.pid'),
          JSON.stringify({ listen: '127.0.0.1:6767' }),
        );
        fs.writeFileSync(
          path.join(tempDir, 'local-credential'),
          `${validToken}\n`,
        );

        // Matching IPv4 loopback
        expect(readLocalCredentialForTarget(tempDir, '127.0.0.1:6767')).toBe(
          validToken,
        );
        // Matching localhost:6767
        expect(readLocalCredentialForTarget(tempDir, 'localhost:6767')).toBe(
          validToken,
        );
        // Matching tcp://127.0.0.1:6767
        expect(
          readLocalCredentialForTarget(tempDir, 'tcp://127.0.0.1:6767'),
        ).toBe(validToken);
      } finally {
        fs.removeSync(tempDir);
      }
    });
  });

  describe('resolveOriginTarget', () => {
    const validConfig: HarnessConfig = {
      schemaVersion: 1,
      paseoCommand: '/usr/local/bin/paseo',
    };

    it('returns error when daemon status command fails', async () => {
      const mockExec = async () => {
        const err = new Error('Command failed') as unknown as Record<
          string,
          unknown
        >;
        err.code = 'ENOENT';
        throw err;
      };

      const res = await resolveOriginTarget(validConfig, mockExec, 5000);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe('COMMAND_NOT_FOUND');
      }
    });

    it('returns UNREACHABLE when daemon is not running', async () => {
      const mockExec = async () => ({
        stdout: JSON.stringify({
          localDaemon: 'stopped',
          connectedDaemon: 'unreachable',
        }),
        stderr: '',
      });

      const res = await resolveOriginTarget(validConfig, mockExec, 5000);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe('UNREACHABLE');
      }
    });

    it('returns DAEMON_NOT_LISTENING when listen property is missing', async () => {
      const mockExec = async () => ({
        stdout: JSON.stringify({
          localDaemon: 'running',
          connectedDaemon: 'reachable',
        }),
        stderr: '',
      });

      const res = await resolveOriginTarget(validConfig, mockExec, 5000);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe('DAEMON_NOT_LISTENING');
      }
    });

    it('resolves default origin with status.listen and serverId without assuming port', async () => {
      const mockExec = async () => ({
        stdout: JSON.stringify({
          localDaemon: 'running',
          listen: '127.0.0.1:7890',
          serverId: 'srv_test_123',
        }),
        stderr: '',
      });

      const res = await resolveOriginTarget(validConfig, mockExec, 5000);
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value.target).toBe('127.0.0.1:7890');
        expect(res.value.serverId).toBe('srv_test_123');
      }
    });

    it('resolves explicit origin without reusing local credentials on non-matching target', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paseo-res-'));
      try {
        fs.writeFileSync(
          path.join(tempDir, 'paseo.pid'),
          JSON.stringify({ listen: '127.0.0.1:6767' }),
        );
        fs.writeFileSync(path.join(tempDir, 'local-credential'), validToken);

        const mockExec = async () => ({
          stdout: JSON.stringify({
            localDaemon: 'running',
            listen: '127.0.0.1:6767',
            home: tempDir,
            serverId: 'srv_local',
          }),
          stderr: '',
        });

        const explicitConfig: HarnessConfig = {
          schemaVersion: 1,
          paseoCommand: '/usr/local/bin/paseo',
          origin: '192.168.1.50:6767',
        };

        const res = await resolveOriginTarget(explicitConfig, mockExec, 5000);
        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.value.target).toBe('192.168.1.50:6767');
          // Security invariant: local credentials MUST NOT be leaked to arbitrary targets
          expect(res.value.localCredential).toBeUndefined();
        }
      } finally {
        fs.removeSync(tempDir);
      }
    });

    it('attaches PASEO_PASSWORD from environment without leaking it in string output', async () => {
      const prevEnv = process.env.PASEO_PASSWORD;
      process.env.PASEO_PASSWORD = 'super-secret-password';
      try {
        const mockExec = async () => ({
          stdout: JSON.stringify({
            localDaemon: 'running',
            listen: '127.0.0.1:6767',
          }),
          stderr: '',
        });

        const res = await resolveOriginTarget(validConfig, mockExec, 5000);
        expect(res.ok).toBe(true);
        if (res.ok) {
          expect(res.value.password).toBe('super-secret-password');
        }
      } finally {
        if (prevEnv !== undefined) {
          process.env.PASEO_PASSWORD = prevEnv;
        } else {
          delete process.env.PASEO_PASSWORD;
        }
      }
    });
  });

  describe('classifySdkError', () => {
    it('classifies offline hosts', () => {
      expect(classifySdkError({ code: 'host_offline' })).toBe('HOST_OFFLINE');
      expect(classifySdkError(new Error('Host srv_123 is offline'))).toBe(
        'HOST_OFFLINE',
      );
    });

    it('classifies disabled hosts', () => {
      expect(classifySdkError({ code: 'host_disabled' })).toBe('HOST_DISABLED');
    });

    it('classifies authentication errors', () => {
      expect(classifySdkError({ code: 'authentication_failed' })).toBe(
        'AUTHENTICATION_FAILED',
      );
      expect(classifySdkError(new Error('password_required'))).toBe(
        'AUTHENTICATION_FAILED',
      );
      expect(classifySdkError(new Error('Incorrect password'))).toBe(
        'AUTHENTICATION_FAILED',
      );
    });

    it('classifies timeouts', () => {
      expect(classifySdkError({ code: 'ETIMEDOUT' })).toBe('TIMEOUT');
      expect(classifySdkError(new Error('Connection timed out'))).toBe(
        'TIMEOUT',
      );
    });

    it('classifies unreachable endpoints', () => {
      expect(classifySdkError({ code: 'ECONNREFUSED' })).toBe('UNREACHABLE');
      expect(
        classifySdkError(new Error('connect ECONNREFUSED 127.0.0.1')),
      ).toBe('UNREACHABLE');
    });

    it('classifies resource limits', () => {
      expect(classifySdkError({ code: 'resource_limit' })).toBe(
        'BUFFER_OVERFLOW',
      );
    });

    it('falls back to CONNECTION_FAILED for generic errors', () => {
      expect(classifySdkError(new Error('Unexpected error'))).toBe(
        'CONNECTION_FAILED',
      );
    });
  });

  describe('DefaultPaseoConnectionFactory engine guard', () => {
    it('throws HarnessError UNSUPPORTED_ENGINE on older node versions', async () => {
      const originalVersion = process.versions.node;
      Object.defineProperty(process.versions, 'node', {
        value: '20.10.0',
        configurable: true,
      });

      const factory = new DefaultPaseoConnectionFactory();
      try {
        await expect(
          factory.connectOrigin({
            connection: '127.0.0.1:6767',
            clientId: 'test',
            clientType: 'cli',
            connectTimeoutMs: 1000,
            reconnect: { enabled: false },
          }),
        ).rejects.toThrow('Node.js 22 or later is required');
      } finally {
        Object.defineProperty(process.versions, 'node', {
          value: originalVersion,
          configurable: true,
        });
      }
    });
  });

  describe('DISCOVERY_LIMITS workspace bounds', () => {
    it('exports bounded workspace pagination and count limits', () => {
      expect(DISCOVERY_LIMITS.MAX_WORKSPACES_PER_PAGE).toBe(100);
      expect(DISCOVERY_LIMITS.MAX_WORKSPACES_PER_HOST).toBe(10000);
      expect(DISCOVERY_LIMITS.MAX_WORKSPACE_PAGES_PER_HOST).toBe(100);
    });
  });

  describe('DefaultPaseoConnectionFactory driver ownership', () => {
    const connectOptions = {
      connection: '127.0.0.1:6767',
      clientId: 'test',
      clientType: 'cli' as const,
      connectTimeoutMs: 1000,
      reconnect: { enabled: false as const },
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('connectOrigin_ConnectRejects_ClosesOwnedDriver', async () => {
      sdkMocks.connect.mockImplementationOnce(async () => {
        throw new Error('handshake failed');
      });

      const factory = new DefaultPaseoConnectionFactory();
      await expect(factory.connectOrigin(connectOptions)).rejects.toThrow(
        'handshake failed',
      );

      expect(sdkMocks.createHostClient).toHaveBeenCalledTimes(1);
      expect(sdkMocks.close).toHaveBeenCalledTimes(1);
      expect(sdkMocks.createPaseoApi).not.toHaveBeenCalled();
    });

    it('connectOrigin_ApiCreationThrows_ClosesOwnedDriver', async () => {
      sdkMocks.createPaseoApi.mockImplementationOnce(() => {
        throw new Error('api creation failed');
      });

      const factory = new DefaultPaseoConnectionFactory();
      await expect(factory.connectOrigin(connectOptions)).rejects.toThrow(
        'api creation failed',
      );

      expect(sdkMocks.connect).toHaveBeenCalledTimes(1);
      expect(sdkMocks.close).toHaveBeenCalledTimes(1);
    });

    it('connectOrigin_Success_TransfersOwnershipWithoutClosing', async () => {
      const factory = new DefaultPaseoConnectionFactory();
      const connected = await factory.connectOrigin(connectOptions);

      expect(connected.driver).toBeDefined();
      expect(sdkMocks.createPaseoApi).toHaveBeenCalledTimes(1);
      expect(sdkMocks.close).not.toHaveBeenCalled();
    });
  });
});
