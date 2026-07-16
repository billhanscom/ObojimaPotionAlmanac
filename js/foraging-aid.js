let foragingInventory = Obojima.loadStoredInventory();
let foragingConfig = null;
let foragingRegions = [];
let foragingSearchAreas = [];
const foragingJsonCache = {};
const OBOJIMA_FORAGING_DEBUG_OPEN_KEY = "obojimaForagingDebugOpen";
const OBOJIMA_FORAGING_RESULTS_KEY = "obojimaForagingLastResultsHtml";
const OBOJIMA_FORAGING_RESULTS_ITEMS_KEY = "obojimaForagingLastResultItems";
const OBOJIMA_FORAGING_PARAMS_KEY = "obojimaForagingSearchParams";

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
        restoreForagingSearchParams();
        setupForagingKeyboardShortcuts();
        bindForagingParamPersistence();
        restoreForagingResults();
    } catch (error) {
        console.error(error);
        document.getElementById("foraging-results").innerHTML = `<p class="completer-empty">Foraging data could not be loaded.</p>`;
    }
});

function isForagingDebugOpen() {
    return localStorage.getItem(OBOJIMA_FORAGING_DEBUG_OPEN_KEY) === "true";
}

function bindForagingDebugDetails() {
    const details = document.querySelector(".foraging-debug-plain");
    if (!details) return;

    details.addEventListener("toggle", () => {
        localStorage.setItem(OBOJIMA_FORAGING_DEBUG_OPEN_KEY, details.open ? "true" : "false");
    });
}

function wasPageReloaded() {
    const navEntry = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    if (navEntry) return navEntry.type === "reload";
    return performance.navigation && performance.navigation.type === performance.navigation.TYPE_RELOAD;
}

function clearStoredForagingResults() {
    sessionStorage.removeItem(OBOJIMA_FORAGING_RESULTS_KEY);
    sessionStorage.removeItem(OBOJIMA_FORAGING_RESULTS_ITEMS_KEY);
}

function saveForagingResults(html, items) {
    sessionStorage.setItem(OBOJIMA_FORAGING_RESULTS_KEY, html);
    sessionStorage.setItem(OBOJIMA_FORAGING_RESULTS_ITEMS_KEY, JSON.stringify(items || []));
}

function saveForagingSearchParams() {
    const params = {
        region: document.getElementById("foraging-region")?.value || "",
        searchArea: document.getElementById("foraging-search-area")?.value || "",
        dc: document.getElementById("foraging-dc")?.value || "",
        roll: document.getElementById("foraging-roll")?.value || "",
        prioritizeNew: Boolean(document.getElementById("foraging-prioritize-new")?.checked)
    };
    sessionStorage.setItem(OBOJIMA_FORAGING_PARAMS_KEY, JSON.stringify(params));
}

function restoreForagingSearchParams() {
    if (wasPageReloaded()) {
        sessionStorage.removeItem(OBOJIMA_FORAGING_PARAMS_KEY);
        return;
    }

    let params = null;
    try {
        params = JSON.parse(sessionStorage.getItem(OBOJIMA_FORAGING_PARAMS_KEY) || "null");
    } catch {
        params = null;
    }
    if (!params) return;

    const regionSelect = document.getElementById("foraging-region");
    const areaSelect = document.getElementById("foraging-search-area");
    const dcInput = document.getElementById("foraging-dc");
    const rollInput = document.getElementById("foraging-roll");
    const prioritizeInput = document.getElementById("foraging-prioritize-new");

    if (regionSelect && params.region) {
        regionSelect.value = params.region;
        populateSearchAreaOptions();
    }

    if (areaSelect && params.searchArea) areaSelect.value = params.searchArea;
    if (dcInput && params.dc !== undefined) dcInput.value = params.dc;
    if (rollInput && params.roll !== undefined) rollInput.value = params.roll;
    if (prioritizeInput) prioritizeInput.checked = Boolean(params.prioritizeNew);
}

function bindForagingParamPersistence() {
    [
        "foraging-region",
        "foraging-search-area",
        "foraging-dc",
        "foraging-roll",
        "foraging-prioritize-new"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("change", saveForagingSearchParams);
        el.addEventListener("input", saveForagingSearchParams);
    });
}

function restoreForagingResults() {
    if (wasPageReloaded()) {
        clearStoredForagingResults();
        return;
    }

    const html = sessionStorage.getItem(OBOJIMA_FORAGING_RESULTS_KEY);
    if (!html) return;

    const resultsDiv = document.getElementById("foraging-results");
    if (!resultsDiv) return;

    resultsDiv.innerHTML = html;

    try {
        window.latestForagingResults = JSON.parse(sessionStorage.getItem(OBOJIMA_FORAGING_RESULTS_ITEMS_KEY) || "[]");
    } catch {
        window.latestForagingResults = [];
    }

    bindForagingDebugDetails();
}

function setupForagingKeyboardShortcuts() {
    const controls = [
        document.getElementById("foraging-region"),
        document.getElementById("foraging-search-area"),
        document.getElementById("foraging-dc"),
        document.getElementById("foraging-roll")
    ].filter(Boolean);

    controls.forEach(control => {
        control.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                generateForagingFinds();
            }
        });
    });
}

async function loadForagingData() {
    foragingConfig = await loadForagingJson("data/foraging_config.json");
    foragingRegions = await loadForagingJson("data/regions.json");
    foragingSearchAreas = await loadForagingJson("data/search_areas.json");
    if (typeof Obojima.loadRegionData === "function") await Obojima.loadRegionData();
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

    const regionNames = foragingRegions.length
        ? foragingRegions.map(region => region.name)
        : Obojima.getRegionList();

    regionNames.forEach(region => {
        const option = document.createElement("option");
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    });

    regionSelect.addEventListener("change", populateSearchAreaOptions);
}

function populateSearchAreaOptions() {
    const selectedRegion = document.getElementById("foraging-region").value || Obojima.getRegionList()[0];
    const areaSelect = document.getElementById("foraging-search-area");
    const region = foragingRegions.find(entry => entry.name === selectedRegion);
    const areas = region ? (region.search_areas || []) : [];

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
    const tiers = foragingConfig.dcTiers || [];
    const match = tiers.find(tier => dc >= tier.min && dc <= tier.max);
    if (match) return match.key;

    if (dc <= 15) return "10-15";
    if (dc <= 20) return "16-20";
    return "21-25";
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

function getIngredientHabitats(ingredient) {
    if (Array.isArray(ingredient.associated_search_areas)) {
        return Array.from(new Set(ingredient.associated_search_areas.filter(Boolean))).sort((a, b) => a.localeCompare(b));
    }

    const ingredientName = typeof ingredient === "string" ? ingredient : ingredient.name;
    const entries = foragingIngredientAssociations[ingredientName] || [];
    return Array.from(new Set(
        entries
            .map(entry => entry.searchArea)
            .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
}

function getRelatedSearchAreas(searchArea, selectedRegion) {
    const area = foragingSearchAreas.find(entry => entry.name === searchArea);
    return area ? (area.related_search_areas || []) : [];
}

function getHabitatRelationship(ingredient, searchArea, selectedRegion) {
    const habitats = getIngredientHabitats(ingredient);

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
    const selectedRegionData = foragingRegions.find(entry => entry.name === selectedRegion);

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

    const nearbyRegions = selectedRegionData ? (selectedRegionData.adjacent_regions || []) : Obojima.getRegionAdjacencies(selectedRegion);
    if (regions.some(region => nearbyRegions.includes(region))) {
        return { key: "nearby", label: "Native to a nearby region" };
    }

    return { key: "far", label: "Native to a farther region" };
}

function getYatamonTradeTier(ingredient) {
    const regions = ingredient.regions || [];
    const yatamon = foragingRegions.find(entry => entry.name === "Yatamon") || {};
    const tiers = yatamon.trade_regions || {};

    if (regions.some(region => (tiers.local || []).includes(region))) return "local";
    if (regions.some(region => (tiers.nearby || []).includes(region))) return "nearby";
    if (regions.some(region => (tiers.distant || []).includes(region))) return "distant";
    return "unknown";
}

function getYatamonTradeWeight(ingredient, searchArea) {
    const tier = getYatamonTradeTier(ingredient);
    const tradeWeights = foragingConfig.yatamonTradeWeights || {
        local: 1,
        nearby: 0.75,
        distant: 0.45,
        unknown: 0.25
    };
    return Number(tradeWeights[tier]) || Number(tradeWeights.unknown) || 0.25;
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

function getHabitatWeight(ingredient, searchArea, selectedRegion) {
    const relationship = getHabitatRelationship(ingredient, searchArea, selectedRegion);
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
    const habitatRelationship = getHabitatRelationship(ingredient, searchArea, selectedRegion);

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

function clampCivilization(value, fallback = 1) {
    const numeric = Number(value);
    const safe = Number.isFinite(numeric) ? numeric : fallback;
    return Math.min(5, Math.max(1, safe));
}

function getSearchAreaCivilization(searchArea) {
    const configured = (foragingConfig.searchAreaCivilization || {})[searchArea];
    if (configured !== undefined) return clampCivilization(configured, 1);

    const profile = (foragingConfig.searchAreaProfiles || {})[searchArea];
    if (profile) {
        // Backward-compatible fallback from the older natural/human profile.
        return clampCivilization(1 + (Number(profile.human || 0) * 4), 1);
    }

    return 1;
}

function getIngredientCivilization(ingredient) {
    return clampCivilization(ingredient.civilization, 1);
}

function getCivilizationRelationship(ingredient, searchArea) {
    const ingredientValue = getIngredientCivilization(ingredient);
    const searchAreaValue = getSearchAreaCivilization(searchArea);
    const difference = Math.abs(ingredientValue - searchAreaValue);
    const roundedDifference = String(Math.min(4, Math.round(difference)));
    const weights = foragingConfig.civilizationDistanceWeights || { "0": 1, "1": 0.8, "2": 0.5, "3": 0.25, "4": 0.1 };
    const weight = Number(weights[roundedDifference]) || 0.1;

    let label;
    if (difference < 0.75) label = `Civilization fit is close for ${searchArea}`;
    else if (difference < 1.75) label = `Civilization fit is plausible for ${searchArea}`;
    else label = `Civilization fit is unusual for ${searchArea}`;

    return { ingredientValue, searchAreaValue, difference, weight, label };
}

function scoreIngredient(ingredient, selectedRegion, searchArea, dc, degreeOfSuccess) {
    const rarity = Obojima.normalizeRarity(ingredient.rarity);
    const excludedRarity = new Set(foragingConfig.excludeRarity || []);
    const excludedIngredients = new Set(foragingConfig.excludeIngredients || []);

    if (ingredient.forageable === false) return null;
    if (excludedIngredients.has(ingredient.name)) return null;
    if (excludedRarity.has(rarity)) return null;

    const rarityWeight = getRarityWeight(ingredient);
    if (rarityWeight <= 0) return null;

    const regionWeight = getRegionWeight(ingredient, selectedRegion, searchArea);
    const habitatWeight = getHabitatWeight(ingredient, searchArea, selectedRegion);
    const civilizationRelationship = getCivilizationRelationship(ingredient, searchArea);
    const dcModifier = getDcModifier(ingredient, selectedRegion, dc);
    const dosModifier = getDosModifier(ingredient, selectedRegion, searchArea, degreeOfSuccess);

    const score = rarityWeight * regionWeight * habitatWeight * civilizationRelationship.weight * dcModifier * dosModifier;

    if (!Number.isFinite(score) || score <= 0) return null;

    return {
        name: ingredient.name,
        ingredient,
        rarity,
        weight: score,
        regionRelationship: getRegionRelationship(ingredient, selectedRegion),
        habitatRelationship: getHabitatRelationship(ingredient, searchArea, selectedRegion),
        civilizationRelationship
    };
}

function getHabitatTarget(findCount) {
    const targets = foragingConfig.habitatTargetByCount || {};
    return Number(targets[String(findCount)]) || Math.max(1, findCount - 1);
}

function shouldUseSurpriseSlot(degreeOfSuccess, targetFindCount) {
    const rules = foragingConfig.surpriseRules || {};
    if (!rules.enabled) return false;
    if (targetFindCount < (rules.minimumFindCount || 2)) return false;

    const tier = getSuccessTierKey(degreeOfSuccess);
    const chance = Number((rules.chanceByDos || {})[tier]) || 0;
    return Math.random() < chance;
}

function getSurprisePool(candidates, used, bestWeight) {
    const rules = foragingConfig.surpriseRules || {};
    const allowedFits = new Set(rules.allowedHabitatFits || ["related", "none"]);
    const minimumWeight = bestWeight * (Number(rules.minimumWeightFraction) || 0.03);

    return candidates.filter(candidate =>
        !used.has(candidate.name) &&
        allowedFits.has(candidate.habitatRelationship.key) &&
        candidate.weight >= minimumWeight
    );
}

function selectForagingResults(candidates, targetFindCount, searchArea, selectedRegion, prioritizeNew, degreeOfSuccess) {
    const selected = [];
    const used = new Set();
    const inventorySet = new Set(foragingInventory);
    const habitatTarget = getHabitatTarget(targetFindCount);
    const bestWeight = candidates.reduce((max, candidate) => Math.max(max, candidate.weight), 0);
    const useSurpriseSlot = shouldUseSurpriseSlot(degreeOfSuccess, targetFindCount);
    let surpriseUsed = false;

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

        let pick = null;

        const isLastSlot = selected.length === targetFindCount - 1;
        if (useSurpriseSlot && !surpriseUsed && isLastSlot) {
            const surprisePool = getSurprisePool(candidates, used, bestWeight);
            if (surprisePool.length > 0) {
                pick = weightedChoice(surprisePool);
                if (pick) {
                    pick = { ...pick, surprise: true };
                    surpriseUsed = true;
                }
            }
        }

        if (!pick) pick = weightedChoice(pool);
        if (!pick) break;

        selected.push(pick);
        used.add(pick.name);
    }

    return selected;
}

function getDcEffectLines(dc, selectedRegion) {
    const tier = getDcTier(dc);

    if (selectedRegion === "Yatamon") {
        if (tier === "10-15") {
            return [
                "Local Common ingredients were likely.",
                "Nearby Common ingredients were possible."
            ];
        }
        if (tier === "16-20") {
            return [
                "Local Uncommon ingredients were possible.",
                "Nearby Common ingredients were possible."
            ];
        }
        return [
            "Nearby Uncommon ingredients were possible.",
            "Distant ingredients were possible."
        ];
    }

    if (tier === "10-15") {
        return [
            "Native Common ingredients were likely."
        ];
    }
    if (tier === "16-20") {
        return [
            "Native Uncommon ingredients were possible.",
            "Nearby Common ingredients were possible."
        ];
    }
    return [
        "Nearby Uncommon ingredients were possible.",
        "Farther Common ingredients were possible."
    ];
}

function getDosEffectLines(degreeOfSuccess, generatedCount) {
    const tier = getSuccessTierLabel(degreeOfSuccess);

    if (degreeOfSuccess >= 10) {
        return [
            `${tier}.`,
            `${generatedCount} ingredients found.`,
            "Less commonly encountered ingredients were possible."
        ];
    }
    if (degreeOfSuccess >= 5) {
        return [
            `${tier}.`,
            `${generatedCount} ingredients found.`
        ];
    }
    return [
        `${tier}.`,
        `${generatedCount} ingredient${generatedCount === 1 ? "" : "s"} found.`
    ];
}

function describeOpportunityLevel(value) {
    if (value >= 0.8) return "high";
    if (value >= 0.4) return "moderate";
    return "low";
}

function getSearchAreaEffectLines(selected, searchArea) {
    const associatedCount = selected.filter(item => item.habitatRelationship.key !== "none").length;
    const surpriseCount = selected.filter(item => item.surprise).length;
    const civilization = getSearchAreaCivilization(searchArea);
    const lines = [
        `${associatedCount} of ${selected.length} ingredients matched ${searchArea} or a related Search Area.`,
        `${searchArea}: civilization ${civilization}.`
    ];
    if (surpriseCount > 0) {
        lines.push(`${surpriseCount} surprise included.`);
    }
    return lines;
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
        const civilizationLine = item.civilizationRelationship ? item.civilizationRelationship.label : "";
        const rarityLine = item.rarity === "common" ? "Common ingredient" : "Uncommon ingredient";

        return [
            item.name,
            `- ${regionLine}`,
            `- ${habitatLine}`,
            civilizationLine ? `- ${civilizationLine}` : "",
            `- ${rarityLine}`,
            item.surprise ? "- Believable surprise" : ""
        ].filter(Boolean).join("\n");
    }).join("\n\n");

    const debugText = [
        "Generation Details",
        "",
        "Result",
        `Region: ${selectedRegion}`,
        `Search Area: ${searchArea}`,
        `DC: ${dc}`,
        `Roll: ${rollTotal}`,
        `Degree of Success: +${degreeOfSuccess}`,
        `Rarity Mix: ${getRaritySummaryLine(selected)}`,
        "",
        "DC",
        ...dcLines.map(line => `- ${line}`),
        "",
        "Degree of Success",
        ...dosLines.map(line => `- ${line}`),
        "",
        "Search Area",
        ...areaLines.map(line => `- ${line}`),
        "",
        "Ingredients",
        ingredientLines
    ].join("\n");

    const openAttribute = isForagingDebugOpen() ? " open" : "";

    return `<details class="foraging-debug foraging-debug-plain"${openAttribute}>
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
    const resultsDiv = document.getElementById("foraging-results");

    if (!dc || !rollTotal) {
        alert("Please enter both the DC and the roll total.");
        return;
    }

    saveForagingSearchParams();

    const degreeOfSuccess = rollTotal - dc;
    resultsDiv.innerHTML = "";

    if (degreeOfSuccess < 0) {
        resultsDiv.innerHTML = `<div class="completion-card foraging-result-card"><h3>Results</h3><p>No potion ingredients found.</p></div>`;
        saveForagingResults(resultsDiv.innerHTML, []);
        resultsDiv.scrollIntoView({ behavior: "smooth" });
        return;
    }

    const ingredients = await Obojima.loadIngredientData(Obojima.getValuesYear());
    const targetFindCount = Math.min(foragingConfig.maxResults || 5, chooseWeightedCount(degreeOfSuccess));

    const candidates = ingredients
        .map(ingredient => scoreIngredient(ingredient, selectedRegion, searchArea, dc, degreeOfSuccess))
        .filter(Boolean);

    const selected = selectForagingResults(candidates, targetFindCount, searchArea, selectedRegion, prioritizeNew, degreeOfSuccess);

    if (selected.length === 0) {
        resultsDiv.innerHTML = `<div class="completion-card foraging-result-card"><h3>Results</h3><p>No potion ingredients found.</p></div>`;
        saveForagingResults(resultsDiv.innerHTML, []);
        resultsDiv.scrollIntoView({ behavior: "smooth" });
        return;
    }

    const list = selected.map(item => {
        const rarityClass = item.rarity.toLowerCase();
        return `<li class="ingredient ${rarityClass}">${Obojima.formatIngredientName(item.ingredient)}</li>`;
    }).join("");

    const debug = renderPlainDebug({
        selectedRegion,
        searchArea,
        dc,
        rollTotal,
        degreeOfSuccess,
        selected
    });

    resultsDiv.innerHTML = `<div class="completion-card foraging-result-card">
        <h3>Results</h3>
        <ul class="completion-recipe-list foraging-result-list">${list}</ul>
        <div class="button-group foraging-result-actions">
            <button type="button" onclick="addForagingResultsToInventory()">Add to Inventory</button>
            <button type="button" onclick="generateForagingFinds()">Generate Again</button>
        </div>
    </div>${debug}`;

    window.latestForagingResults = selected.map(item => item.name);
    saveForagingResults(resultsDiv.innerHTML, window.latestForagingResults);
    bindForagingDebugDetails();
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
    const resultsDiv = document.getElementById("foraging-results");
    if (resultsDiv) saveForagingResults(resultsDiv.innerHTML, window.latestForagingResults || []);
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
