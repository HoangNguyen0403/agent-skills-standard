import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DetectionService } from '../DetectionService';

vi.mock('fs-extra');

describe('DetectionService', () => {
  let detectionService: DetectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    detectionService = new DetectionService();
  });

  describe('detectFrameworks', () => {
    it('should detect Flutter if pubspec.yaml exists', async () => {
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('pubspec.yaml'));
      });
      vi.mocked(fs.readJson).mockResolvedValue({});

      const results = await detectionService.detectFrameworks();
      expect(results.flutter).toBe(true);
      expect(results.nestjs).toBe(false);
    });

    it('should detect NestJS if @nestjs/core dependency exists', async () => {
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('package.json'));
      });
      vi.mocked(fs.readJson).mockResolvedValue({
        dependencies: { '@nestjs/core': '^10.0.0' },
      });

      const results = await detectionService.detectFrameworks();
      expect(results.nestjs).toBe(true);
      expect(results.flutter).toBe(false);
    });

    it('should return empty deps if package.json read fails', async () => {
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('package.json'));
      });
      vi.mocked(fs.readJson).mockRejectedValue(new Error('Read failed'));

      const results = await detectionService.detectFrameworks();
      // Should still work but with no deps detected
      expect(results.nestjs).toBe(false);
    });
  });

  describe('detectAgents', () => {
    it('should detect Cursor if .cursor exists', async () => {
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('.cursor'));
      });

      const results = await detectionService.detectAgents();
      expect(results.cursor).toBe(true);
      expect(results.copilot).toBe(false);
    });

    it('should handle missing agents detection files', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async () => false);
      const results = await detectionService.detectAgents();
      expect(results.cursor).toBe(false);
    });
  });

  describe('getProjectDeps', () => {
    it('should handle missing dependencies keys in package.json', async () => {
      vi.mocked(fs.pathExists).mockImplementation((p: string) =>
        Promise.resolve(p.endsWith('package.json')),
      );
      vi.mocked(fs.readJson).mockResolvedValue({});
      const deps = await detectionService.getProjectDeps();
      expect(deps.size).toBe(0);
    });
    it('should collect dependencies from package.json', async () => {
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('package.json'));
      });
      vi.mocked(fs.readJson).mockResolvedValue({
        dependencies: { react: '^18.0.0' },
        devDependencies: { typescript: '^5.0.0' },
      });

      const deps = await detectionService.getProjectDeps();
      expect(deps.has('react')).toBe(true);
      expect(deps.has('typescript')).toBe(true);
    });

    it('should handle package.json read failure gracefully', async () => {
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('package.json'));
      });
      vi.mocked(fs.readJson).mockRejectedValue(new Error('Parse error'));

      const deps = await detectionService.getProjectDeps();
      expect(deps.size).toBe(0);
    });

    it('should collect dependencies from pubspec.yaml', async () => {
      const mockPubspec = `
dependencies:
  flutter:
    sdk: flutter
  flutter_bloc: ^8.1.0
  http: ^1.1.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  mocktail: ^1.0.0
`;
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('pubspec.yaml'));
      });
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(mockPubspec as unknown as Buffer),
      );

      const deps = await detectionService.getProjectDeps();
      expect(deps.has('flutter_bloc')).toBe(true);
      expect(deps.has('http')).toBe(true);
      expect(deps.has('flutter_test')).toBe(true);
      expect(deps.has('mocktail')).toBe(true);
      expect(deps.has('flutter')).toBe(false); // Should be excluded based on logic
    });

    it('should handle pubspec.yaml read failure gracefully', async () => {
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('pubspec.yaml'));
      });
      vi.mocked(fs.readFile).mockRejectedValue(new Error('IO error'));

      const deps = await detectionService.getProjectDeps();
      expect(deps.size).toBe(0);
    });
  });
});
