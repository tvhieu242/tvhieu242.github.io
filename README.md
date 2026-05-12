# Iterable Catalog Copier

A small React + Vite app to **copy Iterable catalogs** (schema and items) between Iterable projects using the [Catalogs API](https://api.iterable.com/api/docs#catalogs_listCatalogs).

## Requirements

- Node.js 18+ (recommended)
- Iterable API keys for source and destination projects (entered in the UI only)

## Local development

Iterable blocks typical browser calls from arbitrary origins (CORS). This project uses a **dev proxy** so API requests go to `/iterable-api` and Vite forwards them to `https://api.iterable.com`.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Do **not** rely on opening built files as `file://` without a proxy unless you understand CORS limitations mentioned in `index.html`.

## Build

```bash
npm run build
npm run preview   # optional: preview production build locally
```

## Deploy (Vercel)

`vercel.json` rewrites `/iterable-api/*` to Iterable’s API so the deployed app can call the API from the browser without changing the frontend origin.

Deploy from this repo with Vercel’s default settings for a Vite static site (`npm run build`, output `dist`).

## Security

- **Never commit API keys.** Keys are only sent from the browser when you use the app.
- Keep `.env` and similar files out of git (see `.gitignore`). Do not paste tokens into the README or commit history.

## Repository

https://github.com/tvhieu242/iterable-copy-catalog
