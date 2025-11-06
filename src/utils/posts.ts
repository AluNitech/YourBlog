import type { CollectionEntry } from 'astro:content';

export type BlogEntry = CollectionEntry<'blog'>;

export const isDraft = (entry: BlogEntry) => entry.data.draft === true;

export const getPostSlug = (entry: BlogEntry) => entry.data.slug ?? entry.slug;

export const getPostPermalink = (entry: BlogEntry) => `/blog/${getPostSlug(entry)}`;

export const sortByPublishDateDesc = (entries: BlogEntry[]) =>
  [...entries].sort(
    (a: BlogEntry, b: BlogEntry) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf(),
  );

export const groupTags = (entries: BlogEntry[]) => {
  const tagMap = new Map<string, BlogEntry[]>();

  for (const entry of entries) {
    for (const tag of entry.data.tags ?? []) {
      if (!tagMap.has(tag)) {
        tagMap.set(tag, []);
      }

      tagMap.get(tag)?.push(entry);
    }
  }

  return tagMap;
};
