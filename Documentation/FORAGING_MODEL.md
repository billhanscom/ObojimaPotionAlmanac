# Obojima Foraging Model

This document describes the finalized data model and selection logic used by the Foraging Aid.

## Core principle

The player chooses **where** to search. The model determines which ingredients could reasonably turn up in that environment. It does not attempt to model the player's intention or a separate degree of “forageability.”

A bottle cap in a town is environmentally equivalent to seaweed on a coast: each is an ordinary finding in the appropriate setting. The interaction between an ingredient's **refinement** and a Search Area's **civilization** value handles that distinction.

## Ingredient fields

### `rarity`

The published rarity tier: `common`, `uncommon`, or `rare`.

Rare ingredients are not available through ordinary foraging. They require a multipart quest or similarly exceptional acquisition, so every Rare ingredient has `"forageable": false`.

### `forageable`

A boolean rules filter.

- `true`: the ingredient may appear in ordinary Foraging Aid results.
- `false`: the ingredient is excluded from ordinary foraging, regardless of Region or Search Area.

This is not a graduated score. It does not describe how natural, easy to find, or likely an ingredient is.

Non-Rare exclusions currently include environmental media or prepared servings that are not sensible discrete foraging finds:

- Sea Water
- Corrupted Seawater
- Opu Opu Spring Water
- Hakumon's Ramen Broth
- Happy Joy Cake
- Spirit Tea

### `refinement`

A 1–5 scale measuring how many phases of sapient intervention are required to produce the ingredient in the form in which it is found.

| Score | Meaning |
|---:|---|
| 1 | Wild or naturally occurring; no sapient production required. |
| 2 | One simple intervention, such as cutting, drying, bundling, or basic extraction. |
| 3 | Several straightforward preparation stages, such as gathering, drying, grinding, or combining. |
| 4 | Substantial skilled processing with multiple deliberate stages. |
| 5 | Completely manufactured through a complex, multiphase process, often involving several methods or materials. |

Refinement is based on the actual ingredient description, not assumptions drawn from its name. The ingredient is scored in its encountered form: Bashu Powder is processed even though the bashu tree is wild; Oporion Glass is unrefined even though its name sounds manufactured.

### `regions`

Regions where the ingredient is native. Degree of Success can broaden results from native to adjacent and then distant Regions according to the configured thresholds.

### `associated_search_areas`

Ecological or cultural environments where the ingredient would reasonably occur or accumulate. These describe the finished ingredient, not merely the habitat of its raw source material.

Examples:

- Blue Back Salmon: River, Coral Reef, Open Water
- Bashu Powder: Settlement, Village, Town, Market
- Flash Paper: Town, Market, City Streets
- Oporion Glass: Cave, Cliffside, Geothermal
- Vinyl Record: Ruins, Subway, Town, Market

Related Search Areas contribute only when the related area exists in the selected Region.

## Search Area civilization

Search Areas retain a 1–5 `civilization` value measuring how strongly sapient activity defines the environment.

| Search Area | Civilization |
|---|---:|
| Cliffside | 1.0 |
| Geothermal | 1.1 |
| Underwater | 1.2 |
| Coral Reef | 1.3 |
| Cave | 1.5 |
| Open Water | 1.7 |
| Wetland | 1.9 |
| Forest | 2.1 |
| Grassland | 2.3 |
| Coast | 2.5 |
| Settlement | 2.7 |
| Lake | 2.8 |
| River | 3.0 |
| Ruins | 3.1 |
| Shrine | 3.2 |
| Village | 3.5 |
| Mine | 3.8 |
| Subway | 3.8 |
| Town | 4.3 |
| Market | 4.7 |
| City Streets | 5.0 |

The engine compares ingredient refinement with Search Area civilization using a smooth compatibility taper. Highly refined findings become more plausible as the environment becomes more strongly shaped by sapient activity.

## Canonical Search Areas

Natural environments:

Cave, Cliffside, Coast, Coral Reef, Forest, Geothermal, Grassland, Lake, Open Water, River, Underwater, Wetland.

Civilized or cultural environments:

City Streets, Market, Mine, Ruins, Settlement, Shrine, Subway, Town, Village.

`Mountain`, `Highland Meadow`, `Swamp`, and `Waterfront` are retired. Mountain terrain is represented by specific environments such as Cliffside, Cave, Grassland, Geothermal, and Mine. Swamps are included under Wetland. Yatamon uses River rather than Waterfront.

## Selection sequence

1. Exclude ingredients with `forageable: false`.
2. Apply the DC tier's rarity and geographic eligibility.
3. Determine Region relationship: native, adjacent/nearby, or distant.
4. Evaluate direct and related Search Area compatibility, limited to areas present in the selected Region.
5. Compare ingredient refinement with Search Area civilization.
6. Apply rarity, Region, habitat, refinement, DC, and Degree-of-Success weights.
7. Select the number of findings determined by Degree of Success.

Rarity remains the primary source of scarcity. Degree of Success mainly increases haul size and geographic breadth rather than promoting Rare ingredients into the ordinary foraging pool.

## Region Search Areas

- **Brackwater Wetlands:** Cave, Coast, Forest, Lake, River, Ruins, Settlement, Village, Wetland
- **Coastal Highlands:** Cave, Cliffside, Coast, Forest, Grassland, Lake, River, Ruins, Settlement, Town, Village, Wetland
- **Gale Fields:** Forest, Grassland, Lake, River, Ruins, Settlement, Town, Village
- **Gift of Shuritashi:** Cave, Coast, Forest, Grassland, Lake, River, Ruins, Settlement, Town, Village, Wetland
- **Land of Hot Water:** Cave, Cliffside, Coast, Forest, Geothermal, Grassland, River, Ruins, Settlement, Town, Underwater, Village
- **Mount Arbora:** Cave, Cliffside, Forest, Geothermal, Grassland, Mine, River, Ruins, Settlement, Town, Village
- **The Shallows:** Cave, Coast, Coral Reef, Open Water, Ruins, Settlement, Underwater, Village
- **Yatamon:** City Streets, Market, River, Ruins, Shrine, Subway
