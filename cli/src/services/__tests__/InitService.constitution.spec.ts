import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InitService } from '../InitService';

describe('InitService constitution scaffold (real fs)', () => {
  let root: string;
  let service: InitService;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-init-constitution-'));
    service = new InitService();
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  it('creates CONSTITUTION.md when absent', async () => {
    await service.scaffoldConstitution('nestjs', root);

    const content = await fs.readFile(
      path.join(root, 'CONSTITUTION.md'),
      'utf8',
    );
    expect(content).toContain('Primary framework: nestjs');
    expect(content).toContain('## Ownership contract');
    expect(content.trimEnd().split('\n').length).toBeLessThanOrEqual(40);
  });

  it('leaves an existing CONSTITUTION.md byte-identical', async () => {
    const existing = '# Hand written\n\nKeep `bytes`   exactly.\n';
    const file = path.join(root, 'CONSTITUTION.md');
    await fs.writeFile(file, existing, 'utf8');

    await service.scaffoldConstitution('flutter', root);

    expect(await fs.readFile(file, 'utf8')).toBe(existing);
  });
});
