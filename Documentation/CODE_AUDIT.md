# Code Audit — 2026-07-20

## Scope

The current build was compared with the last known-working July 17 build. HTML references, JavaScript syntax, JSON syntax, data relationships, initialization flow, persistence behavior, and shared UI code were reviewed.

## Corrections

- Restored the missing `displaySortKey()` helper used by Search Area sorting.
- Replaced the single broad Foraging Aid initialization `try...catch` with named initialization stages, so failures identify the exact stage.
- Added safe anonymous reporting for Foraging Aid initialization failures.
- Corrected **Clear Search** so **Prioritize undiscovered ingredients** returns to its intended unchecked default.
- Corrected **Clear Search** so comparison state and the **Weighted Results** heading are reset consistently.
- Added a missing guard around the Region select element.
- Removed a duplicate accessibility binding for toolkit navigation links.
- Hardened PostHog initialization so an analytics failure cannot break any Almanac tool.
- Disabled session recording explicitly.
- Corrected model documentation to match the actual Civilization values for Ruins and Sacred Site (`3.0`).

## Validation

- All JavaScript files pass `node --check`.
- All JSON files parse successfully.
- Every local HTML stylesheet and script reference resolves to an existing file.
- HTML IDs are unique within each page.
- Region, Search Area, and ingredient references were checked for missing targets.
- The ZIP preserves the expected static-site directory structure.
