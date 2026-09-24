/**
 * Reading and building a calculator's shared link. The reader's figures travel after the #,
 * which browsers never send to a server; links made before that change used the ?query and still
 * work. Everything in a link is untrusted input (docs/SECURITY.md, risks 10 and 11), so:
 *  - only keys on the island's own list are read, never a key the link brings;
 *  - each value is at most 24 characters, except the codec keys, whose own decoders cap them;
 *  - a select's value must be one of its options;
 *  - a key dropped from the fragment never falls back to the query.
 */

export const LINK_VALUE_MAX = 24;
export const CODEC_VALUE_MAX = 2000;
/** Budget rows, take-home Europe lines, take-home India/US other lines, pay-later plans. */
export const CODEC_KEYS = ['rows', 'lines', 'others', 'plans'] as const;

export interface LinkOptions {
  /** For select fields: the only values a link may set. */
  allowed?: Partial<Record<string, readonly string[]>>;
}

export function parseLinkParams(hash: string, search: string, keys: readonly string[], options: LinkOptions = {}): Record<string, string> {
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const s = new URLSearchParams(search.replace(/^\?/, ''));
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = h.has(key) ? h.get(key) : s.get(key);
    if (value === null) continue;
    const max = (CODEC_KEYS as readonly string[]).includes(key) ? CODEC_VALUE_MAX : LINK_VALUE_MAX;
    if (value.length > max) continue;
    const allowed = options.allowed?.[key];
    if (allowed && !allowed.includes(value)) continue;
    out[key] = value;
  }
  return out;
}

/** The page's own address with the figures after the # and no ?query. */
export function linkFor(href: string, query: Record<string, string>): string {
  const url = new URL(href);
  url.search = '';
  url.hash = new URLSearchParams(query).toString();
  return url.toString();
}
