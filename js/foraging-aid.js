let foragingInventory = Obojima.loadStoredInventory();
let foragingConfig = null;
let foragingAffinity = {};
let foragingLocations = [];
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
    foragingLocations = await loadForagingJson("data/locations.json");
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
    const areas = selectedRegion === "Yatamon"
        ? (foragingConfig.yatamonSearchAreas || [])
        : (foragingConfig.searchAreas || []);

    areaSelect.innerHTML = "";

    areas.slice().sort((a, b) => a.localeCompare(b)).forEach(area => {
        const option = document.createElement("option");
        option.value = area;
        option.textContent = area;
        areaSelect.appendChild(option);
    });
}

function getUnlockedBuckets(dc) {
    if (dc <= 15) return ["native_common", "native_uncommon", "non_native_common"];
    if (dc <= 20) return ["native_common", "native_uncommon", "non_native_common", "non_native_uncommon"];
    return ["native_common", "native_uncommon", "non_native_common", "non_native_uncommon"];
}

function getDcTier(dc) {
    if (dc <= 15) return "15";
    if (dc <= 20) return "20";
    return "25";
}

function getDiscoveryBudget(degreeOfSuccess) {
    const ladder = foragingConfig.degreeOfSuccessBudgets || [];
    const match = ladder.find(entry => degreeOfSuccess >= entry.min && degreeOfSuccess <= entry.max);
    return match ? match.budget : 0;
}

function getFindRange(degreeOfSuccess) {
    const ladder = foragingConfig.degreeOfSuccessFinds || [];
    const match = ladder.find(entry => degreeOfSuccess >= entry.min && degreeOfSuccess <= entry.max);
    if (!match) return { minFinds: 1, maxFinds: 1 };
    return {
        minFinds: Number(match.minFinds) || 1,
        maxFinds: Number(match.maxFinds) || Number(match.minFinds) || 1
    };
}

function randomIntInclusive(min, max) {
    const low = Math.ceil(min);
    const high = Math.floor(max);
    if (high <= low) return low;
    return Math.floor(Math.random() * (high - low + 1)) + low;
}

function getBucketWeight(bucket, dc) {
    const tierWeights = (foragingConfig.bucketWeightsByDc || {})[getDcTier(dc)] || {};
    const weight = Number(tierWeights[bucket]);
    return Number.isFinite(weight) ? weight : 1;
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

    return {
        tier,
        weight,
        areaRule: areaWeights
    };
}

function getRelatedSearchAreasForYatamon(searchArea) {
    const areaRule = (foragingConfig.yatamonAreaWeights || {})[searchArea] || {};
    const boostSearchAreas = areaRule.boostSearchAreas || {};
    return Object.keys(boostSearchAreas);
}

function getHabitatAffinity(ingredientName, searchArea, bucket) {
    const entries = foragingAffinity[ingredientName] || [];
    const matched = entries.filter(entry => entry.searchArea === searchArea);

    if (matched.length > 0) {
        const weight = Math.max(...matched.map(entry => {
            const strength = entry.strength || "Secondary";
            return (foragingConfig.strengthWeights || {})[strength] || 1;
        }));
        return { weight, matchType: matched.some(entry => entry.strength === "Primary") ? "primary habitat" : "secondary habitat" };
    }

    return {
        weight: (foragingConfig.fallbackWeights || {})[bucket] || 0,
        matchType: "no direct habitat match"
    };
}

function getBucket(ingredient, selectedRegion) {
    const rarity = Obojima.normalizeRarity(ingredient.rarity);

    if (selectedRegion === "Yatamon") {
        if (rarity === "common") return "non_native_common";
        if (rarity === "uncommon") return "non_native_uncommon";
        return null;
    }

    const native = (ingredient.regions || []).includes(selectedRegion);

    if (native && rarity === "common") return "native_common";
    if (native && rarity === "uncommon") return "native_uncommon";
    if (!native && rarity === "common") return "non_native_common";
    if (!native && rarity === "uncommon") return "non_native_uncommon";
    return null;
}

function getAffinityWeight(ingredient, searchArea, bucket, dc, selectedRegion) {
    const bucketWeight = getBucketWeight(bucket, dc);
    if (bucketWeight <= 0) return { weight: 0, debug: ["bucket unavailable at this DC"] };

    const ingredientName = ingredient.name;
    let habitat = getHabitatAffinity(ingredientName, searchArea, bucket);
    const debug = [];

    debug.push((foragingConfig.debugLabels || {})[bucket] || bucket);
    debug.push(`bucket weight ${bucketWeight}`);

    if (selectedRegion === "Yatamon") {
        const trade = getYatamonTradeWeight(ingredient, searchArea);
        const relatedAreas = getRelatedSearchAreasForYatamon(searchArea);
        let relatedHabitatBoost = 1;

        relatedAreas.forEach(area => {
            const related = getHabitatAffinity(ingredientName, area, bucket);
            const areaRule = (foragingConfig.yatamonAreaWeights || {})[searchArea] || {};
            const boost = Number((areaRule.boostSearchAreas || {})[area]) || 1;
            if (related.matchType !== "no direct habitat match") {
                relatedHabitatBoost = Math.max(relatedHabitatBoost, boost);
                debug.push(`${related.matchType} via ${area} relevance`);
            }
        });

        debug.push(`Yatamon trade tier: ${trade.tier}`);
        debug.push(`${searchArea} availability weight ${trade.weight}`);

        const habitatWeight = Math.max(habitat.weight, habitat.weight * relatedHabitatBoost);
        if (habitat.matchType !== "no direct habitat match") debug.push(habitat.matchType);
        if (relatedHabitatBoost > 1) debug.push(`urban habitat boost x${relatedHabitatBoost}`);

        return {
            weight: bucketWeight * trade.weight * habitatWeight,
            debug
        };
    }

    debug.push(habitat.matchType);
    debug.push(`habitat weight ${habitat.weight}`);

    return {
        weight: bucketWeight * habitat.weight,
        debug
    };
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

function generateSpendPlan(candidates, budget, prioritizeNew, targetFindCount) {
    const selected = [];
    const used = new Set();
    let remaining = budget;
    const inventorySet = new Set(foragingInventory);

    while (remaining > 0 && selected.length < targetFindCount) {
        let affordable = candidates.filter(candidate =>
            !used.has(candidate.name) && candidate.cost <= remaining
        );

        if (prioritizeNew) {
            const newFinds = affordable.filter(candidate => !inventorySet.has(candidate.name));
            if (newFinds.length > 0) affordable = newFinds;
        }

        if (affordable.length === 0) break;

        const pick = weightedChoice(affordable);
        if (!pick) break;

        selected.push(pick);
        used.add(pick.name);
        remaining -= pick.cost;
    }

    return { selected, remaining };
}


function getSuccessTierLabel(degreeOfSuccess) {
    if (degreeOfSuccess >= 10) return "Exceptional success";
    if (degreeOfSuccess >= 5) return "Strong success";
    if (degreeOfSuccess >= 0) return "Modest success";
    return "Failure";
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
                "Common and Uncommon ingredients were eligible.",
                "Nearby trade sources were more competitive."
            ];
        }
        return [
            "Common and Uncommon ingredients were eligible.",
            "Distant trade sources were more competitive."
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
            "Common and Uncommon ingredients were eligible.",
            "Nearby-region ingredients were more competitive."
        ];
    }
    return [
        "Common and Uncommon ingredients were eligible.",
        "Nearby and far-region ingredients were more competitive."
    ];
}

function getDosEffectLines(degreeOfSuccess, generatedCount) {
    const tier = getSuccessTierLabel(degreeOfSuccess);
    if (degreeOfSuccess >= 10) {
        return [
            `${tier}: generated ${generatedCount} ingredients.`,
            "Less common results had a better chance to appear."
        ];
    }
    if (degreeOfSuccess >= 5) {
        return [
            `${tier}: generated ${generatedCount} ingredients.`,
            "Less common results had a moderate chance to appear."
        ];
    }
    return [
        `${tier}: generated ${generatedCount} ingredient${generatedCount === 1 ? "" : "s"}.`,
        "Common and expected results were favored."
    ];
}

function getRegionStoryLabel(ingredient, selectedRegion) {
    if (selectedRegion === "Yatamon") {
        const tier = getYatamonTradeTier(ingredient);
        if (tier === "local") return "Local trade source";
        if (tier === "nearby") return "Nearby trade source";
        if (tier === "distant") return "Distant trade source";
        return "Unclear trade source";
    }

    const regions = ingredient.regions || [];
    if (regions.includes(selectedRegion)) return "Native to this region";

    const adjacent = Obojima.REGION_ADJACENCIES[selectedRegion] || [];
    if (regions.some(region => adjacent.includes(region))) return "Native to a nearby region";

    return "Native to a farther region";
}

function getIngredientHabitats(ingredientName) {
    const entries = foragingAffinity[ingredientName] || [];
    const habitats = entries
        .map(entry => entry.searchArea)
        .filter(Boolean);
    return Array.from(new Set(habitats)).sort((a, b) => a.localeCompare(b));
}

function getHabitatStoryLabel(ingredientName, searchArea, selectedRegion) {
    if (selectedRegion === "Yatamon") {
        const relatedAreas = getRelatedSearchAreasForYatamon(searchArea);
        const habitats = getIngredientHabitats(ingredientName);

        if (habitats.includes(searchArea)) return `Associated with ${searchArea}`;
        const relatedMatch = relatedAreas.find(area => habitats.includes(area));
        if (relatedMatch) return `Associated with ${relatedMatch}, which matters in ${searchArea}`;
        if (habitats.length > 0) return `Usually associated with ${habitats.join(", ")}`;
        return "No listed search-area association";
    }

    const habitats = getIngredientHabitats(ingredientName);
    if (habitats.includes(searchArea)) return `Associated with ${searchArea}`;
    if (habitats.length > 0) return `Usually associated with ${habitats.join(", ")}`;
    return "No listed search-area association";
}

function getRarityStoryLabel(ingredient) {
    const rarity = Obojima.normalizeRarity(ingredient.rarity);
    if (rarity === "common") return "Common ingredient";
    if (rarity === "uncommon") return "Uncommon ingredient";
    return `${rarity} ingredient`;
}

function renderPlainDebug({
    selectedRegion,
    searchArea,
    dc,
    rollTotal,
    degreeOfSuccess,
    selected,
    targetFindCount
}) {
    const dcLines = getDcEffectLines(dc, selectedRegion).map(line => `<li>${line}</li>`).join("");
    const dosLines = getDosEffectLines(degreeOfSuccess, selected.length).map(line => `<li>${line}</li>`).join("");

    const ingredientCards = selected.map(item => {
        const regionLine = getRegionStoryLabel(item.ingredient, selectedRegion);
        const habitatLine = getHabitatStoryLabel(item.name, searchArea, selectedRegion);
        const rarityLine = getRarityStoryLabel(item.ingredient);

        return `<div class="foraging-debug-item">
            <h5>${item.name}</h5>
            <ul>
                <li>${regionLine}</li>
                <li>${habitatLine}</li>
                <li>${rarityLine}</li>
            </ul>
        </div>`;
    }).join("");

    return `<details class="foraging-debug" open>
        <summary>Generation Details</summary>

        <div class="foraging-debug-section">
            <h4>Result</h4>
            <ul>
                <li>Region: ${selectedRegion}</li>
                <li>Search Area: ${searchArea}</li>
                <li>DC: ${dc}</li>
                <li>Roll: ${rollTotal}</li>
                <li>Degree of Success: +${degreeOfSuccess}</li>
            </ul>
        </div>

        <div class="foraging-debug-section">
            <h4>How DC affected this result</h4>
            <ul>${dcLines}</ul>
        </div>

        <div class="foraging-debug-section">
            <h4>How Degree of Success affected this result</h4>
            <ul>${dosLines}</ul>
        </div>

        <div class="foraging-debug-section">
            <h4>Why these ingredients appeared</h4>
            ${ingredientCards}
        </div>
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
    const unlockedBuckets = getUnlockedBuckets(dc);
    const budget = getDiscoveryBudget(degreeOfSuccess);
    const findRange = getFindRange(degreeOfSuccess);
    const targetFindCount = Math.min(
        foragingConfig.maxResults || 5,
        randomIntInclusive(findRange.minFinds, findRange.maxFinds)
    );
    const excludedRarity = new Set(foragingConfig.excludeRarity || []);
    const costs = foragingConfig.discoveryCosts || {};

    const candidates = ingredients.map(ingredient => {
        const rarity = Obojima.normalizeRarity(ingredient.rarity);
        if (excludedRarity.has(rarity)) return null;

        const bucket = getBucket(ingredient, selectedRegion);
        if (!bucket || !unlockedBuckets.includes(bucket)) return null;

        const cost = costs[bucket] || 1;
        const weightInfo = getAffinityWeight(ingredient, searchArea, bucket, dc, selectedRegion);
        if (weightInfo.weight <= 0) return null;

        return { name: ingredient.name, ingredient, rarity, bucket, cost, weight: weightInfo.weight, debug: weightInfo.debug || [] };
    }).filter(Boolean);

    const { selected, remaining } = generateSpendPlan(candidates, budget, prioritizeNew, targetFindCount);

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
            selected,
            targetFindCount
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
