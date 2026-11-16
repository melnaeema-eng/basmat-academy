# Academy deployment

Canonical source: repository-root `src/`, `public/`, `package.json`, and `package-lock.json`.
Cloudflare Pages project: **basmat-academy-v2**. Existing custom domain: **academy.basmat-alnawabig.com.sa**.

Preferred Pages configuration: production branch `main`, root directory `/` (empty), build command `npm run build`, build output `dist`. Preserve the existing environment variables. Do not create a new project or change DNS.

For compatibility, a project configured with root `basmat-academy/` can keep `npm run build` and output `dist`: its build now delegates to the canonical root package and copies the root build to `basmat-academy/dist`. The nested legacy source is not used for production builds.

`public/_redirects` sends direct SPA routes to `index.html`. After deployment verify `/labs/ccna/l25-overlap-renumbering-change-control`, a browser refresh on that route, `/courses`, and the latest commit in the Pages deployment details. A GitHub merge or successful local build does not confirm which project or domain was deployed.
