const fs = require('fs');

function patchFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  const oldMethod = `  private isOverridden(targetPath: string, overrides: string[]): boolean {
    const rel = this.normalizePath(targetPath);
    return overrides.some((o) => {
      const op = o.replace(/\\\\/g, '/');
      return rel === op || rel.startsWith(\`\${op.replace(/\\/$/, '')}/\`);
    });
  }`;

  const newMethod = `  private isOverridden(targetPath: string, overrides: string[]): boolean {
    const rel = this.normalizePath(targetPath);
    return overrides.some((o) => {
      const op = o.replace(/\\\\/g, '/').replace(/\\/$/, '');
      return (
        rel === op ||
        rel.startsWith(\`\${op}/\`) ||
        rel.includes(\`/\${op}/\`) ||
        rel.endsWith(\`/\${op}\`)
      );
    });
  }`;

  if (content.includes(oldMethod)) {
    content = content.replace(oldMethod, newMethod);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Patched ${file}`);
  } else {
    console.log(`Could not find oldMethod in ${file}`);
  }
}

patchFile('cli/src/services/SkillSyncService.ts');
patchFile('cli/src/services/WorkflowSyncService.ts');
