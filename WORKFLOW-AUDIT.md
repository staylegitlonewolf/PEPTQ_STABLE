# PEPTQ STABLE - Workflow Audit (Ops Readiness)

Updated: 2026-04-02 (America/New_York)
Folder: `C:\Users\Lonewolf\Desktop\PEPTQ STABLE`

## Scope

This audit is for the PEPTQ STABLE app (the version that keeps the original operational system: owner dashboard, profile, internal routes, and the Google Apps Script + Sheets backend).

Constraint for this audit: do not perform any end-to-end testing that triggers Google Apps Script email-sending automation.
We can still audit and verify UI flows, routing, data-loading, and non-email operational commands safely.

## Automated Checks (Local)

Ran against `C:\Users\Lonewolf\Desktop\PEPTQ STABLE`:

- `npm test` -> PASS
- `npm run build` -> PASS
- `npm run lint` -> PASS (warnings only; no errors)

Notes:
- ESLint was updated to ignore build artifacts and temporary folders (lint should only reflect maintained source code).

## Day-to-Day Operational Smoke Checklist (Manual)

Safe to test without sending emails:

1. Public routing
   - `/` loads
   - `/coa` loads and search UI is usable
   - `/verify/:lotId` loads and handles "not found" gracefully
   - Policy pages load: `/terms`, `/privacy`, `/shipping`, `/refund`, `/payment-policy`, `/contact`

2. Site layout + asset loading
   - Brand assets (logo/favicon) resolve via the asset registry where configured
   - If the network is down, previously loaded assets/layout fall back to local cache where available

3. Catalog browsing (read-only)
   - `/catalog` loads catalog list for the current role
   - `/catalog/:slug` loads product detail and images

4. Accessibility + language assist
   - Accessibility quick settings open/close
   - Fullscreen toggle appears only on Fullscreen-capable browsers (Android Chrome) and can toggle on/off
   - iOS does not show the fullscreen toggle

Owner workflows that should be exercised carefully (read-only first):

5. Owner dashboard access
   - `/owner` loads (store-on)
   - Tabs load without runtime errors (Ops, Growth, Registry, System)
   - Assets manager page loads and lists existing assets (GET_ASSETS)

## Google Apps Script Commands (Email-Safe vs. Email-Risk)

The frontend calls the Apps Script web-app endpoint defined in:
- `src/services/api.js`
- Default: `VITE_GOOGLE_SCRIPT_URL` (or the built-in live fallback URL)

Email-risk commands (do not run during this audit):
- Auth email OTP: `SEND_AUTH_EMAIL_CODE`
- Owner email ops: `SEND_INVOICE`, `DISPATCH_PROFORMA_INVOICE`, `SEND_DELIVERY_CONFIRMATION`
- Automated alerts: `SEND_LOW_STOCK_ALERTS`
- Member PIN email: `ISSUE_TEMP_MEMBER_PIN`

Generally email-safe (read-only) commands to verify connectivity:
- `GET_CATALOG`
- `GET_ASSETS`
- COA verify reads (ex: `GET_QR_COA` / lot lookups)
- `GET_SITE_LAYOUT`

## Asset Strategy Recommendation (Local vs Sheets/Drive)

Best practice for PEPTQ STABLE is a hybrid:

1. Keep a small set of "baseline UI" assets local in the repo (`public/*`).
   - This guarantees the app has a minimum viable look even if Drive/Sheets URLs change or the network is flaky.
   - Changing these requires a git commit + redeploy.

2. Use Google Sheets + Google Drive as the owner-managed asset registry for anything that changes often:
   - Site pulls assets at runtime via `GET_ASSETS` and caches them locally (`localStorage` key: `peptq_assets_local_v1`).
   - Owner can upload/replace assets from the Owner tools (Asset Manager / Website Editor) without committing code.
   - Once the stable site is live, new asset URLs in Sheets/Drive will show up on the live site on the next refresh (subject to cache).

Answer to "Does the owner have to commit changes for new photos?":
- If the photo is local (in `public/`): yes, commit + deploy.
- If the photo is in Drive/Sheets asset registry: no commits needed; the site reads the updated URL at runtime.

## Offline / Resilience Reality Check

For the general public, a static website cannot be fully offline unless it is installed as a PWA and a Service Worker caches:
- HTML/CSS/JS bundles
- last-known JSON payloads (catalog, assets, layout)
- last-known images/PDFs

Current behavior:
- The app caches certain JSON (assets/layout) in `localStorage`, so it can gracefully fall back to last-known values on temporary outages.
- Drive-hosted images/PDFs depend on the network unless previously cached by the browser.

If you want "works offline after first load" reliability:
- Add a PWA Service Worker (Workbox / vite-plugin-pwa) to cache the app shell and last-known registry assets.

## GitHub Repo State (FYI)

Repo mentioned: `https://github.com/staylegitlonewolf/PEPTQ_STABLE`

Current observation:
- The GitHub repo has only an initial `.gitkeep` commit.
- `C:\Users\Lonewolf\Desktop\PEPTQ STABLE` contains the real app code but is not yet connected to that remote in a normal clone/push setup.

Recommended next step (do only when you're ready to publish):
- Add the GitHub remote to `PEPTQ STABLE`, commit, and push (merge/replace the `.gitkeep` as needed).

