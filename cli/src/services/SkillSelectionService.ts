import pc from 'picocolors';
import { SkillEntry } from '../models/config';
import { GitHubTreeItem } from '../models/types';

/**
 * Resolves the skill folders a category selection actually installs.
 *
 * This is the single interpretation of `include`/`exclude` shared by sync and
 * the category manager. Identity of a folder is always qualified
 * (`category/skill`): an unqualified exclusion applies only to the declaring
 * category, so excluding `common-tdd` locally cannot remove another category's
 * identically named skill, and a qualified exclusion such as
 * `common/common-tdd` can disable an imported wildcard member after expansion.
 */
export function resolveSkillFolders(
  category: string,
  entry: SkillEntry,
  tree: GitHubTreeItem[],
  requireSkillDefinition = false,
): string[] {
  const candidates = listCategorySkillFolders(
    category,
    tree,
    requireSkillDefinition,
  );
  for (const expression of entry.include ?? []) {
    if (!expression.includes('/')) continue;
    expandAbsoluteInclude(expression, candidates, tree, requireSkillDefinition);
  }

  const seen = new Set<string>();
  const resolved: string[] = [];
  for (const folder of candidates) {
    const qualified = qualifyId(category, folder);
    if (seen.has(qualified)) continue;
    seen.add(qualified);
    if (isSkillSelected(category, entry, qualified)) resolved.push(folder);
  }

  return resolved;
}

/**
 * Canonical membership rule for one folder identity (`category/skill`).
 *
 * Identity is the folder id, never a skill's frontmatter display name:
 * - category-wide (no `include`) selects local members only;
 * - an `include` allowlist matches an unqualified local folder, an exact
 *   qualified id, or a `category/*` expression;
 * - exclusions are applied last; an unqualified exclusion is restricted to
 *   the declaring category.
 */
export function isSkillSelected(
  category: string,
  entry: SkillEntry,
  qualifiedId: string,
): boolean {
  const separator = qualifiedId.indexOf('/');
  const idCategory =
    separator === -1 ? category : qualifiedId.slice(0, separator);
  const idSkill =
    separator === -1 ? qualifiedId : qualifiedId.slice(separator + 1);
  if (!idSkill) return false;

  const include = entry.include;
  const isMember = include
    ? include.some((id) => includeCovers(id, category, idCategory, idSkill))
    : idCategory === category;
  if (!isMember) return false;

  const target = `${idCategory}/${idSkill}`;
  return !(entry.exclude ?? []).some(
    (id) => qualifyId(category, id) === target,
  );
}
/**
 * Stable identity for a selection policy. Filters are sets, while an absent
 * include and an explicit empty allowlist retain distinct future behavior.
 */
export function skillSelectionFingerprint(
  skills: Record<string, SkillEntry>,
): string {
  return JSON.stringify(
    Object.keys(skills)
      .sort()
      .map((category) => {
        const entry = skills[category];
        return [
          category,
          entry.ref ?? null,
          normalizeExpressions(category, entry.include, true),
          normalizeExpressions(category, entry.exclude, false),
        ];
      }),
  );
}

function normalizeExpressions(
  category: string,
  expressions: string[] | undefined,
  isInclude: boolean,
): string[] | null {
  if (expressions === undefined) return isInclude ? null : [];
  const normalized = new Set(
    expressions.map((expression) =>
      expression.startsWith(`${category}/`) && !expression.endsWith('/*')
        ? expression.slice(category.length + 1)
        : expression,
    ),
  );
  if (isInclude) {
    for (const expression of normalized) {
      if (!expression.endsWith('/*')) continue;
      const coveredCategory = expression.slice(0, -2);
      for (const candidate of normalized) {
        const isCovered =
          coveredCategory === category
            ? !candidate.includes('/') && candidate !== expression
            : candidate.startsWith(`${coveredCategory}/`) &&
              candidate !== expression;
        if (isCovered) normalized.delete(candidate);
      }
    }
  }
  return [...normalized].sort();
}

function includeCovers(
  expression: string,
  category: string,
  targetCategory: string,
  targetSkill: string,
): boolean {
  const separator = expression.indexOf('/');
  if (separator === -1) {
    return targetCategory === category && expression === targetSkill;
  }

  const expressionCategory = expression.slice(0, separator);
  const expressionSkill = expression.slice(separator + 1);
  if (expressionCategory !== targetCategory) return false;
  return expressionSkill === '*' || expressionSkill === targetSkill;
}

/**
 * Applies one nested-skill toggle without broadening or narrowing the stored
 * policy accidentally. Pure: returns a new entry, never mutates the input.
 */
export function setSkillSelection(
  category: string,
  entry: SkillEntry,
  qualifiedId: string,
  selected: boolean,
): SkillEntry {
  const separator = qualifiedId.indexOf('/');
  const idCategory =
    separator === -1 ? category : qualifiedId.slice(0, separator);
  const idSkill =
    separator === -1 ? qualifiedId : qualifiedId.slice(separator + 1);
  if (!idSkill) return { ...entry };

  const isLocal = idCategory === category;
  const persistedId = isLocal ? idSkill : `${idCategory}/${idSkill}`;
  const next: SkillEntry = { ...entry };

  if (selected) {
    if (entry.include) {
      const include = [...entry.include];
      const alreadyCovered = include.some((expression) =>
        expressionCovers(expression, category, idCategory, idSkill),
      );
      if (!alreadyCovered && !include.includes(persistedId)) {
        include.push(persistedId);
      }
      next.include = include;
    } else if (!isLocal) {
      // A category-wide policy cannot represent "all local skills plus one
      // imported skill" without narrowing to an allowlist.
      return { ...entry };
    }

    const remainingExcludes = (entry.exclude ?? []).filter(
      (id) => qualifyId(category, id) !== `${idCategory}/${idSkill}`,
    );
    if (remainingExcludes.length > 0) {
      next.exclude = remainingExcludes;
    } else {
      delete next.exclude;
    }
    return next;
  }

  if (entry.include) {
    const include = entry.include.filter((id) => id !== persistedId);
    next.include = include;
    const stillCoveredByExpression = entry.include.some(
      (id) =>
        id !== persistedId &&
        expressionCovers(id, category, idCategory, idSkill),
    );
    if (stillCoveredByExpression) {
      next.exclude = addExclusion(entry.exclude, persistedId);
    }
    return next;
  }

  next.exclude = addExclusion(entry.exclude, persistedId);
  return next;
}

function qualifyId(category: string, id: string): string {
  return id.includes('/') ? id : `${category}/${id}`;
}

function addExclusion(exclude: string[] | undefined, id: string): string[] {
  const current = exclude ?? [];
  return current.includes(id) ? [...current] : [...current, id];
}

function expressionCovers(
  expression: string,
  category: string,
  targetCategory: string,
  targetSkill: string,
): boolean {
  if (!expression.includes('/')) return false;
  const [expressionCategory, expressionSkill] = expression.split('/');
  if (expressionCategory !== targetCategory) return false;
  return expressionSkill === '*' || expressionSkill === targetSkill;
}

function listCategorySkillFolders(
  category: string,
  tree: GitHubTreeItem[],
  requireSkillDefinition = false,
): string[] {
  const prefix = `skills/${category}/`;
  const folders = new Set<string>();
  for (const file of tree) {
    if (
      file.type === 'blob' &&
      file.path.startsWith(prefix) &&
      file.path.endsWith('/SKILL.md')
    ) {
      folders.add(file.path.split('/')[2]);
    }
  }
  if (requireSkillDefinition) {
    return Array.from(folders).filter(Boolean);
  }

  if (folders.size === 0) {
    for (const file of tree) {
      if (!file.path.startsWith(prefix)) continue;
      const rel = file.path.slice(prefix.length);
      if (
        rel.startsWith('references/') ||
        rel === 'references' ||
        rel === '_INDEX.md'
      ) {
        continue;
      }
      folders.add(file.path.split('/')[2]);
    }
  }

  return Array.from(folders).filter(Boolean);
}

function expandAbsoluteInclude(
  absSkill: string,
  folders: string[],
  tree: GitHubTreeItem[],
  requireSkillDefinition = false,
): void {
  const [targetCategory, targetSkill] = absSkill.split('/');
  if (!targetCategory || !targetSkill) return;

  if (targetSkill === '*') {
    for (const skill of listCategorySkillFolders(
      targetCategory,
      tree,
      requireSkillDefinition,
    )) {
      const fullPath = `${targetCategory}/${skill}`;
      if (!folders.includes(fullPath)) folders.push(fullPath);
    }
    return;
  }

  if (folders.includes(absSkill)) return;

  if (
    tree.some((file) =>
      file.path.startsWith(`skills/${targetCategory}/${targetSkill}/`),
    )
  ) {
    folders.push(absSkill);
    return;
  }

  console.log(
    pc.yellow(`    ⚠️  Absolute include ${absSkill} not found in repository.`),
  );
}
