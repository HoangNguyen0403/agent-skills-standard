/**
 * Automatic version-update policy for release-pinned categories, workflows,
 * and specialists.
 *
 * A newer advertised release may only replace a configured pin automatically
 * when both refs are canonical stable semantic-version refs for the same tag
 * prefix and the candidate is strictly newer. Branches, commits, custom refs,
 * prereleases, downgrades, and equal versions stay explicit: accepting them
 * would silently move a user to incomparable source.
 */

const STABLE_VERSION =
  /^(\d+)\.(\d+)\.(\d+)(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

/**
 * @param currentRef currently configured ref, if the project already pinned one
 * @param candidateRef ref advertised by the registry for the same category
 * @param tagPrefix tag prefix published for that category (may be empty)
 * @returns true only for a strictly newer comparable stable release ref
 */
export function isAutomaticUpgrade(
  currentRef: string | undefined,
  candidateRef: string,
  tagPrefix: string,
): boolean {
  if (typeof currentRef !== 'string' || typeof candidateRef !== 'string') {
    return false;
  }

  // An unpinned category is handled by the existing initial-pin path; it is
  // not a downgrade/upgrade decision.
  const current = parseStableVersion(currentRef, tagPrefix);
  const candidate = parseStableVersion(candidateRef, tagPrefix);
  if (!current || !candidate) return false;

  for (let index = 0; index < 3; index += 1) {
    const order = compareNumericStrings(current[index], candidate[index]);
    if (order !== 0) return order < 0;
  }
  return false;
}

/**
 * Strips the category tag prefix and requires a canonical `MAJOR.MINOR.PATCH`
 * core. Numeric components are returned as digit strings so comparison stays
 * exact beyond `Number.MAX_SAFE_INTEGER`.
 */
function parseStableVersion(
  ref: string,
  tagPrefix: string,
): [string, string, string] | null {
  if (!ref.startsWith(tagPrefix)) return null;

  const version = ref.slice(tagPrefix.length);
  const match = STABLE_VERSION.exec(version);
  // ECMAScript `$` only anchors at end of input, but require the matched text
  // to be the whole ref explicitly so no terminator can slip through.
  if (!match || match[0] !== version) return null;

  const components = [match[1], match[2], match[3]];
  // Canonical semver forbids leading zeroes (except the literal `0`).
  for (const component of components) {
    if (component.length > 1 && component.startsWith('0')) return null;
  }

  return components as [string, string, string];
}

function compareNumericStrings(left: string, right: string): -1 | 0 | 1 {
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
