# Roadmap Plan: QR -> /coa (Member-Gated PDF Download)

This is a planning document only (no code yet). Use this to scope the feature before implementation.

---

## Goal

When a user scans a QR code on a product label, it should open a new route:
- `#/coa`

The `/coa` page should be portal-gated:
- Members only (or stricter, if required)

If the user is allowed, they can download the correct PDF CoA file for that product/lot.

---

## Decisions Needed (Before Build)

- What does the QR encode?
  - Option A: `product_handle` + `lot_id`
  - Option B: a single `coa_id`
  - Option C: a signed token

- Where are PDFs stored?
  - Option A: Google Drive folder (recommended)
  - Option B: public static hosting (not recommended if gated)

- Who can access?
  - Members only
  - Members + admins
  - Anyone with the QR (not gated)

- Does the download link need to expire?
  - Yes (stronger security)
  - No (simpler)

---

## Proposed Data Model (Google Sheets)

New sheet tab: `COA`

Recommended headers:
- `coa_id` (unique)
- `product_handle`
- `lot_id`
- `pdf_url`
- `status` (TRUE/FALSE)
- `created_at`

Optional:
- `notes`
- `requires_role` (MEMBER/ADMIN/OWNER)

---

## Frontend Work (Developer Required)

- Add route `#/coa`.
- Build a `CoaPage` that reads query params:
  - Example: `#/coa?lot_id=LOT-0001&product_handle=semaglutide-10mg`
- Add portal gate:
  - Verify identity with backend before showing the PDF.
- UX:
  - If not signed in / not active: show a clear message and a link to apply/support.
  - If mapping not found: show "CoA not found" with support link.

---

## Backend Work (Developer Required)

New command proposal:
- `command=GET_COA`

Inputs:
- `product_handle`
- `lot_id` (or `coa_id`)
- `email` (identity)

Outputs:
- If allowed and found: return `pdf_url` (or a time-limited link)
- If not allowed: return error code

Security:
- Do not expose gated PDFs without verifying membership status.

---

## QR Generation

Minimum viable:
- QR encodes the `#/coa` URL with query params.

Example:
- `https://staylegitlonewolf.github.io/PEPTQ_BETA/#/coa?product_handle=semaglutide-10mg&lot_id=LOT-0001`

Future hardening:
- Add a signed token to prevent guessable URLs.

---

## Acceptance Criteria (MVP)

- Scanning a label QR opens `#/coa`.
- Non-members cannot download the PDF.
- Members can download the correct PDF for the scanned lot.
- Missing/disabled mapping returns a friendly error screen.

