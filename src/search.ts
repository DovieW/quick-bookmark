import Fuse, { type IFuseOptions } from "fuse.js";

export function createFuzzyFilter<T>(options: IFuseOptions<T>) {
  let indexedItems: T[] | null = null;
  let fuse: Fuse<T>;
  return (items: T[], query: string): T[] => {
    if (!query.trim()) return items;
    if (indexedItems !== items) {
      indexedItems = items;
      fuse = new Fuse(items, { threshold: 0.3, ...options });
    }
    return fuse.search(query.trim()).map(({ item }) => item);
  };
}

// Fuse supplies character ranges, including fuzzy matches; never treat a title as HTML.
export function findMatchRanges(text: string, query: string): readonly (readonly [number, number])[] {
  if (!query.trim() || !text) return [];
  const needle = query.trim().toLowerCase();
  const haystack = text.toLowerCase();
  const exact: [number, number][] = [];
  let offset = 0;
  while ((offset = haystack.indexOf(needle, offset)) !== -1) {
    exact.push([offset, offset + needle.length - 1]);
    offset += needle.length;
  }
  if (exact.length) return exact;
  return new Fuse([text], { threshold: 0.3, ignoreLocation: true, includeMatches: true })
    .search(query.trim())[0]?.matches?.[0]?.indices ?? [];
}
