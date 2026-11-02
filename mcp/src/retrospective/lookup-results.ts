/**
 * Pure parser for AGS lookup tool result content in retrospective transcripts.
 *
 * Scans result text of the five AGS lookup tools for skill markers and workflow
 * provenance headers, extracts validated registry skill ids, and detects server
 * no-match responses.
 *
 * Privacy (Contract v3.1 Section 0 & Section 1.2):
 * - Scans at most the first 2,000,000 characters.
 * - Stores only validated registry skill ids (<category>/<id>) and counts.
 * - Never stores skill bodies or any other result text.
 */

import type { LookupToolName } from "./aggregate";

export type ParsedLookupResult = {
  bodies: Array<{ id: string | null; reused: boolean }>; // id null when unvalidated
  workflowBodies: number;
  noMatch: boolean;
};

/**
 * Valid registry skill id per Contract v3.1 Section 0:
 * `<category>/<id>` matching `/^[a-z0-9][a-z0-9-]{0,63}\/[a-z0-9][a-z0-9-]{0,127}$/`
 */
export const REGISTRY_SKILL_ID_REGEX =
  /^[a-z0-9][a-z0-9-]{0,63}\/[a-z0-9][a-z0-9-]{0,127}$/;

/**
 * Workflow provenance header emitted by get_workflow in `mcp/src/tools/index.ts`:
 * `<!-- Provenance: Loaded workflow/${result.name} via get_workflow -->`
 */
export const WORKFLOW_PROVENANCE_PREFIX = "<!-- Provenance: Loaded workflow/";

/**
 * Skill marker emitted by renderSkill in `mcp/src/tools/index.ts`:
 * `<!-- skill: ${category}/${id} | matched: ${why} -->`
 *
 * Decision: Markers are matched anywhere in text using the contract regex
 * `/<!-- skill: (\S+) \| matched: ([^\n]*?) -->/g` rather than parsing Markdown AST
 * or restricting to line starts, keeping the parser pure, simple, fast, and robust.
 */
export const SKILL_MARKER_REGEX =
  /<!-- skill: (\S+) \| matched: ([^\n]*?) -->/g;

/**
 * Exact substring anchors quoted from the server formatter in `mcp/src/tools/index.ts`:
 *
 * 1. load_skills_for_files (noMatchGuidance lines 1032, 1037, 1041):
 *    - `did not match any tier-eligible skill`
 *      "Files with extensions ... did not match any tier-eligible skill (broad-glob skills are demoted unless they are the registered base-language skill for the category)."
 *    - `No skills are routed to file extensions:`
 *      "No skills are routed to file extensions: ..."
 *    - `Files have no extensions, so no router rules apply.`
 *      "Files have no extensions, so no router rules apply."
 *
 * 2. load_skills_for_keywords (noMatchGuidance line 1045):
 *    - `No skill keyword triggers matched`
 *      "No skill keyword triggers matched: ... Keyword matches are case-insensitive substring matches against each skill's declared triggers."
 *
 * 3. get_category_guide (lines 337, 358):
 *    - `does not provide a category guide yet`
 *      "Category ... is installed, but it does not provide a category guide yet."
 *    - `does not exist in this project.`
 *      "Category ... does not exist in this project."
 *
 * 4. get_skill (lines 276, 1083, 1090):
 *    - `does not contain a skill named`
 *      "Category ... exists, but it does not contain a skill named ..."
 *    - `does not exist in this project.`
 *      "Category ... does not exist in this project."
 *    - `SKILL.md is missing.`
 *      "The skill index references ... but its SKILL.md is missing."
 *
 * 5. get_workflow (lines 863, 874):
 *    - `' not found`
 *      "Workflow ... not found. Available workflows:..."
 *    - `' is unavailable:`
 *      "Workflow ... is unavailable: ..."
 *
 * 6. maybeEmptyState (line 108):
 *    - `No skills are loaded in this project.`
 *      "No skills are loaded in this project. Run `npx agent-skills-standard@latest sync`..."
 */
export const NO_MATCH_PATTERNS = [
  "did not match any tier-eligible skill",
  "No skill keyword triggers matched",
  "does not provide a category guide yet",
  "No skills are routed to file extensions:",
  "Files have no extensions, so no router rules apply.",
  "does not contain a skill named",
  "does not exist in this project.",
  "SKILL.md is missing.",
  "' not found",
  "' is unavailable:",
  "No skills are loaded in this project.",
] as const;

const MAX_SCAN_CHARS = 2_000_000;

export function parseLookupResult(
  _tool: LookupToolName,
  text: string,
): ParsedLookupResult {
  if (typeof text !== "string" || text.length === 0) {
    return {
      bodies: [],
      workflowBodies: 0,
      noMatch: false,
    };
  }

  const scannedText =
    text.length > MAX_SCAN_CHARS ? text.slice(0, MAX_SCAN_CHARS) : text;

  const bodies: Array<{ id: string | null; reused: boolean }> = [];
  const markerRegex = new RegExp(SKILL_MARKER_REGEX.source, "g");
  let match: RegExpExecArray | null;

  while ((match = markerRegex.exec(scannedText)) !== null) {
    const rawId = match[1];
    const matchedWhy = match[2];
    const validId = REGISTRY_SKILL_ID_REGEX.test(rawId) ? rawId : null;
    const reused = matchedWhy.includes("already loaded");
    bodies.push({
      id: validId,
      reused,
    });
  }

  const workflowBodies = scannedText.startsWith(WORKFLOW_PROVENANCE_PREFIX)
    ? 1
    : 0;

  let noMatch = false;
  if (bodies.length === 0 && workflowBodies === 0) {
    for (const pattern of NO_MATCH_PATTERNS) {
      if (scannedText.includes(pattern)) {
        noMatch = true;
        break;
      }
    }
  }

  return {
    bodies,
    workflowBodies,
    noMatch,
  };
}
