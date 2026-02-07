import fs from 'fs';
import path from 'path';

const EXCLUDE_DIRS = [
  '__tests__',
  'templates',
  'constants',
  'node_modules',
  'dist',
];

interface DocReport {
  file: string;
  missingDocs: string[];
}

function scanFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const missingDocs: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Simple regex to catch exported classes, functions, and interfaces
    // limiting to things that SHOULD be documented
    if (
      line.match(
        /^export (class|function|interface|type|const) ([a-zA-Z0-9_]+)/,
      )
    ) {
      const match = line.match(
        /^export (class|function|interface|type|const) ([a-zA-Z0-9_]+)/,
      );
      const type = match![1];
      const name = match![2];

      // Check purely for JSDoc style comments /** ... */
      // Look back at previous lines
      let hasDoc = false;
      for (let j = i - 1; j >= 0; j--) {
        const prevLine = lines[j].trim();
        if (prevLine === '' || prevLine.startsWith('@')) continue; // skip decorators/empty lines
        if (prevLine.endsWith('*/')) {
          hasDoc = true;
        }
        break; // Stop looking back once we hit code or comment
      }

      if (!hasDoc) {
        missingDocs.push(`${type} ${name}`);
      }
    }
  }
  return missingDocs;
}

function walkDir(dir: string, rootDir: string, report: DocReport[]) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        walkDir(fullPath, rootDir, report);
      }
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      const missing = scanFile(fullPath);
      if (missing.length > 0) {
        report.push({
          file: path.relative(rootDir, fullPath),
          missingDocs: missing,
        });
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dirsToScan = args.length > 0 ? args : [path.join(__dirname, '../src')];

  console.log(
    `🔍 Scanning for missing documentation in: ${dirsToScan.join(', ')}...`,
  );
  const report: DocReport[] = [];

  for (const dir of dirsToScan) {
    const absoluteDir = path.isAbsolute(dir)
      ? dir
      : path.join(process.cwd(), dir);
    if (fs.existsSync(absoluteDir)) {
      walkDir(absoluteDir, absoluteDir, report);
    } else {
      console.warn(`⚠️  Directory not found: ${dir}`);
    }
  }

  if (report.length === 0) {
    console.log('✅ All exported members are documented!');
    process.exit(0);
  }

  console.log('⚠️  Found undocumented members:\n');
  for (const item of report) {
    console.log(`📄 ${item.file}`);
    item.missingDocs.forEach((doc) => console.log(`   - ${doc}`));
    console.log('');
  }

  console.log(`Total files with missing docs: ${report.length}`);
  // process.exit(1); // Don't fail the build yet, just warn
}

main().catch(console.error);
