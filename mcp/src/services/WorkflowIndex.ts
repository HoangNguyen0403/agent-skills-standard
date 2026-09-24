import fs from "fs-extra";
import path from "path";
import * as yaml from "js-yaml";

export interface WorkflowMetadata {
  /** Workflow identifier without extension (e.g. `dev-fix`) */
  name: string;
  /** Description parsed from frontmatter, or empty string */
  description: string;
  /** Absolute path to the workflow markdown file */
  path: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

export async function scanWorkflows(
  projectRoot: string,
): Promise<WorkflowMetadata[]> {
  const workflowsDir = path.join(projectRoot, ".agents", "workflows");
  if (!(await fs.pathExists(workflowsDir))) {
    return [];
  }

  const entries = await fs.readdir(workflowsDir);
  const out: WorkflowMetadata[] = [];

  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const name = entry.replace(/\.md$/, "");
    const fullPath = path.join(workflowsDir, entry);

    const stat = await fs.stat(fullPath).catch(() => null);
    if (!stat?.isFile()) continue;

    const content = await fs.readFile(fullPath, "utf8");
    const fm = FRONTMATTER_RE.exec(content);

    let description = "";
    if (fm) {
      try {
        const parsed = (yaml.load(fm[1]) as Record<string, unknown>) ?? {};
        if (typeof parsed.description === "string") {
          description = parsed.description;
        } else if (typeof parsed.summary === "string") {
          description = parsed.summary;
        }
      } catch {
        // Fall back if yaml parsing fails
      }
    }

    out.push({
      name,
      description,
      path: fullPath,
    });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readWorkflowBody(
  workflowPath: string,
): Promise<string | null> {
  if (!(await fs.pathExists(workflowPath))) return null;
  const content = await fs.readFile(workflowPath, "utf8");
  const fm = FRONTMATTER_RE.exec(content);
  if (fm) {
    // Return the body after frontmatter
    return fm[2].trim();
  }
  return content.trim();
}
