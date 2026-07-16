let foragingInventory = Obojima.loadStoredInventory();
let foragingConfig = null;
let foragingAffinity = {};
const foragingJsonCache = {};

async function loadForagingJson(path) {
    if (!foragingJsonCache[path]) {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
        foragingJsonCache[path] = await response.json();
    }
    return foragingJsonCache[path];
}

document.addEventListener("DOMContentLoaded", async () => {
    updateForagingValuesToggleButton();
    Obojima.updateInventoryProfileDisplay();
    Obojima.updateSaveInventoryButtons(foragingInventory);

    try {
        await loadForagingData();
        populateForagingRegionOptions();
        populateSearchAreaOptions();
    } catch (error) {
        console.error(error);
        document.getElementById("foraging-results").innerHTML = `<p class="completer-empty">Foraging data could not be loaded.</p>`;
    }
});

async function loadForagingData() {
    foragingConfig = await loadForagingJson("data/foraging_config.json");
    foragingAffinity = await loadForagingJson("data/foraging_affinity.json");
}

function toggleForagingValuesYear() {
    Obojima.toggleValuesYear();
    updateForagingValuesToggleButton();
    Obojima.updateSaveInventoryButtons(foragingInventory);
}

function setValuesYearChoice(year) {
    Obojima.setValuesYear(year);
    updateForagingValuesToggleButton();
    Obojima.updateSaveInventoryButtons(foragingInventory);
}

function updateForagingValuesToggleButton() {
    const currentYear = Obojima.getValuesYear();
    document.querySelectorAll(".value-choice").forEach(choice => {
        const isActive = choice.dataset.year === currentYear;
        choice.classList.toggle("active", isActive);
        choice.setAttribute("aria-current", isActive ? "true" : "false");
    });
}

function populateForagingRegionOptions() {
    const regionSelect = document.getElementById("foraging-region");
    regionSelect.innerHTML = "";

    Obojima.REGION_LIST.forEach(region => {
        const option = document.createElement("option");
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    });

    regionSelect.addEventListener("change", populateSearchAreaOptions);
}

function populateSearchAreaOptions() {
    const selectedRegion = document.getElementById("foraging-region").value || Obojima.REGION_LIST[0];
    const areaSelect = document.getElementById("foraging-search-area");
    const regionAreas = (foragingConfig.regionSearchAreas || {})[selectedRegion];
    const areas = regionAreas || (selectedRegion === "Yatamon"
        ? (foragingConfig.yatamonSearchAreas || [])
        : (foragingConfig.searchAreas || []));

    areaSelect.innerHTML = "";

    areas.slice().sort((a, b) => a.localeCompare(b)).forEach(area => {
        const option = document.createElement("option");
        option.value = area;
        option.textContent = area;
        areaSelect.appendChild(option);
    });
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function getDcTier(dc) {
    if (dc <= 15) return "15";
    if (dc <= 20) return "20";
    return "25";
}

function getSuccessTierKey(degreeOfSuccess) {
    if (degreeOfSuccess >= 10) return "exceptional";
    if (degreeOfSuccess >= 5) return "strong";
    return "modest";
}

function getSuccessTierLabel(degreeOfSuccess) {
    if (degreeOfSuccess >= 10) return "Exceptional success";
    if (degreeOfSuccess >= 5) return "Strong success";
    return "Modest success";
}

function weightedChoice(candidates) {
    const total = candidates.reduce((sum, item) => sum + item.weight, 0);
    if (total <= 0) return null;

    let roll = Math.random() * total;
    for (const item of candidates) {
        roll -= item.weight;
        if (roll <= 0) return item;
    }

    return candidates[candidates.length - 1] || null;
}

function chooseWeightedCount(degreeOfSuccess) {
    const ladder = foragingConfig.findCountByDos || [];
    const match = ladder.find(entry => degreeOfSuccess >= entry.min && degreeOfSuccess <= entry.max);
    const options = match ? match.counts : [{ count: 1, weight: 1 }];
    return weightedChoice(options).count;
}

function getIngredientHabitats(ingredientName) {
    const entries = foragingAffinity[ingredientName] || [];
    return Array.from(new Set(
        entries
            .map(entry => entry.searchArea)
            .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
}

function getYatamonRelatedSearchAreas(searchArea) {
    const areaRule = (foragingConfig.yatamonAreaWeights || {})[searchArea] || {};
    return areaRule.relatedSearchAreas || [];
}

function getRelatedSearchAreas(searchArea, selectedRegion) {
    if (selectedRegion === "Yatamon") return getYatamonRelatedSearchAreas(searchArea);
    return (foragingConfig.relatedSearchAreas || {})[searchArea] || [];
}

function getHabitatRelationship(ingredientName, searchArea, selectedRegion) {
    const habitats = getIngredientHabitats(ingredientName);

    if (habitats.includes(searchArea)) {
        return {
            key: "direct",
            label: `Associated with ${searchArea}`,
            habitats
        };
    }

    const relatedAreas = getRelatedSearchAreas(searchArea, selectedRegion);
    const relatedMatch = relatedAreas.find(area => habitats.includes(area));

    if (relatedMatch) {
        return {
            key: "related",
            label: `Usually associated with ${relatedMatch}, which is related to ${searchArea}`,
            habitats
        };
    }

    return {
        key: "none",
        label: habitats.length
            ? `Usually associated with ${habitats.join(", ")}`
            : "No listed search-area association",
        habitats
    };
}

function getRegionRelationship(ingredient, selectedRegion) {
    if (selectedRegion === "Yatamon") {
        const tier = getYatamonTradeTier(ingredient);
        if (tier === "local") return { key: "local", label: "Local trade source" };
        if (tier === "nearby") return { key: "nearby", label: "Nearby trade source" };
        if (tier === "distant") return { key: "distant", label: "Distant trade source" };
        return { key: "unknown", label: "Unclear trade source" };
    }

    const regions = ingredient.regions || [];

    if (regions.includes(selectedRegion)) {
        return { key: "native", label: "Native to this region" };
    }

    const nearbyRegions = Obojima.REGION_ADJACENCIES[selectedRegion] || [];
    if (regions.some(region => nearbyRegions.includes(region))) {
        return { key: "nearby", label: "Native to a nearby region" };
    }

    return { key: "far", label: "Native to a farther region" };
}

function getYatamonTradeTier(ingredient) {
    const regions = ingredient.regions || [];
    const tiers = foragingConfig.yatamonTradeTiers || {};

    if (regions.some(region => (tiers.local || []).includes(region))) return "local";
    if (regions.some(region => (tiers.nearby || []).includes(region))) return "nearby";
    if (regions.some(region => (tiers.distant || []).includes(region))) return "distant";
    return "unknown";
}

function getYatamonTradeWeight(ingredient, searchArea) {
    const tier = getYatamonTradeTier(ingredient);
    const tradeWeights = foragingConfig.yatamonTradeWeights || {};
    const areaWeights = (foragingConfig.yatamonAreaWeights || {})[searchArea] || {};
    const baseTradeWeight = Number(tradeWeights[tier]) || Number(tradeWeights.unknown) || 0.25;
    const areaTierWeight = Number(areaWeights[tier]);
    let weight = Number.isFinite(areaTierWeight) ? areaTierWeight : baseTradeWeight;

    const boostRegions = areaWeights.boostRegions || {};
    (ingredient.regions || []).forEach(region => {
        if (Number(boostRegions[region])) weight *= Number(boostRegions[region]);
    });

    return weight;
}

function getRegionWeight(ingredient, selectedRegion, searchArea) {
    if (selectedRegion === "Yatamon") return getYatamonTradeWeight(ingredient, searchArea);

    const relationship = getRegionRelationship(ingredient, selectedRegion);
    const weights = foragingConfig.regionWeights || {};
    return Number(weights[relationship.key]) || 0.1;
}

function getRarityWeight(ingredient) {
    const rarity = Obojima.normalizeRarity(ingredient.rarity);
    return Number((foragingConfig.rarityWeights || {})[rarity]) || 0;
}

function getHabitatWeight(ingredientName, searchArea, selectedRegion) {
    const relationship = getHabitatRelationship(ingredientName, searchArea, selectedRegion);
    const weights = foragingConfig.habitatWeights || {};
    return Number(weights[relationship.key]) || 0;
}

function getDcModifier(ingredient, selectedRegion, dc) {
    const tier = getDcTier(dc);
    const rule = (foragingConfig.dcModifiers || {})[tier] || {};
    const rarity = Obojima.normalizeRarity(ingredient.rarity);
    const regionRelationship = getRegionRelationship(ingredient, selectedRegion);

    let regionKey = regionRelationship.key;
    if (selectedRegion === "Yatamon") {
        if (regionKey === "local") regionKey = "native";
        if (regionKey === "distant" || regionKey === "unknown") regionKey = "far";
    }

    const rarityModifier = Number(rule[rarity]) || 0;
    const regionModifier = Number(rule[regionKey]) || 0.1;
    return rarityModifier * regionModifier;
}

function getDosModifier(ingredient, selectedRegion, searchArea, degreeOfSuccess) {
    const tier = getSuccessTierKey(degreeOfSuccess);
    const rule = (foragingConfig.dosModifiers || {})[tier] || {};
    const rarity = Obojima.normalizeRarity(ingredient.rarity);
    const regionRelationship = getRegionRelationship(ingredient, selectedRegion);
    const habitatRelationship = getHabitatRelationship(ingredient.name, searchArea, selectedRegion);

    let modifier = 1;

    if (rarity === "uncommon") modifier *= Number(rule.uncommon) || 1;

    if (selectedRegion === "Yatamon") {
        if (regionRelationship.key === "nearby") modifier *= Number(rule.nearby) || 1;
        if (regionRelationship.key === "distant" || regionRelationship.key === "unknown") modifier *= Number(rule.far) || 1;
    } else {
        if (regionRelationship.key === "nearby") modifier *= Number(rule.nearby) || 1;
        if (regionRelationship.key === "far") modifier *= Number(rule.far) || 1;
    }

    if (habitatRelationship.key === "none") modifier *= Number(rule.nonHabitat) || 1;

    return modifier;
}

function getIngredientOrigin(ingredient) {
    const overrides = foragingConfig.ingredientOriginOverrides || {};
    if (overrides[ingredient.name]) return overrides[ingredient.name];

    const name = ingredient.name.toLowerCase();

    if (/(paste|powder|paper|glass|wax|oil|tea|wine|spice|rice|ink|dye|cloth|thread|rope|candle|lantern|bread|flour|sugar|salt)/.test(name)) {
        return "human";
    }

    return "natural";
}

function getOriginRelationship(ingredient, searchArea) {
    const origin = getIngredientOrigin(ingredient);
    const profile = (foragingConfig.searchAreaProfiles || {})[searchArea] || { natural: 0.7, human: 0.3 };
    const originWeights = (foragingConfig.originWeights || {})[origin] || { natural: 1, human: 0.2 };

    const naturalContribution = Number(profile.natural || 0) * Number(originWeights.natural || 0);
    const humanContribution = Number(profile.human || 0) * Number(originWeights.human || 0);
    const weight = Math.max(0.05, naturalContribution + humanContribution);

    let label;
    if (origin === "human") {
        if ((profile.human || 0) >= 0.8) label = "Human activity makes this kind of usable material likely here";
        else if ((profile.human || 0) >= 0.4) label = "Human activity makes this kind of usable material plausible here";
        else label = "Human activity is limited here, so this is a less expected find";
    } else if (origin === "mixed") {
        label = "This can come from both natural conditions and human activity";
    } else {
        if ((profile.natural || 0) >= 0.8) label = "Natural conditions make this kind of ingredient likely here";
        else if ((profile.natural || 0) >= 0.4) label = "Natural conditions make this kind of ingredient plausible here";
        else label = "Natural growth is limited here, so this is a less expected find";
    }

    return { origin, weight, label, profile };
}

function getOriginLabel(origin) {
    if (origin === "human") return "Human-made or processed material";
    if (origin === "mixed") return "Mixed natural/human material";
    return "Natural ingredient";
}

function scoreIngredient(ingredient, selectedRegion, searchArea, dc, degreeOfSuccess) {
    const rarity = Obojima.normalizeRarity(ingredient.rarity);
    const excludedRarity = new Set(foragingConfig.excludeRarity || []);
    const excludedIngredients = new Set(foragingConfig.excludeIngredients || []);

    if (excludedIngredients.has(ingredient.name)) return null;
    if (excludedRarity.has(rarity)) return null;

    const rarityWeight = getRarityWeight(ingredient);
    if (rarityWeight <= 0) return null;

    const regionWeight = getRegionWeight(ingredient, selectedRegion, searchArea);
    const habitatWeight = getHabitatWeight(ingredient.name, searchArea, selectedRegion);
    const originRelationship = getOriginRelationship(ingredient, searchArea);
    const dcModifier = getDcModifier(ingredient, selectedRegion, dc);
    const dosModifier = getDosModifier(ingredient, selectedRegion, searchArea, degreeOfSuccess);

    const score = rarityWeight * regionWeight * habitatWeight * originRelationship.weight * dcModifier * dosModifier;

    if (!Number.isFinite(score) || score <= 0) return null;

    return {
        name: ingredient.name,
        ingredient,
        rarity,
        weight: score,
        regionRelationship: getRegionRelationship(ingredient, selectedRegion),
        habitatRelationship: getHabitatRelationship(ingredient.name, searchArea, selectedRegion),
        originRelationship
    };
}

function getHabitatTarget(findCount) {
    const targets = foragingConfig.habitatTargetByCount || {};
    return Number(targets[String(findCount)]) || Math.max(1, findCount - 1);
}

function selectForagingResults(candidates, targetFindCount, searchArea, selectedRegion, prioritizeNew) {
    const selected = [];
    const used = new Set();
    const inventorySet = new Set(foragingInventory);
    const habitatTarget = getHabitatTarget(targetFindCount);

    function availablePool(requireHabitatMatch = false) {
        let pool = candidates.filter(candidate => !used.has(candidate.name));
        if (requireHabitatMatch) {
            pool = pool.filter(candidate => candidate.habitatRelationship.key !== "none");
        }

        if (prioritizeNew) {
            const newFinds = pool.filter(candidate => !inventorySet.has(candidate.name));
            if (newFinds.length > 0) pool = newFinds;
        }

        return pool;
    }

    while (selected.length < targetFindCount) {
        const habitatMatches = selected.filter(item => item.habitatRelationship.key !== "none").length;
        const needHabitatMatch = habitatMatches < habitatTarget;
        let pool = availablePool(needHabitatMatch);

        if (pool.length === 0 && needHabitatMatch) pool = availablePool(false);
        if (pool.length === 0) break;

        const pick = weightedChoice(pool);
        if (!pick) break;

        selected.push(pick);
        used.add(pick.name);
    }

    return selected;
}

function getDcEffectLines(dc, selectedRegion) {
    if (selectedRegion === "Yatamon") {
        if (dc <= 15) {
            return [
                "Common ingredients were favored.",
                "Local and nearby trade sources were favored."
            ];
        }
        if (dc <= 20) {
            return [
                "Uncommon ingredients became more competitive.",
                "Nearby trade sources became more competitive."
            ];
        }
        return [
            "Uncommon ingredients became more competitive.",
            "Distant trade sources became more competitive."
        ];
    }

    if (dc <= 15) {
        return [
            "Common ingredients were favored.",
            "Native ingredients were favored."
        ];
    }
    if (dc <= 20) {
        return [
            "Uncommon ingredients became more competitive.",
            "Nearby-region ingredients became more competitive."
        ];
    }
    return [
        "Uncommon ingredients became more competitive.",
        "Nearby and farther-region ingredients became more competitive."
    ];
}

function getDosEffectLines(degreeOfSuccess, generatedCount) {
    const tier = getSuccessTierLabel(degreeOfSuccess);

    if (degreeOfSuccess >= 10) {
        return [
            `${tier}: generated ${generatedCount} ingredients.`,
            "Less obvious ingredients had a better chance to appear."
        ];
    }
    if (degreeOfSuccess >= 5) {
        return [
            `${tier}: generated ${generatedCount} ingredients.`,
            "Less obvious ingredients had a moderate chance to appear."
        ];
    }
    return [
        `${tier}: generated ${generatedCount} ingredient${generatedCount === 1 ? "" : "s"}.`,
        "Common and expected ingredients were favored."
    ];
}

function describeOpportunityLevel(value) {
    if (value >= 0.8) return "high";
    if (value >= 0.4) return "moderate";
    return "low";
}

function getSearchAreaEffectLines(selected, searchArea) {
    const associatedCount = selected.filter(item => item.habitatRelationship.key !== "none").length;
    const profile = (foragingConfig.searchAreaProfiles || {})[searchArea] || { natural: 0.7, human: 0.3 };
    return [
        `${associatedCount} of ${selected.length} generated ingredient${selected.length === 1 ? " was" : "s were"} associated with ${searchArea}.`,
        `${searchArea} has ${describeOpportunityLevel(profile.natural)} natural opportunity and ${describeOpportunityLevel(profile.human)} human activity.`,
        "Search Area is the strongest influence on the generated haul."
    ];
}

function getRaritySummaryLine(selected) {
    const commonCount = selected.filter(item => item.rarity === "common").length;
    const uncommonCount = selected.filter(item => item.rarity === "uncommon").length;
    return `${commonCount} Common${uncommonCount ? `, ${uncommonCount} Uncommon` : ""}`;
}

function renderPlainDebug({
    selectedRegion,
    searchArea,
    dc,
    rollTotal,
    degreeOfSuccess,
    selected
}) {
    const dcLines = getDcEffectLines(dc, selectedRegion);
    const dosLines = getDosEffectLines(degreeOfSuccess, selected.length);
    const areaLines = getSearchAreaEffectLines(selected, searchArea);

    const ingredientLines = selected.map(item => {
        const regionLine = item.regionRelationship.label;
        const habitatLine = item.habitatRelationship.label;
        const originLine = item.originRelationship ? item.originRelationship.label : "";
        const originTypeLine = item.originRelationship ? getOriginLabel(item.originRelationship.origin) : "";
        const rarityLine = item.rarity === "common" ? "Common ingredient" : "Uncommon ingredient";

        return [
            item.name,
            `- ${regionLine}`,
            `- ${habitatLine}`,
            originTypeLine ? `- ${originTypeLine}` : "",
            originLine ? `- ${originLine}` : "",
            `- ${rarityLine}`
        ].filter(Boolean).join("\n");
    }).join("\n\n");

    const debugText = [
        "GENERATION DETAILS",
        "",
        "RESULT",
        `Region: ${selectedRegion}`,
        `Search Area: ${searchArea}`,
        `DC: ${dc}`,
        `Roll: ${rollTotal}`,
        `Degree of Success: +${degreeOfSuccess}`,
        `Rarity Mix: ${getRaritySummaryLine(selected)}`,
        "",
        "HOW DC AFFECTED THIS RESULT",
        ...dcLines.map(line => `- ${line}`),
        "",
        "HOW DEGREE OF SUCCESS AFFECTED THIS RESULT",
        ...dosLines.map(line => `- ${line}`),
        "",
        "HOW SEARCH AREA AFFECTED THIS RESULT",
        ...areaLines.map(line => `- ${line}`),
        "",
        "WHY THESE INGREDIENTS APPEARED",
        ingredientLines
    ].join("\n");

    return `<details class="foraging-debug foraging-debug-plain" open>
        <summary>Generation Details</summary>
        <pre>${escapeHtml(debugText)}</pre>
    </details>`;
}

async function generateForagingFinds() {
    const selectedRegion = document.getElementById("foraging-region").value;
    const searchArea = document.getElementById("foraging-search-area").value;
    const dc = Number(document.getElementById("foraging-dc").value);
    const rollTotal = Number(document.getElementById("foraging-roll").value);
    const prioritizeNew = document.getElementById("foraging-prioritize-new").checked;
    const showDebug = document.getElementById("foraging-debug").checked;
    const resultsDiv = document.getElementById("foraging-results");

    if (!dc || !rollTotal) {
        alert("Please enter both the DC and the roll total.");
        return;
    }

    const degreeOfSuccess = rollTotal - dc;
    resultsDiv.innerHTML = "";

    if (degreeOfSuccess < 0) {
        resultsDiv.innerHTML = `<div class="completion-card foraging-result-card"><h3>After an hour of foraging...</h3><p>The party does not return with any potion ingredients.</p></div>`;
        resultsDiv.scrollIntoView({ behavior: "smooth" });
        return;
    }

    const ingredients = await Obojima.loadIngredientData(Obojima.getValuesYear());
    const targetFindCount = Math.min(foragingConfig.maxResults || 5, chooseWeightedCount(degreeOfSuccess));

    const candidates = ingredients
        .map(ingredient => scoreIngredient(ingredient, selectedRegion, searchArea, dc, degreeOfSuccess))
        .filter(Boolean);

    const selected = selectForagingResults(candidates, targetFindCount, searchArea, selectedRegion, prioritizeNew);

    if (selected.length === 0) {
        resultsDiv.innerHTML = `<div class="completion-card foraging-result-card"><h3>After an hour of foraging...</h3><p>The party does not return with any potion ingredients.</p></div>`;
        resultsDiv.scrollIntoView({ behavior: "smooth" });
        return;
    }

    const list = selected.map(item => {
        const rarityClass = item.rarity.toLowerCase();
        return `<li class="ingredient ${rarityClass}">${Obojima.formatIngredientName(item.ingredient)}</li>`;
    }).join("");

    let debug = "";
    if (showDebug) {
        debug = renderPlainDebug({
            selectedRegion,
            searchArea,
            dc,
            rollTotal,
            degreeOfSuccess,
            selected
        });
    }

    resultsDiv.innerHTML = `<div class="completion-card foraging-result-card">
        <h3>After an hour of foraging...</h3>
        <p>The party returns with:</p>
        <ul class="completion-recipe-list">${list}</ul>
        <div class="button-group foraging-result-actions">
            <button type="button" onclick="addForagingResultsToInventory()">Add to Inventory</button>
            <button type="button" onclick="generateForagingFinds()">Generate Again</button>
        </div>
    </div>${debug}`;

    window.latestForagingResults = selected.map(item => item.name);
    resultsDiv.scrollIntoView({ behavior: "smooth" });
}

function addForagingResultsToInventory() {
    const latest = Array.isArray(window.latestForagingResults) ? window.latestForagingResults : [];
    if (latest.length === 0) return;

    foragingInventory = Obojima.normalizeInventoryList(foragingInventory.concat(latest));
    Obojima.saveStoredInventory(foragingInventory);
    Obojima.updateSaveInventoryButtons(foragingInventory);

    const button = document.querySelector(".foraging-result-actions button");
    if (button) button.textContent = "Added to Inventory";
}

async function clearForagingInventory() {
    const result = await Obojima.showClearInventoryDialog();
    if (result.action === "cancel") return;
    if (result.action === "save") {
        await Obojima.exportInventory(foragingInventory);
        return;
    }

    foragingInventory = [];
    Obojima.saveStoredInventory(foragingInventory);
    Obojima.clearInventoryProfile();
    Obojima.updateInventoryProfileDisplay();
    Obojima.updateSaveInventoryButtons(foragingInventory);
}

async function exportInventory() {
    await Obojima.exportInventory(foragingInventory);
}

function importInventory() {
    Obojima.importInventoryFile(imported => {
        foragingInventory = imported.ingredients;
        Obojima.saveStoredInventory(foragingInventory);
        updateForagingValuesToggleButton();
    });
}

function viewInventory() {
    Obojima.openInventoryView(
        () => foragingInventory,
        items => {
            foragingInventory = Obojima.normalizeInventoryList(items);
            Obojima.saveStoredInventory(foragingInventory);
            if (typeof Obojima.applyInventoryToButtons === "function") {
                Obojima.applyInventoryToButtons(foragingInventory);
            }
        },
        () => {
            Obojima.updateSaveInventoryButtons(foragingInventory);
        }
    );
}
