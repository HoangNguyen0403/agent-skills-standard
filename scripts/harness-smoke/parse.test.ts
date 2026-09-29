import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import * as yaml from 'js-yaml';
import {
  parseCodexMcpList,
  parseGhVersion,
  parseOpencodeAgentList,
  parseSkillsList,
  registrySkillNames,
  stripAnsi,
} from './parse';

test('parseSkillsList extracts skill names from fixture and handles ANSI wrapping', () => {
  const fixturePath = path.join(__dirname, 'fixtures', 'skills-list.txt');
  const fixture = fs.readFileSync(fixturePath, 'utf8');

  const expected = ['android-agp-upgrade', 'android-architecture'];
  assert.deepEqual(parseSkillsList(fixture), expected);

  // Wrap in various ANSI color and formatting codes
  const ansiWrapped = `\u001b[32m${fixture}\u001b[0m\u001b[1m\u001b[34m`;
  assert.deepEqual(parseSkillsList(ansiWrapped), expected);
});

test('parseCodexMcpList extracts server names from table output', () => {
  const codexTable = [
    'Name                   Command  Args                          Env  Cwd  Status   Auth',
    'agent-skills-standard  npx      -y agent-skills-standard-mcp  -    -    enabled  Unsupported',
    'computer-use           ./Codex Computer Use.app/Contents/SharedSupport/SkyComputerUseClient.app/Contents/MacOS/SkyComputerUseClient  mcp  -  .  disabled  Unsupported',
  ].join('\n');

  assert.deepEqual(parseCodexMcpList(codexTable), [
    'agent-skills-standard',
    'computer-use',
  ]);

  // ANSI wrapped
  const ansiWrapped = `\u001b[1m${codexTable}\u001b[0m`;
  assert.deepEqual(parseCodexMcpList(ansiWrapped), [
    'agent-skills-standard',
    'computer-use',
  ]);
});

test('parseOpencodeAgentList handles subagent annotations and bare names', () => {
  const sample = [
    'architecture-guard (subagent)',
    'code-reviewer',
    '  qa-specialist (subagent)  ',
    '',
    'designer',
  ].join('\n');

  assert.deepEqual(parseOpencodeAgentList(sample), [
    'architecture-guard',
    'code-reviewer',
    'qa-specialist',
    'designer',
  ]);
});

test('parseGhVersion extracts major, minor, patch or returns null', () => {
  assert.deepEqual(parseGhVersion('gh version 2.87.0 (2026-02-18)'), [2, 87, 0]);
  assert.deepEqual(parseGhVersion('gh version 2.98.1-pre (2026-03-01)'), [
    2, 98, 1,
  ]);
  assert.equal(parseGhVersion('unknown command'), null);
});

test('stripAnsi removes ANSI escape codes', () => {
  assert.equal(stripAnsi('\u001b[31mRed\u001b[0m Text'), 'Red Text');
  assert.equal(stripAnsi('Plain text'), 'Plain text');
});

test('registrySkillNames finds skills and excludes specialists', () => {
  const tempRepo = fs.mkdtempSync(
    path.join(os.tmpdir(), 'harness-smoke-reg-test-'),
  );
  try {
    // Create skills/typescript/my-ts-skill/SKILL.md
    fs.mkdirSync(
      path.join(tempRepo, 'skills', 'typescript', 'my-ts-skill'),
      { recursive: true },
    );
    fs.writeFileSync(
      path.join(tempRepo, 'skills', 'typescript', 'my-ts-skill', 'SKILL.md'),
      '# My TS Skill',
    );

    // Create skills/angular/my-ng-skill/SKILL.md
    fs.mkdirSync(
      path.join(tempRepo, 'skills', 'angular', 'my-ng-skill'),
      { recursive: true },
    );
    fs.writeFileSync(
      path.join(tempRepo, 'skills', 'angular', 'my-ng-skill', 'SKILL.md'),
      '# My Ng Skill',
    );

    // Create skills/specialists/code-reviewer/SKILL.md (should be excluded)
    fs.mkdirSync(
      path.join(tempRepo, 'skills', 'specialists', 'code-reviewer'),
      { recursive: true },
    );
    fs.writeFileSync(
      path.join(
        tempRepo,
        'skills',
        'specialists',
        'code-reviewer',
        'SKILL.md',
      ),
      '# Code Reviewer Specialist',
    );

    // Non-skill files like _INDEX.md or README
    fs.writeFileSync(
      path.join(tempRepo, 'skills', 'typescript', '_INDEX.md'),
      '# Index',
    );

    const names = registrySkillNames(tempRepo);
    assert.deepEqual(names, ['my-ng-skill', 'my-ts-skill']);
  } finally {
    fs.rmSync(tempRepo, { recursive: true, force: true });
  }
});

test('every specialist has metadata.internal === true and no non-specialist has it', () => {
  const repoRoot = path.resolve(__dirname, '../..');
  const skillsDir = path.join(repoRoot, 'skills');

  const specialistsDir = path.join(skillsDir, 'specialists');
  const specialistDirs = fs
    .readdirSync(specialistsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  assert.ok(specialistDirs.length > 0, 'specialists dir should not be empty');

  for (const dir of specialistDirs) {
    const skillMd = path.join(specialistsDir, dir.name, 'SKILL.md');
    assert.ok(fs.existsSync(skillMd), `${dir.name}/SKILL.md exists`);
    const content = fs.readFileSync(skillMd, 'utf8');
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(match, `${dir.name} has frontmatter`);
    const parsed = yaml.load(match[1]) as { metadata?: { internal?: boolean } };
    assert.equal(
      parsed?.metadata?.internal,
      true,
      `Specialist ${dir.name} must have metadata.internal === true`,
    );
  }

  const categories = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'specialists');

  for (const cat of categories) {
    const catDir = path.join(skillsDir, cat.name);
    const skillDirs = fs
      .readdirSync(catDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const sDir of skillDirs) {
      const skillMd = path.join(catDir, sDir.name, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;
      const content = fs.readFileSync(skillMd, 'utf8');
      const match = content.match(/^---\n([\s\S]*?)\n---/);
      if (match) {
        const parsed = yaml.load(match[1]) as { metadata?: { internal?: boolean } };
        assert.notEqual(
          parsed?.metadata?.internal,
          true,
          `Non-specialist ${cat.name}/${sDir.name} must not have metadata.internal === true`,
        );
      }
    }
  }
});
