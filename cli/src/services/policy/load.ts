import fs from 'fs-extra';
import path from 'path';
import { parsePolicy, PolicyDocument } from './schema';
import { validatePolicy } from './validate';

export const POLICY_FILE = '.ags/policy.json';
export const CANDIDATES_FILE = '.ags/policy-candidates.json';

export async function loadPolicy(
  rootDir: string,
): Promise<{ doc: PolicyDocument | null; problems: string[] }> {
  const policyPath = path.join(rootDir, POLICY_FILE);
  if (!(await fs.pathExists(policyPath))) {
    return { doc: null, problems: [] };
  }

  let rawContent: string;
  try {
    rawContent = await fs.readFile(policyPath, 'utf8');
  } catch (err) {
    return {
      doc: null,
      problems: [
        `Could not read ${POLICY_FILE}: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(rawContent);
  } catch (err) {
    return {
      doc: null,
      problems: [
        `Failed to parse JSON in ${POLICY_FILE}: ${err instanceof Error ? err.message : String(err)}`,
      ],
    };
  }

  const parsed = parsePolicy(rawJson);
  if (!parsed.ok) {
    return { doc: null, problems: parsed.errors };
  }

  const validation = validatePolicy(parsed.doc, rootDir);
  if (validation.conflicts.length > 0) {
    return { doc: null, problems: validation.conflicts };
  }

  return { doc: parsed.doc, problems: [] };
}
