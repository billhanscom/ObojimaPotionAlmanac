# Obojima Potion Almanac — Static Site

The project is a static HTML, CSS, JavaScript, and JSON application. It does not require Python, Flask, a database, or another server-side runtime.

## Pages

- `index.html` — Potion Almanac
- `ingredient-finder.html` — Ingredient Finder
- `foraging-aid.html` — Foraging Aid

## Running locally

The pages fetch JSON files from the `data` directory. Many browsers block those requests when an HTML file is opened directly from disk, so serve the project directory with a local static server.

For example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Static hosting

The project can be deployed directly to any static host, including GitHub Pages, Cloudflare Pages, Netlify, or Vercel. Upload the project contents without changing the directory structure.

## Data storage

Inventory, profile, accessibility, and tool settings are stored in the browser with `localStorage`. No information is sent to an application server.

## JavaScript organization

- `js/common.js` contains shared data loading, inventory and profile storage, backup handling, modal dialogs, recipe helpers, and ingredient controls.
- `js/almanac.js` contains Potion Almanac recipe-display logic.
- `js/ingredient-finder.js` contains Ingredient Finder completion logic.
- `js/foraging-aid.js` contains Foraging Aid eligibility, weighting, selection, comparison, and result-display logic.
- `js/accessibility.js` contains high-contrast and accessibility behavior.

## Data files

- `data/ingredients.json`
- `data/potion_names.json`
- `data/regions.json`
- `data/search_areas.json`
- `data/foraging_config.json`

`ingredients.json` is the canonical ingredient dataset. Each ingredient can include potion values for both rulesets, rarity, native Regions, associated Search Areas, refinement, and a boolean `forageable` field.

See `FORAGING_MODEL.md` for the complete definition of the foraging system.
