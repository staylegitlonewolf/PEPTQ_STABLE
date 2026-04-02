# Content And UI Sandbox

Apply these instructions when working in:

- `src/pages/**`
- `src/components/**`
- `src/content/**`
- `README*.md`

## Intent

This is the safer sandbox for owner-friendly edits.

## Preferred Changes

- copy rewrites
- button text
- helper text
- spacing and layout polish
- visual hierarchy
- safe image URL swaps
- owner-facing explanations
- documentation cleanup

## Boundaries

- Do not silently change business logic while editing UI.
- If a UI request would require changing a protected backend or integration file, stop and explain that extra scope.
- Prefer owner-configurable or content-driven solutions over hardcoded one-off changes.

## PEPTQ-Specific Notes

- Keep the tone polished and professional.
- Maintain current route names and institutional vocabulary unless explicitly asked to rename them.
- When image paths fail, prefer graceful fallback behavior over deleting references blindly.

