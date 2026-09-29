import path from 'path';

export function toPosixRel(rootDir: string, absPath: string): string {
  return path.relative(rootDir, absPath).split(path.sep).join('/');
}

export function isOverriddenRel(rel: string, overrides: string[]): boolean {
  return overrides.some((o) => {
    const op = o.replace(/\\/g, '/').replace(/\/$/, '');
    return rel === op || rel.startsWith(`${op}/`) || rel.includes(`/${op}/`) || rel.endsWith(`/${op}`);
  });
}
