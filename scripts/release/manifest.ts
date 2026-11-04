import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface ReleaseManifest {
  schema_version: 1;
  tag: string;
  commit: string;
  /**
   * Repo-relative path -> SHA-256 of raw bytes. Root LICENSE/NOTICE files a
   * skill category release used are bound here as ordinary entries; there is
   * no separate root namespace.
   */
  files: Record<string, string>;
}

const ROOT_ATTRIBUTION_RE = /^(LICENSE|NOTICE)(?:\.(?:md|txt))?$/i;

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

function hashFile(pathToFile: string): string {
  // Raw bytes: a UTF-8 round-trip corrupts binary assets and non-UTF-8 text.
  return createHash("sha256").update(fs.readFileSync(pathToFile)).digest("hex");
}

/**
 * Root attribution is only distributed with skill category releases; workflow
 * and specialist scopes keep their existing file scope.
 */
function bindsRootAttribution(scope: string): boolean {
  return scope.startsWith("skills/") && scope !== "skills/specialists";
}

function rootAttributionNames(repoRoot: string): string[] {
  return fs
    .readdirSync(repoRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => ROOT_ATTRIBUTION_RE.test(name))
    .sort();
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
    filesRecord[relPosix] = hashFile(filePath);
  }
  if (bindsRootAttribution(scope)) {
    // Root attribution travels with the distribution as ordinary schema-1
    // files-map entries, so verifiers enforce it with the same code path.
    for (const name of rootAttributionNames(repoRoot)) {
      filesRecord[name] = hashFile(path.join(repoRoot, name));
    }
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
