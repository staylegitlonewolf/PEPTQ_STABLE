# PEPTQ Copilot Guardrails

You are helping with minor visual, copy, and owner-workflow improvements for PEPTQ.

Priorities, in order:
1. Site stability
2. Data integrity
3. Owner usability
4. Visual polish

Treat this repository as a live business system with Google Apps Script, Google Sheets, and Google Drive dependencies. Prefer the smallest safe change that solves the user's request.

## Safe Default Behavior

- Prefer editing copy, labels, descriptions, button text, and low-risk UI polish.
- Prefer updating owner-configurable values over changing hardcoded infrastructure.
- When a request touches checkout, order routing, auth, Google Drive, Google Sheets, or Apps Script commands, slow down and explain the risk before proposing edits.
- Preserve the current spreadsheet- and Drive-backed architecture unless the user explicitly asks for a developer-level infrastructure change.
- Do not suggest deleting files, commands, or config values that appear to support Google Drive, Google Sheets, Apps Script, auth, or inventory reconciliation unless the user explicitly approves that exact removal.

## No-Touch Without Explicit Developer Approval

Do not modify these areas for casual owner requests such as "change text," "swap an image," or "make it look better":

- Google Drive and asset plumbing
  - `normalizeDriveUrl`
  - upload helpers
  - Drive folder IDs
  - image storage strategy
- Apps Script bridge and command routing
  - `runCommand`
  - `postCommand`
  - `postOwnerCommand`
  - `src/services/api.js`
  - `backend_Google/v1/Code.gs`
- Order, billing, preorder, and inventory integrity
  - `src/services/orderService.js`
  - `backend_Google/v1/commands.orders.gs`
  - `backend_Google/v1/commands.billing.gs`
  - inventory reservation, discount handling, status transitions
- Auth and security flows
  - identity/login logic
  - protected routes
  - PIN, member role, or owner session enforcement
- Data schemas and storage contracts
  - sheet column meanings
  - product/order JSON structure
  - cached object shapes used by frontend and backend together

## Safe Playground Areas

These are usually safer for Copilot-assisted changes:

- text in page sections
- headings, paragraphs, badges, helper text, and button labels
- page layout polish
- CSS classes and presentation tweaks
- swapping image URLs already supported by the owner dashboard
- documentation updates
- content pages such as Home, About, Mission, Support, policy text, and owner-facing helper copy

## Required Response Pattern For Risky Requests

If a user asks for a change in a protected area, do this:

1. State that the request touches a core developer/infrastructure area.
2. Briefly explain what could break.
3. Offer the safest alternative.

Example:
"That change touches the Google Drive or Apps Script bridge used by the live system. I recommend leaving the plumbing alone and updating the image URL or owner-config value instead."

## Workflow Expectations

- Prefer working in `client-editor` or another sandbox branch for experimental edits.
- Keep `main` protected and review changes before merge.
- Prefer PR-ready, minimal diffs over broad refactors.
- Do not remove docs that explain infrastructure handoff, owner operations, or backend sheet structure unless explicitly asked.

## PEPTQ Vocabulary

- Prefer institutional wording over retail wording when possible.
- Keep "research", "member", "portal", "request", and "owner" terminology aligned with the existing product language.

