# Astro + Decap CMS Blog Starter

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

## Deployment Notes

- Designed for Cloudflare Pages with `npm run build` as the build command and `dist` as the output directory.
- The Decap CMS config expects a GitHub backend (`AluNitech/my-blog`) with an OAuth proxy exposed under `/api/auth` in production.
- Update `public/admin/config.yml` so `base_url` matches the full origin (protocol + host) serving the site, leaving `auth_endpoint` as `api/auth`; add preview domains to `CMS_ALLOWED_RETURN_ORIGINS` when necessary.
- Set the Cloudflare Pages environment variable `CMS_ALLOWED_RETURN_ORIGINS` to a comma区切りのオリジン一覧（例: `https://my-blog-32m.pages.dev,https://15b3cd06.my-blog-32m.pages.dev`）にして、複数のプレビュー/本番ドメインを許可する。
- Uploaded media lands in `astro-app/public/uploads` (served from `/uploads`).
- Base styles live in `src/styles/global.css` and only set light typography and layout defaults.
- The OAuth proxy lives in `functions/api/auth.ts` and expects `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` (GitHub OAuth App with callback `{origin}/api/auth`) and optional `CMS_ALLOWED_RETURN_ORIGINS` to restrict postMessage destinations.
