# Core Infrastructure Guardrail

Apply these instructions when working in:

- `src/services/api.js`
- `src/services/orderService.js`
- `backend_Google/**`
- files that normalize Drive URLs, upload images, route commands, handle auth, or persist orders

## Intent

These files are core system plumbing. Treat them as developer-owned infrastructure, not casual editing territory.

## Rules

- Do not make changes here for simple owner requests like copy edits, image swaps, or layout polish.
- Do not remove or rename commands, config keys, sheet identifiers, or helper functions unless the request is explicitly about infrastructure work.
- Preserve command payload shapes between frontend and Apps Script.
- Preserve Google Drive and Google Sheets integration behavior.
- Preserve auth/session checks and owner-only protections.
- Preserve inventory reservation, order lifecycle, and delivery workflow integrity.

## When Asked To Change These Files

- Explain the risk first.
- Suggest a safer config/content-level alternative if one exists.
- If no safe alternative exists, keep the change minimal and mention affected flows that must be retested.

