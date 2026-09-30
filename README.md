# rasim.run — Eleventy + Sveltia CMS

This is a CMS-ready conversion of the supplied static website. The visual CSS, assets, filters, Tone.js hover audio, and existing `/pages/*.html` URL structure are preserved.

## What changed

- Homepage project cards are generated from `src/projects/*.md`.
- Project detail pages use one shared template: `src/_includes/project.njk`.
- Header/about text, links, filters, and last-updated text live in `src/_data/site.json`.
- `/admin/` loads Sveltia CMS so projects and global content can be edited without touching code.
- Uploaded CMS media goes into `src/assets/`, so the existing media approach stays simple and free.

## Run locally

```bash
npm install
npm run dev
```

Eleventy will serve the site locally. You can keep designing the templates, CSS and JS directly.

## Connect the CMS to GitHub

1. Create/push this project to a GitHub repository.
2. Edit `src/admin/config.yml`.
3. Replace:

```yml
repo: YOUR_GITHUB_USERNAME/YOUR_REPO
```

with your actual `owner/repository`.

For the fastest personal setup, Sveltia can sign in with a GitHub access token. For a friendlier “Sign in with GitHub” button, configure GitHub OAuth in Netlify (or use Sveltia CMS Authenticator).

## Deploy on Netlify

Import the GitHub repository into Netlify. `netlify.toml` already tells Netlify to run `npm run build` and publish `_site`. Point `rasim.run` to that Netlify site.

## Editing content

Once deployed, visit:

```
https://rasim.run/admin/
```

Projects expose: title, homepage title, year, order, homepage visibility, categories, filters, cover image/video, external project links, description, and an ordered media gallery. New project URLs are created automatically as `/pages/<slug>.html`.

## Design freedom

CMS data does not control layout. Change `index.njk`, `project.njk`, `home.css`, `detail.css`, or JS whenever you want. Existing content will flow into the new design automatically.
