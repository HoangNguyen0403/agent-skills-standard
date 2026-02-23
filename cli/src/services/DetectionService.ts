import fs from 'fs-extra';
import path from 'path';
import {
  FrameworkDefinition,
  SUPPORTED_AGENTS,
  SUPPORTED_FRAMEWORKS,
} from '../constants';

/**
 * Service for detecting project frameworks, languages, AI agents, and dependencies.
 * It uses a combination of file existence checks and package metadata analysis.
 */
export class DetectionService {
  /**
   * Detects supported frameworks based on characteristic files and dependencies.
   * @returns A record of framework IDs and their detection status (boolean)
   */
  async detectFrameworks(): Promise<Record<string, boolean>> {
    const packageDepsMap = await this.readPackageJsonDeps(process.cwd());

    const detectionPromises = SUPPORTED_FRAMEWORKS.map(async (framework) => {
      // 1. Check characteristic files in parallel
      const fileChecks = framework.detectionFiles.map((file) =>
        fs.pathExists(path.join(process.cwd(), file)),
      );
      const fileResults = await Promise.all(fileChecks);
      let detected = fileResults.some((exists) => exists);

      // 2. Check dependencies (if not yet detected)
      if (
        !detected &&
        framework.detectionDependencies &&
        framework.detectionDependencies.length > 0
      ) {
        detected = framework.detectionDependencies.some((dep) =>
          Object.prototype.hasOwnProperty.call(packageDepsMap, dep),
        );
      }

      return { id: framework.id, detected };
    });

    const results = await Promise.all(detectionPromises);
    return results.reduce(
      (acc, { id, detected }) => ({ ...acc, [id]: detected }),
      {},
    );
  }

  /**
   * Detects programming languages associated with a specific framework.
   * @param framework The framework definition to use for detection
   * @returns Array of detected language IDs
   */
  async detectLanguages(framework: FrameworkDefinition): Promise<string[]> {
    if (!framework.languageDetection) {
      return framework.languages;
    }

    const languageEntries = Object.entries(
      framework.languageDetection as Record<string, string[]>,
    );

    const detectionResults = await Promise.all(
      languageEntries.map(async ([lang, files]) => {
        const fileChecks = files.map((file) =>
          fs.pathExists(path.join(process.cwd(), file)),
        );
        const results = await Promise.all(fileChecks);
        return { lang, detected: results.some((exists) => exists) };
      }),
    );

    const detectedLanguages = detectionResults
      .filter((r) => r.detected)
      .map((r) => r.lang);

    return detectedLanguages.length > 0
      ? detectedLanguages
      : framework.languages;
  }

  /**
   * Detects enabled AI agents in the workspace by looking for their configuration files.
   * @returns A record of agent IDs and their detection status (boolean)
   */
  async detectAgents(): Promise<Record<string, boolean>> {
    const detectionPromises = SUPPORTED_AGENTS.map(async (agent) => {
      const fileChecks = agent.detectionFiles.map((file) =>
        fs.pathExists(path.join(process.cwd(), file)),
      );
      const results = await Promise.all(fileChecks);
      return { id: agent.id, detected: results.some((exists) => exists) };
    });

    const results = await Promise.all(detectionPromises);
    return results.reduce(
      (acc, { id, detected }) => ({ ...acc, [id]: detected }),
      {},
    );
  }

  /**
   * Aggregates project dependencies from various build systems (NPM, Pub, Gradle, Maven).
   * @returns A set of all detected package names/identifiers
   */
  async getProjectDeps(): Promise<Set<string>> {
    const cwd = process.cwd();
    const results = await Promise.all([
      this.parsePackageJson(cwd),
      this.parsePubspecYaml(cwd),
      this.parseGradleDependencies(cwd),
      this.parseVersionCatalogs(cwd),
      this.parseMavenPom(cwd),
    ]);

    const combined = new Set<string>();
    for (const set of results) {
      for (const item of set) combined.add(item);
    }
    return combined;
  }

  private async parsePackageJson(cwd: string): Promise<Set<string>> {
    const depsMap = await this.readPackageJsonDeps(cwd);
    return new Set(Object.keys(depsMap));
  }

  private async readPackageJsonDeps(
    cwd: string,
  ): Promise<Record<string, string>> {
    const packageJsonPath = path.join(cwd, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) return {};

    try {
      const pkg = await fs.readJson(packageJsonPath);
      return {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
    } catch (error) {
      if (process.env.DEBUG)
        console.debug('Failed to read package.json:', error);
      return {};
    }
  }

  private async parsePubspecYaml(cwd: string): Promise<Set<string>> {
    const set = new Set<string>();
    const pubspecPath = path.join(cwd, 'pubspec.yaml');
    if (!(await fs.pathExists(pubspecPath))) return set;

    try {
      const content = await fs.readFile(pubspecPath, 'utf8');
      const lines = content.split(/\r?\n/);
      let currentSection: string | null = null;
      let sectionIndent: number | null = null;

      for (const line of lines) {
        const sectionMatch = line.match(
          /^(\s*)(dependencies|dev_dependencies)\s*:/,
        );
        if (sectionMatch) {
          currentSection = sectionMatch[2];
          sectionIndent = sectionMatch[1].length;
          continue;
        }

        if (!currentSection || sectionIndent === null) continue;
        const entryMatch = line.match(/^(\s*)([a-zA-Z0-9_\-@\\/]+)\s*:/);
        if (!entryMatch) continue;

        const indent = entryMatch[1].length;
        const key = entryMatch[2];
        if (indent > sectionIndent && key !== 'sdk' && key !== 'flutter') {
          set.add(key);
        }
      }
    } catch (error) {
      if (process.env.DEBUG)
        console.debug('Failed to parse pubspec.yaml:', error);
    }
    return set;
  }

  private async parseGradleDependencies(cwd: string): Promise<Set<string>> {
    const set = new Set<string>();
    const gradleRegex =
      /(?:implementation|api|ksp|kapt|annotationProcessor|compileOnly|runtimeOnly)\s*\(?\s*['"]([^'":\s]+)(?::[^'"]*)?['"]\s*\)?/g;

    const scanDir = async (dir: string, depth: number) => {
      if (depth > 2) return; // Reduced depth for performance
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            if (
              [
                'node_modules',
                '.git',
                'build',
                '.gradle',
                'ios',
                'macos',
              ].includes(entry.name)
            )
              continue;
            await scanDir(path.join(dir, entry.name), depth + 1);
          } else if (
            entry.name === 'build.gradle' ||
            entry.name === 'build.gradle.kts'
          ) {
            const content = await fs.readFile(
              path.join(dir, entry.name),
              'utf8',
            );
            let match;
            while ((match = gradleRegex.exec(content)) !== null) {
              set.add(match[1]);
            }
          }
        }
      } catch (error) {
        if (process.env.DEBUG)
          console.debug('Failed to scan gradle dependencies:', error);
      }
    };

    await scanDir(cwd, 0);
    return set;
  }

  private async parseVersionCatalogs(cwd: string): Promise<Set<string>> {
    const set = new Set<string>();
    const tomlPaths = [
      path.join(cwd, 'gradle', 'libs.versions.toml'),
      path.join(cwd, 'gradle.libs.versions.toml'),
    ];

    for (const tomlPath of tomlPaths) {
      if (!(await fs.pathExists(tomlPath))) continue;
      try {
        const content = await fs.readFile(tomlPath, 'utf8');
        const moduleRegex = /module\s*=\s*['"]([^'":\s]+)(?::[^'"]*)?['"]/g;
        const groupRegex = /group\s*=\s*['"]([^'":\s]+)['"]/g;
        let match;
        while ((match = moduleRegex.exec(content)) !== null) {
          set.add(match[1]);
        }
        while ((match = groupRegex.exec(content)) !== null) {
          set.add(match[1]);
        }
      } catch (error) {
        if (process.env.DEBUG)
          console.debug('Failed to parse version catalogs:', error);
      }
    }
    return set;
  }

  private async parseMavenPom(cwd: string): Promise<Set<string>> {
    const set = new Set<string>();
    const pomPath = path.join(cwd, 'pom.xml');
    if (!(await fs.pathExists(pomPath))) return set;

    try {
      const content = await fs.readFile(pomPath, 'utf8');
      const regex =
        /<dependency>[\s\S]*?<artifactId>([^<]+)<\/artifactId>[\s\S]*?<\/dependency>/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        set.add(match[1]);
      }
    } catch (error) {
      if (process.env.DEBUG) console.debug('Failed to parse maven pom:', error);
    }
    return set;
  }
}
