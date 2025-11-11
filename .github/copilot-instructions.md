## Purpose
Quick orientation for AI coding agents working on the NunciaYa codebase (static frontend + Firebase Functions + Algolia). Focus on the concrete patterns, file locations, and dev workflows an agent must know to be productive immediately.

## Big picture
- Frontend: static HTML/CSS/JS served from the project root. No bundler. Tailwind is pulled from CDN.
- Client libs: Firebase compat SDKs are included in page HTML via <script> tags. app.js initializes Firebase and exposes helpers on window (e.g. `window.setLang`, `window.loadComponents`, `window.runSessionLogic`).
- Data flow: Firestore collection `listings` is the canonical store. Cloud Functions (functions/index.js) syncs `listings` to Algolia on create/update/delete and performs scheduled cleanup.
- Images: Stored in Firebase Storage; functions attempt to delete storage files when listings are removed.

## Key files and patterns (examples)
- `app.js` — global bootstrap. Responsibilities: load `_header.html`/`_footer.html`, initialize Firebase compat SDKs, expose global helpers (loadComponents, setLang, runSessionLogic). Pages rely on these global functions.
- `_header.html` / `_footer.html` — small reusable fragments loaded at runtime by `app.js` into `header-placeholder` / `footer-placeholder` (elements with these IDs).
- `locations-cr.js` — canonical location data (provinces/cantons/districts) exposed as `window.costaRicaLocations` and used to populate filters.
- `listing-search.html`, `pages/*/*.html` — page-level scripts follow the same conventions: they include the compat SDKs, include `app.js` (path varies), then call global helpers and provide a small pageText map into `setLang`.
- `functions/index.js` — Cloud Functions (v1 style) that require Algolia credentials (expects `process.env.ALGOLIA_APP_ID` and `process.env.ALGOLIA_API_KEY`). Important handlers: `onListingCreated`, `onListingUpdated`, `onListingDeleted`, `backfillDatabaseToAlgolia`, `deleteExpiredListings`.
- `functions/package.json` — scripts: `serve` (emulator), `deploy` (firebase deploy --only functions), and `lint` (currently a no-op). Node engine set to 20.
- `firebase.json` — contains a `functions` predeploy hook: `npm --prefix "$RESOURCE_DIR" run lint` (note: lint is a no-op at the moment).

## Project-specific conventions and gotchas
- Path prefixes matter: pages are nested under `pages/...` and include `app.js` with relative paths (e.g. `../../app.js`). When calling `loadComponents`/`runSessionLogic` pages must pass the correct path prefix (index uses `./`, nested pages usually use `../../`). Verify `header/footer` loading failures by checking pathPrefix.
- Language i18n: pair of classes `lang-en` / `lang-es` used widely. Page scripts provide a `textMap` into `setLang` to localize dynamic text. When modifying a page, add IDs to the pageText map so `setLang` can update placeholders and button text.
- Firebase SDKs: project uses the compat UMD builds (firebase-*-compat.js) and mixes direct `firebase.*` usages with destructured imports inside `app.js` (it expects the global `firebase` object). Be careful when refactoring to modular (v9) imports — many pages rely on the compat globals.
- Algolia keys: front-end uses search-only keys in `listing-search.html` and some pages (safe for public). The server-side CRUD/sync uses admin keys via environment variables — do not hardcode admin keys into client HTML.
- Cloud Functions env: `functions/index.js` expects Algolia config via environment (`process.env.*`) or `.env` when running locally. The repository contains comments about `.env.nunciaya-web` — prefer Firebase environment config or secrets when deploying.

## Developer workflows (concrete commands / examples)
- Run Cloud Functions locally (from project root or functions folder):
```powershell
cd functions
npm run serve
```
- Deploy functions:
```powershell
cd functions
npm run deploy
# or from project root with Firebase CLI: firebase deploy --only functions
```
- Set Algolia env for functions (example using Firebase CLI):
```powershell
firebase functions:config:set algolia.app_id="<APP_ID>" algolia.api_key="<ADMIN_KEY>"
```
Then redeploy functions so they see the new config.

## Where to look for common edits
- To change header/footer or link behavior: edit `_header.html`, `_footer.html` and `app.js` (session & link logic).
- To change listing behavior, filters, or Algolia client usage: `listing-search.html`, `pages/*/*` and `locations-cr.js` for location data.
- To adjust backend sync, cleanup, or Algolia mapping: `functions/index.js` (search for `listings` collection and Algolia index logic).

## Minimal safety rules for an AI agent
- Never add or expose Algolia admin keys in client-side HTML. Client keys may be search-only.
- When changing Firebase initialization, preserve compat behavior (script tags + `window.firebase*` usage) unless you update all pages to modular imports.
- If you update `app.js` path behavior, update all nested pages to pass the correct pathPrefix to `loadComponents/runSessionLogic`.

## Quick checklist for PRs touching cross-cutting code
- If you change `app.js`: test header/footer load on root and at least one nested page (e.g. `pages/housing/apartments.html`).
- If you change functions: ensure `functions/package.json` `engines.node` remains compatible (Node 20) and test with `npm run serve`.
- If adding server-side Algolia features: document required environment variables and their provisioning method.

## Questions for the repo owner
- Preferred method for providing Algolia credentials to functions (Firebase config vs .env file)?
- Any CI/predeployment lint or test expectations beyond the no-op `lint` script in `functions/package.json`?

If you'd like, I can open a PR that adds this file and optionally wire a short README that documents how to run the emulator and where to place environment variables. What would you prefer me to do next?
