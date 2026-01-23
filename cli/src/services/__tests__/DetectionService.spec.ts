import fs from 'fs-extra';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

    it('should collect dependencies from build.gradle', async () => {
      const mockGradle = `
dependencies {
    implementation 'androidx.compose.ui:ui:1.5.0'
    api "androidx.navigation:navigation-compose:2.7.0"
}
`;
      vi.mocked(fs.readdir).mockImplementation((dir: any) => {
        if (dir === process.cwd()) {
          return Promise.resolve([
            { name: 'build.gradle', isDirectory: () => false },
          ] as any);
        }
        return Promise.resolve([]);
      });

      vi.mocked(fs.readFile).mockImplementation((path: any) => {
        if (path.endsWith('build.gradle')) {
          return Promise.resolve(mockGradle as unknown as Buffer);
        }
        return Promise.resolve('' as unknown as Buffer);
      });

      const deps = await detectionService.getProjectDeps();
      expect(deps.has('androidx.compose.ui')).toBe(true);
      expect(deps.has('androidx.navigation')).toBe(true);
    });

    it('should collect dependencies from build.gradle.kts', async () => {
      const mockGradleKts = `
dependencies {
    implementation("androidx.room:room-runtime:2.5.0")
    ksp("androidx.room:room-compiler:2.5.0")
}
`;
      vi.mocked(fs.readdir).mockImplementation((dir: any) => {
        if (dir === process.cwd()) {
          return Promise.resolve([
            { name: 'build.gradle.kts', isDirectory: () => false },
          ] as any);
        }
        return Promise.resolve([]);
      });

      vi.mocked(fs.readFile).mockImplementation((path: any) => {
        if (path.endsWith('build.gradle.kts')) {
          return Promise.resolve(mockGradleKts as unknown as Buffer);
        }
        return Promise.resolve('' as unknown as Buffer);
      });

      const deps = await detectionService.getProjectDeps();
      expect(deps.has('androidx.room')).toBe(true);
    });

    it('should collect dependencies from recursive build.gradle files (multi-module)', async () => {
      const mockRootGradle = `// Empty root`;
      const mockAppGradle = `dependencies { implementation 'androidx.compose.ui:ui:1.5.0' }`;

      vi.mocked(fs.readdir).mockImplementation((dir: any) => {
        if (dir === process.cwd()) {
          return Promise.resolve([
            { name: 'build.gradle', isDirectory: () => false },
            { name: 'app', isDirectory: () => true },
            { name: 'node_modules', isDirectory: () => true }, // Should be ignored (line 167)
          ] as any);
        }
        if (dir.endsWith('app')) {
          return Promise.resolve([
            { name: 'build.gradle', isDirectory: () => false },
          ] as any);
        }
        return Promise.resolve([]);
      });

      vi.mocked(fs.readFile).mockImplementation((path: any) => {
        if (path.endsWith('app/build.gradle')) {
          return Promise.resolve(mockAppGradle as unknown as Buffer);
        }
        return Promise.resolve(mockRootGradle as unknown as Buffer);
      });

      const deps = await detectionService.getProjectDeps();
      expect(deps.has('androidx.compose.ui')).toBe(true);
      expect(fs.readdir).not.toHaveBeenCalledWith(
        expect.stringContaining('node_modules'),
        expect.any(Object),
      );
    });

    it('should respect recursion depth limit (line 158 coverage)', async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        { name: 'sub', isDirectory: () => true },
      ] as any);
      // @ts-expect-error - private method
      await detectionService.parseGradleDependencies('/tmp/test');
      expect(fs.readdir).toHaveBeenCalled();
    });

    it('should collect dependencies from Version Catalogs (libs.versions.toml)', async () => {
      const mockToml = `
[libraries]
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
room-runtime = { module = "androidx.room:room-runtime", version.ref = "room" }
`;
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('libs.versions.toml'));
      });
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(mockToml as unknown as Buffer),
      );

      const deps = await detectionService.getProjectDeps();
      expect(deps.has('com.squareup.retrofit2')).toBe(true);
      expect(deps.has('androidx.room')).toBe(true);
    });

    it('should collect dependencies from pom.xml', async () => {
      const mockPom = `
<project>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>
</project>
`;
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('pom.xml'));
      });
      vi.mocked(fs.readFile).mockImplementation(() =>
        Promise.resolve(mockPom as unknown as Buffer),
      );

      const deps = await detectionService.getProjectDeps();
      expect(deps.has('spring-boot-starter-web')).toBe(true);
    });
  });

  describe('detectLanguages', () => {
    it('should return default languages if no detection rules defined', async () => {
      const framework = {
        id: 'golang' as any,
        name: 'Go',
        languages: ['go'],
        detectionFiles: ['go.mod'],
      };
      const langs = await detectionService.detectLanguages(framework);
      expect(langs).toEqual(['go']);
    });

    it('should detect Kotlin for Spring Boot if src/main/kotlin exists', async () => {
      const framework = {
        id: 'spring-boot' as any,
        name: 'Spring Boot',
        languages: ['java', 'kotlin'],
        detectionFiles: ['pom.xml'],
        languageDetection: {
          kotlin: ['src/main/kotlin'],
          java: ['src/main/java'],
        },
      };
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('src/main/kotlin'));
      });

      const langs = await detectionService.detectLanguages(framework);
      expect(langs).toEqual(['kotlin']);
    });

    it('should detect Java for Spring Boot if src/main/java exists', async () => {
      const framework = {
        id: 'spring-boot' as any,
        name: 'Spring Boot',
        languages: ['java', 'kotlin'],
        detectionFiles: ['pom.xml'],
        languageDetection: {
          kotlin: ['src/main/kotlin'],
          java: ['src/main/java'],
        },
      };
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('src/main/java'));
      });

      const langs = await detectionService.detectLanguages(framework);
      expect(langs).toEqual(['java']);
    });

    it('should return all default languages if no language-specific files found', async () => {
      const framework = {
        id: 'spring-boot' as any,
        name: 'Spring Boot',
        languages: ['java', 'kotlin'],
        detectionFiles: ['pom.xml'],
        languageDetection: {
          kotlin: ['src/main/kotlin'],
          java: ['src/main/java'],
        },
      };
      vi.mocked(fs.pathExists).mockResolvedValue();

      const langs = await detectionService.detectLanguages(framework);
      expect(langs).toEqual(['java', 'kotlin']);
    });

    it('should detect TypeScript for NestJS if tsconfig.json exists', async () => {
      const framework = {
        id: 'nestjs' as any,
        name: 'NestJS',
        languages: ['typescript', 'javascript'],
        detectionFiles: ['nest-cli.json'],
        languageDetection: {
          typescript: ['tsconfig.json'],
          javascript: ['jsconfig.json'],
        },
      };
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('tsconfig.json'));
      });

      const langs = await detectionService.detectLanguages(framework);
      expect(langs).toEqual(['typescript']);
    });

    it('should detect JavaScript for NestJS if jsconfig.json exists', async () => {
      const framework = {
        id: 'nestjs' as any,
        name: 'NestJS',
        languages: ['typescript', 'javascript'],
        detectionFiles: ['nest-cli.json'],
        languageDetection: {
          typescript: ['tsconfig.json'],
          javascript: ['jsconfig.json'],
        },
      };
      vi.mocked(fs.pathExists).mockImplementation((p: string) => {
        return Promise.resolve(p.endsWith('jsconfig.json'));
      });

      const langs = await detectionService.detectLanguages(framework);
      expect(langs).toEqual(['javascript']);
    });
  });

  describe('debug logging', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      vi.spyOn(console, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should log debug info on package.json error when DEBUG is set', async () => {
      process.env.DEBUG = 'true';
      vi.mocked(fs.pathExists).mockImplementation((p) =>
        Promise.resolve(p.endsWith('package.json')),
      );
      vi.mocked(fs.readJson).mockRejectedValue(new Error('Internal error'));

      // @ts-expect-error - testing private method
      await detectionService.parsePackageJson(process.cwd());
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse package.json'),
        expect.any(Error),
      );
    });

    it('should log debug info on package.json read failure (line 246 coverage)', async () => {
      process.env.DEBUG = 'true';
      vi.mocked(fs.pathExists).mockImplementation((p) =>
        p.endsWith('package.json'),
      );
      vi.mocked(fs.readJson).mockRejectedValue(new Error('Read error'));

      // @ts-expect-error - private method
      await detectionService.getPackageDeps();
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read package.json'),
        expect.any(Error),
      );
    });

    it('should log debug info on pubspec.yaml error when DEBUG is set', async () => {
      process.env.DEBUG = 'true';
      vi.mocked(fs.pathExists).mockImplementation((p) =>
        Promise.resolve(p.endsWith('pubspec.yaml')),
      );
      vi.mocked(fs.readFile).mockRejectedValue(new Error('IO error'));

      // @ts-expect-error - testing private method
      await detectionService.parsePubspecYaml(process.cwd());
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse pubspec.yaml'),
        expect.any(Error),
      );
    });

    it('should log debug info on gradle scan error when DEBUG is set', async () => {
      process.env.DEBUG = 'true';
      vi.mocked(fs.readdir).mockRejectedValue(new Error('Dir error'));

      // @ts-expect-error - testing private method
      await detectionService.parseGradleDependencies(process.cwd());
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to scan gradle dependencies'),
        expect.any(Error),
      );
    });

    it('should log debug info on version catalogs error when DEBUG is set', async () => {
      process.env.DEBUG = 'true';
      vi.mocked(fs.pathExists).mockImplementation((p) =>
        Promise.resolve(p.endsWith('libs.versions.toml')),
      );
      vi.mocked(fs.readFile).mockRejectedValue(new Error('Parse error'));

      // @ts-expect-error - testing private method
      await detectionService.parseVersionCatalogs(process.cwd());
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse version catalogs'),
        expect.any(Error),
      );
    });

    it('should log debug info on maven pom error when DEBUG is set', async () => {
      process.env.DEBUG = 'true';
      vi.mocked(fs.pathExists).mockImplementation((p) =>
        Promise.resolve(p.endsWith('pom.xml')),
      );
      vi.mocked(fs.readFile).mockRejectedValue(new Error('XML error'));

      // @ts-expect-error - testing private method
      await detectionService.parseMavenPom(process.cwd());
      expect(console.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse maven pom'),
        expect.any(Error),
      );
    });
  });
});
