import fs from 'fs-extra';
import path from 'path';
import {
  FrameworkDefinition,
  SUPPORTED_AGENTS,
  SUPPORTED_FRAMEWORKS,
} from '../constants';

export class DetectionService {
  async detectFrameworks(): Promise<Record<string, boolean>> {
    const packageDeps = await this.getPackageDeps();

    const results: Record<string, boolean> = {};
    for (const framework of SUPPORTED_FRAMEWORKS) {
      let detected = false;

      // 1. Check characteristic files
      for (const file of framework.detectionFiles) {
        if (await fs.pathExists(path.join(process.cwd(), file))) {
          detected = true;
          break;
        }
      }

      // 2. Check dependencies (if not yet detected)
      if (
        !detected &&
        framework.detectionDependencies &&
        framework.detectionDependencies.length > 0
      ) {
        detected = framework.detectionDependencies.some((dep) =>
          Object.prototype.hasOwnProperty.call(packageDeps, dep),
        );
      }

      results[framework.id] = detected;
    }
    return results;
  }

  async detectLanguages(framework: FrameworkDefinition): Promise<string[]> {
    if (!framework.languageDetection) {
      return framework.languages;
    }

    const detectedLanguages: string[] = [];
    for (const [lang, files] of Object.entries(
      framework.languageDetection as Record<string, string[]>,
    )) {
      for (const file of files) {
        if (await fs.pathExists(path.join(process.cwd(), file))) {
          detectedLanguages.push(lang);
          break;
        }
      }
    }

    return detectedLanguages.length > 0
      ? detectedLanguages
      : framework.languages;
  }

  async detectAgents(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const agent of SUPPORTED_AGENTS) {
      let detected = false;
      for (const file of agent.detectionFiles) {
        if (await fs.pathExists(path.join(process.cwd(), file))) {
          detected = true;
          break;
        }
      }
      results[agent.id] = detected;
    }
    return results;
  }

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
    const set = new Set<string>();
    const packageJsonPath = path.join(cwd, 'package.json');
    if (!(await fs.pathExists(packageJsonPath))) return set;

    try {
      const pkg = await fs.readJson(packageJsonPath);
      const deps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
      Object.keys(deps).forEach((k) => set.add(k));
    } catch (error) {
      if (process.env.DEBUG)
        console.debug('Failed to parse package.json:', error);
    }
    return set;
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
      if (depth > 3) return;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (
              ['node_modules', '.git', 'build', '.gradle'].includes(entry.name)
            )
              continue;
            await scanDir(fullPath, depth + 1);
          } else if (
            entry.name === 'build.gradle' ||
            entry.name === 'build.gradle.kts'
          ) {
            const content = await fs.readFile(fullPath, 'utf8');
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

  // kept for internal usage if needed, or can be replaced by getProjectDeps
  private async getPackageDeps(): Promise<Record<string, string>> {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const pkg = await fs.readJson(packageJsonPath);
        return { ...pkg.dependencies, ...pkg.devDependencies };
      } catch (error) {
        if (process.env.DEBUG)
          console.debug('Failed to read package.json:', error);
        return {};
      }
    }
    return {};
  }
}
