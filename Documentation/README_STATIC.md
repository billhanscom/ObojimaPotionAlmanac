# Obojima Potion Toolkit - Static Build

This version removes the Flask/Python backend. It is designed for static hosting
(Cloudflare Pages, GitHub Pages, Netlify, Vercel static hosting, etc.).

Pages:
- index.html
- ingredient-finder.html

Data files:
- data/ingredients.json
- data/ingredients.json
- data/potion_names.json

Notes:
- The browser fetches JSON files directly.
- Inventory remains local to the browser via localStorage.
- Save/Load Inventory is handled entirely in JavaScript.
- Opening the files directly from disk may block fetch() in some browsers; run from a static server or host.


## Refactored JavaScript structure

- `js/common.js` contains shared data loading, inventory/profile/backup handling, modal dialogs, recipe helpers, and ingredient button rendering.
- `js/almanac.js` contains Potion Almanac-specific recipe display logic.
- `js/ingredient-finder.js` contains Ingredient Finder-specific completion logic.
- `js/accessibility.js` contains high-contrast and accessibility behavior.

This structure is intended to support the future Forager's Aid and inventory-centered rebuild without duplicating shared logic across tools.


## Search Areas

The Foraging Aid uses Region-specific Search Areas. Search Areas represent ecological or cultural environments players would naturally expect to search. The available list varies by Region.


## Foraging data model

The finalized Foraging Aid uses Region, Search Area, rarity, ingredient refinement, and the boolean `forageable` rules filter. Rare ingredients are quest-only and do not appear in ordinary foraging results. See `FORAGING_MODEL.md` for the complete model and canonical Search Areas.
