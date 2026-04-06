# PEPTQ_STABLE

Updated: 2026-04-06 (America/New_York)

PEPTQ_STABLE is the full portal build (login/profile/owner tools) intended to run as the long-lived operational system.

## What This Repo Does

- Serves the PEPTQ portal frontend (Vite + Tailwind)
- Integrates with the operations backend (Google Apps Script) for:
  - Catalog data
  - Waitlist / apply / support submissions
  - Preorders
  - COA / verify lookups

## Catalog Description Support

The catalog now supports a `description` field sourced from the operations spreadsheet (CatalogBeta and/or Catalog). The UI surfaces:

- A short, 2-line description preview in catalog cards
- The first line of description in the Pre-Order cart

## Asset Rules (Important)

Vite rule of thumb:

- Static assets used by the app should live in `public/` (example: `logo.svg`, `hero.png`).
- Do not copy build output back into `public/` or `src/assets/`.
  - Build output belongs in `dist/`, and GitHub Actions publishes it.

## Local Development

```bash
npm install
npm run dev
```

## Build (GitHub Pages)

```bash
npm run build:pages
```

## Notes

- Apps Script deployments are managed separately from this repo (frontend deploys do not automatically redeploy Apps Script).
- When validating workflows, do not trigger automated notification emails unless explicitly requested.
