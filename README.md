# Astro + Decap CMS を使ったシンプルなブログ
<img width="1200" alt="スクリーンショット 2025-11-06 171649" src="https://github.com/user-attachments/assets/0899e3ca-6d1e-4641-a7a5-3ed1333d29c1" />
ーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーーー
<img width="1200" alt="スクリーンショット 2025-11-06 171857" src="https://github.com/user-attachments/assets/125d0469-2f86-4698-b0ef-ac868ed46367" />



An Astro-powered static blog that pairs content collections with Decap CMS. The interface stays intentionally minimal so you can extend the styling or structure to meet your needs.

## Project Structure

```text
/astro-app
├── public/
│   ├── admin/
│   │   ├── config.yml
│   │   └── index.html
│   ├── favicon.svg
│   └── uploads/
├── src/
│   ├── components/
│   │   ├── PostCard.astro
│   │   └── Tag.astro
│   ├── content/
│   │   ├── blog/
│   │   │   ├── content-workflow.md
│   │   │   ├── draft-post.md
│   │   │   └── getting-started.md
│   │   └── config.ts
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── blog/
│   │   │   ├── [slug].astro
│   │   │   └── index.astro
│   │   ├── tags/
│   │   │   ├── [tag].astro
│   │   │   └── index.astro
│   │   └── index.astro
│   ├── styles/
│   │   └── global.css
│   └── utils/
│       ├── formatDate.ts
│       └── posts.ts
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## Local Development

| Command        | Description                                                   |
| :------------- | :------------------------------------------------------------ |
| `npm install`  | Install dependencies                                          |
| `npm run dev`  | Start the Astro dev server at `http://localhost:4321`         |
| `npm run build`| Generate the production build into `dist/`                    |
| `npm run preview` | Preview the production build locally                        |
| `npm run cms`  | Launch the Decap local backend (`npx decap-server`)           |

Run the dev server and the CMS backend in separate terminals. With both running, open `http://localhost:4321/admin/` to access the Decap UI.

## Content Model

- Blog posts live in `src/content/blog` and are validated by `src/content/config.ts`.
- Frontmatter fields: `title`, `description`, `publishDate`, `updatedDate`, `tags`, `draft`, `coverImage`, `heroImage`, optional `slug`, and the Markdown `body` field managed through Decap's rich-text editor.
- Draft posts (`draft: true`) are excluded from production builds automatically.
