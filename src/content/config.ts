import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
      title: z.string(),
      description: z.string(),
      publishDate: z.date(),
      updatedDate: z.date().optional(),
      tags: z.array(z.string()).default([]),
      draft: z.boolean().default(false),
      coverImage: z
        .string()
        .regex(/^\/.*$/, 'Cover images should live under public/ and start with a leading slash.')
        .optional(),
      heroImage: z
        .string()
        .regex(/^\/.*$/, 'Hero images should live under public/ and start with a leading slash.')
        .optional(),
      slug: z
        .string()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug should use lowercase kebab-case characters.')
        .optional(),
    }),
});

export const collections = { blog };
