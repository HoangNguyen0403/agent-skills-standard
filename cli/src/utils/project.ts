import fs from 'fs-extra';
import path from 'path';

export async function buildProjectDeps(): Promise<Set<string>> {
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
      // simple parse: look for dependency keys at line-start (conservative)
      const lines = loaded.split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^\s*([a-zA-Z0-9_\-@\\/]+):/);
        if (m) set.add(m[1]);
      }
    } catch {
      // ignore
    }
  }

  return set;
}

export default buildProjectDeps;
