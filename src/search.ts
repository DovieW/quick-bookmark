type Range = readonly [number, number];
interface Word { text: string; start: number; end: number; }
interface SearchText { text: string; offsets: Range[]; words: Word[]; }
interface Match { quality: number; ranges: Range[]; }

// Keep original UTF-16 positions so accents and emoji cannot shift highlights.
function prepare(value: string): SearchText {
  let text = "";
  const offsets: Range[] = [];
  let position = 0;
  for (const character of value) {
    const end = position + character.length - 1;
    const normalized = character.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "");
    for (let i = 0; i < normalized.length; i++) offsets.push([position, end]);
    if (!normalized && offsets.length) offsets[offsets.length - 1] = [offsets[offsets.length - 1][0], end];
    text += normalized;
    position = end + 1;
  }
  const words = Array.from(text.matchAll(/[\p{L}\p{N}]+/gu), match => ({
    text: match[0], start: match.index!, end: match.index! + match[0].length - 1,
  }));
  return { text, offsets, words };
}

function queryWords(query: string): string[] {
  const prepared = prepare(query.trim());
  // Symbol-only searches (for example an emoji folder name) remain literal.
  return [...new Set(prepared.words.length ? prepared.words.map(word => word.text) : [prepared.text])].filter(Boolean);
}

// Bounded Damerau-Levenshtein: insertions, omissions, substitutions and swapped letters.
function editDistance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  let beforePrevious = previous;
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1,
        previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        current[j] = Math.min(current[j], beforePrevious[j - 2] + 1);
      }
    }
    if (Math.min(...current) > limit) return limit + 1;
    beforePrevious = previous;
    previous = current;
  }
  return previous[b.length];
}

function matchTerm(field: SearchText, term: string): Match | null {
  const literal: Range[] = [];
  let quality = 2; // Interior substring; complete words and prefixes rank above it.
  let start = 0;
  while ((start = field.text.indexOf(term, start)) !== -1) {
    const word = field.words.find(word => word.start === start);
    quality = Math.min(quality, word ? (word.text === term ? 0 : 1) : 2);
    literal.push([start, start + term.length - 1]);
    start += term.length;
  }
  if (literal.length) return { quality, ranges: literal };
  // Short queries and numbers need literal matches; fuzzy matching them is too noisy.
  if (term.length < 4 || !/^\p{L}+$/u.test(term)) return null;
  const limit = term.length >= 8 ? 2 : 1;
  let best = limit + 1;
  const ranges: Range[] = [];
  for (const word of field.words) {
    const distance = editDistance(term, word.text, limit);
    if (distance > limit || distance > best) continue;
    if (distance < best) ranges.length = 0;
    best = distance;
    ranges.push([word.start, word.end]);
  }
  return ranges.length ? { quality: 2 + best, ranges } : null;
}

export function createFuzzyFilter<T>(options: { keys: readonly (keyof T)[] }) {
  let indexedItems: T[] | null = null;
  let index: { item: T; fields: SearchText[]; order: number }[] = [];
  return (items: T[], query: string): T[] => {
    const terms = queryWords(query);
    if (!terms.length) return items;
    if (indexedItems !== items) {
      indexedItems = items;
      index = items.map((item, order) => ({ item, order,
        fields: options.keys.map(key => prepare(String(item[key] ?? ""))),
      }));
    }
    const phrase = prepare(query.trim()).text;
    const results: { item: T; score: number[] }[] = [];
    for (const entry of index) {
      let secondary = 0;
      let fuzzy = 0;
      let quality = 0;
      let interior = false;
      let complete = true;
      for (const term of terms) {
        let best: { match: Match; field: number } | null = null;
        for (let field = 0; field < entry.fields.length; field++) {
          const match = matchTerm(entry.fields[field], term);
          if (!match) continue;
          // Literal evidence beats typos; otherwise prefer the title to supporting fields.
          const score = [Number(match.quality > 2), Number(field > 0), match.quality];
          const previous = best && [Number(best.match.quality > 2), Number(best.field > 0), best.match.quality];
          if (!previous || compare(score, previous) < 0) best = { match, field };
        }
        if (!best) { complete = false; break; }
        secondary += Number(best.field > 0);
        fuzzy += Number(best.match.quality > 2);
        quality += best.match.quality;
        interior ||= best.match.quality === 2;
      }
      if (!complete) continue;
      const exactTitle = entry.fields[0]?.text.trim() === phrase;
      const tier = exactTitle ? 0 : fuzzy ? 4 : secondary ? 3 : interior ? 2 : 1;
      results.push({ item: entry.item, score: [tier, fuzzy, secondary, quality, entry.order] });
    }
    // Stable input order preserves frequency/recency preference only on relevance ties.
    return results.sort((a, b) => compare(a.score, b.score)).map(result => result.item);
  };
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

export function findMatchRanges(text: string, query: string): Range[] {
  const field = prepare(text);
  const ranges = queryWords(query).flatMap(term => matchTerm(field, term)?.ranges ?? [])
    .map(([start, end]) => [field.offsets[start][0], field.offsets[end][1]] as Range)
    .sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
