import fs from 'fs-extra';
import path from 'path';
import { SUPPORTED_AGENTS, SUPPORTED_FRAMEWORKS } from '../constants';

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
    const set = new Set<string>();
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const pkg = await fs.readJson(packageJsonPath);
        const deps = {
          ...(pkg.dependencies || {}),
          ...(pkg.devDependencies || {}),
        };
        for (const k of Object.keys(deps)) set.add(k);
      } catch {
        // ignore
      }
    }

    const pubspecPath = path.join(process.cwd(), 'pubspec.yaml');
    if (await fs.pathExists(pubspecPath)) {
      try {
        const loaded = await fs.readFile(pubspecPath, 'utf8');
        // simple parse: only collect keys inside dependencies/dev_dependencies sections
        const lines = loaded.split(/\r?\n/);
        let currentSection: 'dependencies' | 'dev_dependencies' | null = null;
        let sectionIndent: number | null = null;
        for (const line of lines) {
          const sectionMatch = line.match(
            /^(\s*)(dependencies|dev_dependencies)\s*:/,
          );
          if (sectionMatch) {
            currentSection = sectionMatch[2] as
              | 'dependencies'
              | 'dev_dependencies';
            sectionIndent = sectionMatch[1].length;
            continue;
          }
          if (!currentSection || sectionIndent === null) continue;
          const entryMatch = line.match(/^(\s*)([a-zA-Z0-9_\-@\\/]+)\s*:/);
          if (!entryMatch) continue;
          const indent = entryMatch[1].length;
          const key = entryMatch[2];
          // only include keys that are nested under the current section and are not known non-packages
          if (indent > sectionIndent && key !== 'sdk' && key !== 'flutter') {
            set.add(key);
          }
        }
      } catch {
        // ignore
      }
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
      } catch {
        return {};
      }
    }
    return {};
  }
}
