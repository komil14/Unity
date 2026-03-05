/**
 * Escape special regex characters in a string to prevent ReDoS attacks.
 * Prefixes all special regex chars with a backslash.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
