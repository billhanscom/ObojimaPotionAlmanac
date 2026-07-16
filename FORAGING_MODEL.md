# Foraging Aid Model

## What the Foraging Aid Does

The Foraging Aid helps a DM resolve a foraging attempt in Obojima.

The user-facing site asks for:

- Region
- Search Area
- DC
- Roll Total

The engine uses those choices to generate potion ingredients that feel believable for that search.

The Foraging Aid does not try to model every plant, object, creature, or scrap in the world. It models the useful potion ingredients that a character successfully recognizes and collects from a much larger ecological and social environment.

## Core Idea

The engine follows three story inputs:

1. The player chooses where to search.
2. The DM sets the difficulty of the search.
3. The character's roll determines how successful the search was.

The engine then produces a foraging result that reflects those inputs.

# Data Construction

The JSON files describe the world. The engine interprets that world.

The data should avoid weights, formulas, and math whenever possible. Those belong in the engine configuration. Ingredient, Region, and Search Area data should describe what is true in the setting.

## Ingredient Entry

An ingredient entry describes the ingredient itself.

```json
{
  "name": "Raka Paste",
  "rarity": "Common",
  "forageable": true,
  "regions": [
    "Gift of Shuritashi"
  ],
  "associated_search_areas": [
    "Settlement",
    "Village",
    "Town"
  ],
  "civilization": 5
}
```

### Ingredient fields

**name**  
The ingredient name.

**rarity**  
The rarity from the game data. The Foraging Aid currently uses Common and Uncommon ingredients. Rare ingredients are excluded unless the model is changed later.

**forageable**  
Whether this ingredient can appear as a free foraging result.

Use `"forageable": true` for ingredients that can reasonably be found, gathered, salvaged, or collected during a foraging attempt.

Use `"forageable": false` for ingredients that should not appear in Foraging Aid results.

Example:

```json
{
  "name": "Sea Water",
  "rarity": "Common",
  "forageable": false,
  "regions": [
    "The Shallows"
  ],
  "associated_search_areas": [
    "Coast",
    "Open Water"
  ],
  "civilization": 1
}
```

**regions**  
The Regions where the ingredient is naturally or normally associated.

The engine uses this to decide whether the ingredient is native, nearby, or far from the selected Region.

**associated_search_areas**  
The Search Areas most strongly associated with finding this ingredient.

This does not mean the ingredient can only appear there. It means those are the places where the engine should treat it as a strong fit.

**civilization**  
A 1-5 scale describing how strongly the ingredient is associated with civilization, processing, trade, craft, or sapient activity.

- 1 = almost entirely associated with the natural world
- 2 = mostly natural, but often encountered around civilization
- 3 = equally associated with nature and civilization
- 4 = mostly associated with civilization
- 5 = strongly associated with civilization, processing, or manufacture

Examples:

```json
{
  "name": "Forest Mint",
  "rarity": "Common",
  "forageable": true,
  "regions": [
    "Gift of Shuritashi",
    "Mount Arbora"
  ],
  "associated_search_areas": [
    "Forest"
  ],
  "civilization": 1
}
```

```json
{
  "name": "Spider Silk",
  "rarity": "Common",
  "forageable": true,
  "regions": [
    "Gift of Shuritashi",
    "Coastal Highlands",
    "Mount Arbora"
  ],
  "associated_search_areas": [
    "Forest",
    "Cave",
    "Ruins",
    "Settlement"
  ],
  "civilization": 2
}
```

## Region Entry

A Region entry describes the geography and available Search Areas for a Region.

```json
{
  "name": "Gift of Shuritashi",
  "adjacent_regions": [
    "Coastal Highlands",
    "Gale Fields",
    "Land of Hot Water",
    "Mount Arbora",
    "The Shallows"
  ],
  "search_areas": [
    "Cave",
    "Coast",
    "Forest",
    "Grassland",
    "Lake",
    "River",
    "Ruins",
    "Settlement",
    "Town",
    "Village",
    "Wetland"
  ]
}
```

### Region fields

**name**  
The Region name.

**adjacent_regions**  
Regions considered nearby for foraging purposes.

**search_areas**  
The Search Areas available in that Region.

These should be broad environments that meaningfully change the foraging results. They are not meant to list every named location in the book.

Example for The Shallows:

```json
{
  "name": "The Shallows",
  "adjacent_regions": [
    "Gift of Shuritashi",
    "Coastal Highlands",
    "Land of Hot Water",
    "Brackwater Wetlands"
  ],
  "search_areas": [
    "Cave",
    "Coast",
    "Coral Reef",
    "Open Water",
    "Ruins",
    "Settlement",
    "Village"
  ]
}
```

Example for Yatamon:

```json
{
  "name": "Yatamon",
  "trade_regions": {
    "local": [
      "Gift of Shuritashi"
    ],
    "nearby": [
      "Brackwater Wetlands",
      "Coastal Highlands",
      "Gale Fields",
      "The Shallows"
    ],
    "distant": [
      "Land of Hot Water",
      "Mount Arbora"
    ]
  },
  "search_areas": [
    "City Streets",
    "Market",
    "Ruins",
    "Shrine",
    "Subway",
    "Waterfront"
  ]
}
```

Yatamon uses trade logic rather than ordinary regional ecology.

## Search Area Entry

A Search Area entry describes the type of place being searched.

```json
{
  "name": "River",
  "civilization": 2,
  "related_search_areas": [
    "Wetland",
    "Lake",
    "Forest",
    "Settlement"
  ]
}
```

### Search Area fields

**name**  
The Search Area name.

**civilization**  
A 1-5 scale describing the average level of civil activity in that kind of place.

This includes travel, gathering, fishing, trade, extraction, ritual use, crafting, and other sapient activity.

- 1 = very little civil activity
- 2 = some civil activity
- 3 = moderate civil activity
- 4 = high civil activity
- 5 = very high civil activity

**related_search_areas**  
Search Areas close enough in meaning that an ingredient associated with one might still plausibly appear in the other.

Example: River is related to Wetland and Lake. Forest is related to Grassland and River.

# Engine Rules

## Step 1: Read the user selections

The user provides Region, Search Area, DC, and Roll Total.

The engine calculates:

```text
Degree of Success = Roll Total - DC
```

If the result is below 0, the search fails and no ingredients are generated.

## Step 2: Remove anything that cannot be foraged

The engine skips any ingredient where `"forageable": false`.

The engine also skips Rare ingredients for now.

## Step 3: Determine regional fit

For ordinary Regions, each ingredient is labeled as:

- Native: found in the selected Region
- Nearby: found in an adjacent Region
- Far: found elsewhere

For Yatamon, the engine uses trade logic instead:

- Local trade source
- Nearby trade source
- Distant trade source

## Step 4: Determine Search Area fit

The engine checks the ingredient's `associated_search_areas`.

It labels the fit as:

- Direct fit: associated with the selected Search Area
- Related fit: associated with a related Search Area
- Poor fit: no direct or related association

Search Area fit is the strongest influence on the result.

## Step 5: Determine civilization fit

The engine compares:

- the ingredient's `civilization` value
- the Search Area's `civilization` value

Both use a 1-5 scale. The closer the values are, the stronger the fit.

Example:

```text
Forest Mint civilization: 1
Forest civilization: 1
Result: strong fit
```

```text
Raka Paste civilization: 5
Forest civilization: 1
Result: poor fit
```

```text
Raka Paste civilization: 5
Town civilization: 4
Result: strong fit
```

## Step 6: Apply rarity

Common ingredients are more likely than Uncommon ingredients.

Baseline:

```text
Common : Uncommon = 5 : 1
```

Rare ingredients are currently excluded.

## Step 7: Apply DC

DC affects what kinds of ingredients are more likely within the selected environment.

- DC 15 favors common, expected, local results.
- DC 20 increases the chance of less commonly encountered ingredients.
- DC 25 increases that chance further.

DC does not override the Search Area. A high-DC River search should still feel like a River search.

## Step 8: Apply Degree of Success

Degree of Success affects:

- how many ingredients are found
- how likely the character is to identify less commonly encountered ingredients

Current haul size guidance:

- DoS 0-4: 1-2 ingredients
- DoS 5-9: 2-3 ingredients
- DoS 10+: 3-5 ingredients

## Step 9: Build the weighted pool

Each ingredient receives a score based on:

```text
regional fit
x search-area fit
x civilization fit
x rarity
x DC effect
x DoS effect
```

A higher score means the ingredient is more likely to appear.

Think of this like adding slips of paper to a bowl. Ingredients with higher scores get more slips. Ingredients with lower scores get fewer slips.

## Step 10: Draw the haul

The engine draws ingredients from the weighted pool.

The goal is:

- mostly expected finds
- some interesting finds
- occasional believable surprises

The Search Area should still strongly shape the result.

## Step 11: Explain the result in Debug Mode

If Debug Mode is enabled, the engine explains the result in plain language.

The debug output should be easy to copy and paste.

It reports:

- Region
- Search Area
- DC
- Roll Total
- Degree of Success
- rarity mix
- how DC affected the result
- how Degree of Success affected the result
- how Search Area affected the result
- why each ingredient appeared
