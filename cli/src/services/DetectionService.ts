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
