import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface ReleaseManifest {
  schema_version: 1;
  tag: string;
  commit: string;
  files: Record<string, string>;
}

export function scopeForTag(tag: string): string {
  const vIndex = tag.lastIndexOf("-v");
  if (vIndex <= 0) {
    throw new Error(`Unrecognized release tag: ${tag}`);
  }

  const prefix = tag.slice(0, vIndex);
  const version = tag.slice(vIndex + 2);
  if (!version) {
    throw new Error(`Unrecognized release tag: ${tag}`);
  }

  if (prefix === "workflows") {
    return ".agents/workflows";
  }

  if (prefix === "specialists") {
    return "skills/specialists";
  }

  return `skills/${prefix}`;
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (entry.isFile()) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function buildManifest(
  repoRoot: string,
  tag: string,
  commit: string,
): ReleaseManifest {
  const scope = scopeForTag(tag);
  const fullScopeDir = path.join(repoRoot, scope);

  if (!fs.existsSync(fullScopeDir)) {
    throw new Error(`Release scope ${scope} not found for tag ${tag}`);
  }

  const allFiles = walkDir(fullScopeDir);
  if (allFiles.length === 0) {
    throw new Error(`Release scope ${scope} has no files`);
  }

  const filesRecord: Record<string, string> = {};
  for (const filePath of allFiles) {
    const relPath = path.relative(repoRoot, filePath);
    const relPosix = relPath.split(path.sep).join(path.posix.sep);
    const content = fs.readFileSync(filePath, "utf8");
    const hash = createHash("sha256").update(content, "utf8").digest("hex");
    filesRecord[relPosix] = hash;
  }

  const sortedKeys = Object.keys(filesRecord).sort();
  const sortedFiles: Record<string, string> = {};
  for (const key of sortedKeys) {
    sortedFiles[key] = filesRecord[key];
  }

  return {
    schema_version: 1,
    tag,
    commit,
    files: sortedFiles,
  };
}
