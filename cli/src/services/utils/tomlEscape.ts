/**
 * Escapes backslashes and double quotes for embedding inside any TOML basic
 * string — single-line `"..."` or multi-line `"""..."""`.
 *
 * Escaping every quote (not just runs of 3+) sidesteps the ambiguity around
 * multi-line basic strings, where an unescaped run of 3+ quote characters
 * can be misread as the closing delimiter: with every quote escaped, no
 * unescaped `"""` sequence can ever occur in the output, regardless of how
 * many consecutive quote characters the source content contains.
 */
export function escapeTomlString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
