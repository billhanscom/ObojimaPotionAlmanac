# Obojima Foraging Model

The Foraging Aid models what a knowledgeable character could reasonably identify while searching a particular environment. The player chooses a **Region** and **Search Area**; the system evaluates which brewing ingredients plausibly occur there.

## Ingredient identity

Ingredient names describe the brewing component placed in the character's inventory. Descriptions clarify what the named ingredient is, where it occurs, whether it is cultivated or processed, and how it is used.

The model scores the ingredient **in its listed form**:

- Kojo Root is the root itself. A description saying that it can later be dried or pulverized does not make the listed ingredient a powder.
- Bashu Powder is already a prepared powder because that state is part of its name and description.
- Scalefruit Rind can be separated from the fruit during collection and is not treated as a heavily processed product.
- Hakuma Sapwood requires deliberate separation from the bark and heartwood and is treated as a prepared ingredient.

Optional uses or later preparation do not change the identity of the listed ingredient.

## Ingredient fields

### `rarity`

The published rarity tier: `common`, `uncommon`, or `rare`.

Rare ingredients require exceptional acquisition, such as a multipart quest, and are excluded from ordinary Foraging Aid results.

### `forageable`

A boolean rules filter:

- `true` — the ingredient may appear in ordinary Foraging Aid results.
- `false` — the ingredient is excluded regardless of Region, Search Area, or check result.

This field does not measure naturalness, refinement, visibility, or abundance. A manufactured object can be forageable when it is a plausible finding in the selected environment.

All Rare ingredients are `false`. Non-Rare ingredients are also excluded when they are not sensible discrete results of a foraging activity, such as a prepared serving or an environmental medium.

Squid Ink and Poison are `true`. They are treated as recognized brewing-ingredient categories that can plausibly be found as usable products in suitable environments. A forager identifies that the substance fulfills the potion ingredient requirement; the name does not necessarily imply an assassin's weapon or freshly harvested animal secretion.

### `refinement`

Refinement measures how many phases of sapient intervention separate raw natural material from the ingredient in its listed form. It does not measure rarity, monetary value, or difficulty of acquisition.

| Score | Category | Definition |
|---:|---|---|
| 1 | Wild | Exists in nature with essentially no meaningful sapient intervention and is gathered as nature produces it. |
| 2 | Cultivated | Remains essentially natural, but its availability results from cultivation, husbandry, stewardship, or environmental management. Simple field collection can also fall here when it only isolates an immediately accessible part, such as peeling a fruit for its rind. |
| 3 | Prepared | Requires direct extraction, separation, preservation, drying, grinding, or another simple transformation beyond ordinary collection. |
| 4 | Crafted | Requires multiple deliberate preparation stages or substantial skilled refinement. |
| 5 | Manufactured | Results from complex manufacture involving multiple operations, specialized techniques, multiple materials, precision production, or comparable magical complexity. |

Examples:

- Apper Carrot — 1: grows wild and is harvested directly.
- Chicken Egg — 2: a natural product made readily available through husbandry.
- Scalefruit Rind — 2: peeled from the fruit during collection.
- Bashu Powder — 3: seed pods are prepared and ground into powder.
- Hakuma Sapwood — 3: the sapwood is deliberately separated from other layers of the tree.
- Squid Ink — 3: the ink is extracted and placed in a usable container.
- Poison — 4: toxic material is prepared or concentrated and packaged as a usable brewing ingredient.
- Spark Plug — 5: a precision component produced from multiple processed materials.

### `regions`

The Regions where the ingredient is native or ordinarily available. Degree of Success can broaden eligible results from the selected Region to nearby and then distant Regions according to `foraging_config.json`.

### `associated_search_areas`

The ecological or cultural environments where the listed ingredient would reasonably occur, be used, traded, stored, lost, or accumulate.

These associations describe the ingredient itself, not only the habitat of its source material. Bashu Powder therefore belongs in settlements and markets rather than only near bashu trees. A bottle cap in a town is as environmentally ordinary as seaweed on a coast.

Squid Ink is associated with marine environments and inhabited places in the Shallows where a prepared container could be used or traded. Poison includes both naturally sourced toxic materials and usable prepared substances found in settlements, villages, towns, and ruins.

## Search Area civilization

Each Search Area has a `civilization` value measuring how strongly sapient activity defines the environment. The value is compared with ingredient refinement using a smooth compatibility taper.

| Search Area | Civilization |
|---|---:|
| Rocky Terrain | 1.0 |
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
| Sacred Site | 3.2 |
| Village | 3.5 |
| Mine | 3.8 |
| Subway | 3.8 |
| Town | 4.3 |
| Market | 4.7 |
| City Streets | 5.0 |

A higher civilization value makes highly refined ingredients more plausible. It does not make natural ingredients impossible: plants, animals, and minerals can still occur in inhabited environments when their Search Area associations support them.

## Search Areas

Natural environments:

Cave, Rocky Terrain, Coast, Coral Reef, Forest, Geothermal, Grassland, Lake, Open Water, River, Underwater, Wetland.

Cultural environments:

City Streets, Market, Mine, Ruins, Settlement, Sacred Site, Subway, Town, Village.

Mountain terrain is represented by specific environments such as Rocky Terrain, Cave, Grassland, Geothermal, and Mine. Marshes and swamps are represented by Wetland. Yatamon's inhabited waterfront is represented by River.

Related Search Areas contribute only when the related area exists in the selected Region.

## Selection sequence

1. Exclude ingredients with `forageable: false`.
2. Apply the check tier's rarity and geographic eligibility.
3. Determine whether each ingredient is native, nearby, or distant.
4. Evaluate direct and related Search Area compatibility, limited to Search Areas present in the selected Region.
5. Compare ingredient refinement with Search Area civilization.
6. Apply rarity, geography, Search Area, refinement, check, and Degree-of-Success weights.
7. Select the number of findings determined by Degree of Success.

Rarity remains the primary source of scarcity. Degree of Success mainly increases the size of the haul and the geographic breadth of eligible ingredients.

## Region Search Areas

- **The Brackwater Wetlands:** Cave, Coast, Forest, Lake, River, Ruins, Settlement, Village, Wetland
- **The Coastal Highlands:** Cave, Rocky Terrain, Coast, Forest, Grassland, Lake, River, Ruins, Settlement, Town, Village, Wetland
- **The Gale Fields:** Forest, Grassland, Lake, River, Ruins, Settlement, Town, Village
- **The Gift of Shuritashi:** Cave, Coast, Forest, Grassland, Lake, River, Ruins, Settlement, Town, Village, Wetland
- **The Land of Hot Water:** Cave, Rocky Terrain, Coast, Forest, Geothermal, Grassland, River, Ruins, Settlement, Town, Underwater, Village
- **Mount Arbora:** Cave, Rocky Terrain, Forest, Geothermal, Grassland, Mine, River, Ruins, Settlement, Town, Village
- **The Shallows:** Cave, Coast, Coral Reef, Open Water, Ruins, Settlement, Underwater, Village
- **Yatamon:** City Streets, Market, River, Ruins, Sacred Site, Subway
