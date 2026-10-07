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
