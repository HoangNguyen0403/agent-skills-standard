/** `1 session` / `2 sessions`; pass a plural form for nouns that do not take `s`. */
export function plural(
  n: number,
  singular: string,
  pluralForm?: string,
): string {
  if (n === 1) return `1 ${singular}`;
  return `${n} ${pluralForm ?? `${singular}s`}`;
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatTokensK(tokens: number): string {
  return `${Math.round(tokens / 1000)}k`;
}

export function formatRate(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}
