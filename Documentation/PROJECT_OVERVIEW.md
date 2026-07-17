# Obojima Potion Almanac

The Obojima Potion Almanac is a browser-based toolkit for potion brewing and ingredient discovery in *Obojima: Tales from the Tall Grass*. It runs entirely as a static website and stores player data in the browser.

## Tools

### Potion Almanac

The Potion Almanac compares a player's ingredient inventory with the potion recipe tables and displays every potion that can currently be brewed. It supports the 2014 and 2024 rulesets and groups results by Combat, Utility, and Whimsy potion types.

### Ingredient Finder

The Ingredient Finder works backward from a desired potion. It identifies:

- recipes that can already be completed from the current inventory;
- a single missing ingredient that would complete a recipe using two ingredients already owned; and
- cases that require more than one additional ingredient.

When suggesting a missing ingredient, the tool prioritizes the selected Region, then nearby Regions, then distant Regions.

### Foraging Aid

The Foraging Aid generates ingredients that could reasonably be identified in a selected Region and Search Area. Results use the character's check total, Degree of Success, the ingredient's rarity and refinement, regional availability, Search Area associations, and the boolean `forageable` rules filter.

## Player data

Inventory and profile data are stored in `localStorage`. Players can save, load, import, and export their inventory without a server account.

## Accessibility

The site includes keyboard-accessible controls, screen-reader labels, responsive layouts, and an optional high-contrast mode.

## Project structure

- `index.html` — Potion Almanac
- `ingredient-finder.html` — Ingredient Finder
- `foraging-aid.html` — Foraging Aid
- `css/style.css` — shared presentation
- `js/common.js` — shared data, inventory, profile, modal, and recipe utilities
- `js/almanac.js` — Potion Almanac behavior
- `js/ingredient-finder.js` — Ingredient Finder behavior
- `js/foraging-aid.js` — Foraging Aid behavior
- `js/accessibility.js` — accessibility and contrast behavior
- `data/ingredients.json` — ingredient values, rarity, Regions, Search Areas, refinement, and forageability
- `data/potion_names.json` — potion names
- `data/regions.json` — Region definitions and relationships
- `data/search_areas.json` — Search Area definitions and civilization values
- `data/foraging_config.json` — foraging thresholds and weights

## Documentation

- `README_STATIC.md` — deployment and local-use instructions
- `FORAGING_MODEL.md` — the complete foraging data model and selection logic
- `PROJECT_OVERVIEW.md` — user-facing summary of the current application
