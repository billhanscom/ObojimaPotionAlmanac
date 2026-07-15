let foragingInventory = Obojima.loadStoredInventory();
let foragingConfig = null;
let foragingAffinity = {};
let foragingLocations = [];

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
    foragingConfig = await Obojima.loadJson("data/foraging_config.json");
    foragingAffinity = await Obojima.loadJson("data/foraging_affinity.json");
    foragingLocations = await Obojima.loadJson("data/locations.json");
}

function toggleForagingValuesYear() {
    Obojima.toggleValuesYear();
    updateForagingValuesToggleButton();
    Obojima.updateSaveInventoryButtons(foragingInventory);
}

function updateForagingValuesToggleButton() {
    document.querySelectorAll(".values-toggle-button").forEach(toggleButton => {
        toggleButton.textContent = Obojima.getValuesYear() === "2024" ? "Use 2014 Values" : "Use 2024 Values";
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
    const areas = new Set();

    foragingLocations.filter(location => location.Region === selectedRegion).forEach(location => {
        if (location["Primary Habitat"]) areas.add(location["Primary Habitat"]);
        String(location["Secondary Habitats"] || "").split(",").map(item => item.trim()).filter(Boolean).forEach(item => areas.add(item));
    });

    if (areas.size === 0) (foragingConfig.searchAreas || []).forEach(area => areas.add(area));

    areaSelect.innerHTML = "";
    Array.from(areas).filter(area => (foragingConfig.searchAreas || []).includes(area)).sort((a,b) => a.localeCompare(b)).forEach(area => {
        const option = document.createElement("option");
        option.value = area;
        option.textContent = area;
        areaSelect.appendChild(option);
    });
}

function getUnlockedBuckets(dc) {
    if (dc <= 15) return ["native_common"];
    if (dc <= 20) return ["native_common", "native_uncommon", "non_native_common"];
    return ["native_common", "native_uncommon", "non_native_common", "non_native_uncommon"];
}

function getDiscoveryBudget(degreeOfSuccess) {
    const match = (foragingConfig.degreeOfSuccessBudgets || []).find(entry => degreeOfSuccess >= entry.min && degreeOfSuccess <= entry.max);
    return match ? match.budget : 0;
}

function getBucket(ingredient, selectedRegion) {
    const rarity = Obojima.normalizeRarity(ingredient.rarity);
    const native = (ingredient.regions || []).includes(selectedRegion);
    if (native && rarity === "common") return "native_common";
    if (native && rarity === "uncommon") return "native_uncommon";
    if (!native && rarity === "common") return "non_native_common";
    if (!native && rarity === "uncommon") return "non_native_uncommon";
    return null;
}

function getAffinityWeight(ingredientName, searchArea, bucket) {
    const matched = (foragingAffinity[ingredientName] || []).filter(entry => entry.searchArea === searchArea);
    if (matched.length > 0) {
        return Math.max(...matched.map(entry => (foragingConfig.strengthWeights || {})[entry.strength || "Secondary"] || 1));
    }
    return (foragingConfig.fallbackWeights || {})[bucket] || 1;
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

function generateSpendPlan(candidates, budget, prioritizeNew) {
    const selected = [];
    const used = new Set();
    let remaining = budget;
    const inventorySet = new Set(foragingInventory);
    while (remaining > 0 && selected.length < (foragingConfig.maxResults || 5)) {
        let affordable = candidates.filter(candidate => !used.has(candidate.name) && candidate.cost <= remaining);
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
    const excludedRarity = new Set(foragingConfig.excludeRarity || []);
    const costs = foragingConfig.discoveryCosts || {};
    const candidates = ingredients.map(ingredient => {
        const rarity = Obojima.normalizeRarity(ingredient.rarity);
        if (excludedRarity.has(rarity)) return null;
        const bucket = getBucket(ingredient, selectedRegion);
        if (!bucket || !unlockedBuckets.includes(bucket)) return null;
        const cost = costs[bucket] || 1;
        const weight = getAffinityWeight(ingredient.name, searchArea, bucket);
        if (weight <= 0) return null;
        return { name: ingredient.name, ingredient, rarity, bucket, cost, weight };
    }).filter(Boolean);

    const { selected, remaining } = generateSpendPlan(candidates, budget, prioritizeNew);
    if (selected.length === 0) {
        resultsDiv.innerHTML = `<div class="completion-card foraging-result-card"><h3>After an hour of foraging...</h3><p>The party does not return with any potion ingredients.</p></div>`;
        resultsDiv.scrollIntoView({ behavior: "smooth" });
        return;
    }

    const list = selected.map(item => `<li class="ingredient ${item.rarity.toLowerCase()}">${Obojima.formatIngredientName(item.ingredient)}</li>`).join("");
    let debug = "";
    if (showDebug) {
        const bucketLabels = { native_common: "Native Common", native_uncommon: "Native Uncommon", non_native_common: "Common Non-native", non_native_uncommon: "Uncommon Non-native" };
        const bucketCounts = candidates.reduce((acc, candidate) => {
            acc[candidate.bucket] = (acc[candidate.bucket] || 0) + 1;
            return acc;
        }, {});
        debug = `<details class="foraging-debug" open><summary>Generation Details</summary><p><strong>Degree of Success:</strong> +${degreeOfSuccess}</p><p><strong>Discovery Budget:</strong> ${budget}</p><p><strong>Remaining Budget:</strong> ${remaining}</p><p><strong>Unlocked Buckets:</strong> ${unlockedBuckets.map(bucket => bucketLabels[bucket]).join(", ")}</p><p><strong>Candidate Counts:</strong> ${Object.entries(bucketCounts).map(([bucket, count]) => `${bucketLabels[bucket]}: ${count}`).join(" • ")}</p></details>`;
    }

    resultsDiv.innerHTML = `<div class="completion-card foraging-result-card"><h3>After an hour of foraging...</h3><p>The party returns with:</p><ul class="completion-recipe-list">${list}</ul><div class="button-group foraging-result-actions"><button type="button" onclick="addForagingResultsToInventory()">Add to Inventory</button><button type="button" onclick="generateForagingFinds()">Generate Again</button></div></div>${debug}`;
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
    }, () => foragingInventory);
}
