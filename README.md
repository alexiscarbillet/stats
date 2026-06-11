# stats.alexis-carbillet.com

Scaffold for fetching and displaying personal stats (Duolingo, GitHub).

Overview
- Server-side fetches run in GitHub Actions and write JSON to `data/` and `web/public/data/`.
- Public usernames are stored in `config.json`; no API keys are required for Duolingo or GitHub profile data.
- Static frontend is a React + Vite app in `web/` which builds into `docs/` for GitHub Pages.
- Workflow now also builds the site and commits `docs/` for GitHub Pages deployment.

Local update workflow:
1. Run `node scripts/fetch_stats.js` from the repo root.
2. Run `cd web && npm run build` to refresh `docs/data`.
3. Restart `npm run dev` if you are using the development server.
