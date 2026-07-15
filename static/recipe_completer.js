const OBOJIMA_INVENTORY_STORAGE_KEY = "obojimaIngredientInventory";
let selectedInventory = loadStoredInventory();
let currentValuesYear = localStorage.getItem("obojimaValuesYear") || "2024";


const OBOJIMA_PLAYER_NAME_KEY = "obojimaPlayerName";
const OBOJIMA_CHARACTER_NAME_KEY = "obojimaCharacterName";
const OBOJIMA_LAST_EXPORT_HASH_KEY = "obojimaLastExportHash";

function loadInventoryProfile() {
    return {
        playerName: localStorage.getItem(OBOJIMA_PLAYER_NAME_KEY) || "",
        characterName: localStorage.getItem(OBOJIMA_CHARACTER_NAME_KEY) || ""
    };
}

function saveInventoryProfile(profile) {
    localStorage.setItem(OBOJIMA_PLAYER_NAME_KEY, profile.playerName || "");
    localStorage.setItem(OBOJIMA_CHARACTER_NAME_KEY, profile.characterName || "");
}

function clearInventoryProfile() {
    localStorage.removeItem(OBOJIMA_PLAYER_NAME_KEY);
    localStorage.removeItem(OBOJIMA_CHARACTER_NAME_KEY);
    localStorage.removeItem(OBOJIMA_LAST_EXPORT_HASH_KEY);
}

function getActiveInventoryList() {
    if (typeof selectedIngredients !== "undefined") return normalizeInventoryList(selectedIngredients);
    if (typeof selectedInventory !== "undefined") return normalizeInventoryList(selectedInventory);
    return [];
}

function setActiveInventoryList(ingredients) {
    if (typeof selectedIngredients !== "undefined") {
        selectedIngredients = normalizeInventoryList(ingredients);
        saveStoredInventory();
    }
    if (typeof selectedInventory !== "undefined") {
        selectedInventory = normalizeInventoryList(ingredients);
        saveStoredInventory();
    }
}

function getCanonicalInventoryState() {
    const profile = loadInventoryProfile();
    return {
        version: 2,
        playerName: profile.playerName || "",
        characterName: profile.characterName || "",
        dataset: currentValuesYear || "2024",
        ingredients: getActiveInventoryList().slice().sort((a, b) => a.localeCompare(b))
    };
}

function canonicalStringify(value) {
    if (Array.isArray(value)) return "[" + value.map(canonicalStringify).join(",") + "]";
    if (value && typeof value === "object") {
        return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonicalStringify(value[key])).join(",") + "}";
    }
    return JSON.stringify(value);
}

function currentInventoryHash() {
    return canonicalStringify(getCanonicalInventoryState());
}

function markInventoryChanged() {
    updateInventoryProfileDisplay();
    updateSaveInventoryButtons();
}

function setBackupCurrent() {
    localStorage.setItem(OBOJIMA_LAST_EXPORT_HASH_KEY, currentInventoryHash());
    updateSaveInventoryButtons();
}

function updateInventoryProfileDisplay() {
    const profile = loadInventoryProfile();
    const display = document.getElementById("inventory-profile");
    if (!display) return;
    if (profile.playerName || profile.characterName) {
        const character = profile.characterName ? `<strong>${profile.characterName}</strong>` : "<strong>Unnamed Character</strong>";
        const player = profile.playerName ? ` — Player: ${profile.playerName}` : "";
        display.innerHTML = `${character}${player}`;
    } else {
        display.textContent = "";
    }
}

function updateSaveInventoryButtons() {
    const buttons = document.querySelectorAll(".save-inventory-button");
    if (!buttons.length) return;
    const ingredients = getActiveInventoryList();
    const profile = loadInventoryProfile();
    const hasMeaningfulState = ingredients.length > 0 || profile.playerName || profile.characterName;
    const lastHash = localStorage.getItem(OBOJIMA_LAST_EXPORT_HASH_KEY);
    const currentHash = currentInventoryHash();

    buttons.forEach(button => {
        button.classList.remove("backup-empty", "backup-dirty", "backup-saved");
        if (!hasMeaningfulState) {
            button.classList.add("backup-empty");
            button.textContent = "Save Inventory";
        } else if (lastHash && lastHash === currentHash) {
            button.classList.add("backup-saved");
            button.textContent = "Inventory Saved";
        } else {
            button.classList.add("backup-dirty");
            button.textContent = "Save Inventory";
        }
    });
}


function closeInventoryModal(backdrop) {
    if (backdrop && backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
    }
}

function showInventoryModal({ title, message, fields = [], actions = [] }) {
    return new Promise(resolve => {
        const backdrop = document.createElement("div");
        backdrop.className = "inventory-modal-backdrop";
        backdrop.setAttribute("role", "dialog");
        backdrop.setAttribute("aria-modal", "true");

        const modal = document.createElement("div");
        modal.className = "inventory-modal";

        const heading = document.createElement("h3");
        heading.textContent = title;
        modal.appendChild(heading);

        if (message) {
            const body = document.createElement("p");
            body.textContent = message;
            modal.appendChild(body);
        }

        const fieldInputs = {};
        fields.forEach(field => {
            const label = document.createElement("label");
            label.setAttribute("for", field.id);
            label.textContent = field.label;

            const input = document.createElement("input");
            input.id = field.id;
            input.type = "text";
            input.value = field.value || "";
            input.placeholder = field.placeholder || "";

            fieldInputs[field.name] = input;
            modal.appendChild(label);
            modal.appendChild(input);
        });

        const actionRow = document.createElement("div");
        actionRow.className = "inventory-modal-actions";

        actions.forEach(action => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = action.className || "modal-secondary";
            button.textContent = action.label;
            button.addEventListener("click", () => {
                const values = {};
                Object.entries(fieldInputs).forEach(([name, input]) => {
                    values[name] = input.value.trim();
                });
                closeInventoryModal(backdrop);
                resolve({ action: action.value, values });
            });
            actionRow.appendChild(button);
        });

        modal.appendChild(actionRow);
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        const firstInput = modal.querySelector("input");
        const firstButton = modal.querySelector("button");
        if (firstInput) firstInput.focus();
        else if (firstButton) firstButton.focus();

        backdrop.addEventListener("click", event => {
            if (event.target === backdrop) {
                closeInventoryModal(backdrop);
                resolve({ action: "cancel", values: {} });
            }
        });

        modal.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeInventoryModal(backdrop);
                resolve({ action: "cancel", values: {} });
            }
        });
    });
}

async function showInventoryProfileDialog() {
    const current = loadInventoryProfile();
    const result = await showInventoryModal({
        title: "Save Inventory",
        message: "Add names to this inventory file. Both fields are optional.",
        fields: [
            {
                id: "inventory-player-name",
                name: "playerName",
                label: "Player name",
                value: current.playerName,
                placeholder: "Optional"
            },
            {
                id: "inventory-character-name",
                name: "characterName",
                label: "Character name",
                value: current.characterName,
                placeholder: "Optional"
            }
        ],
        actions: [
            { label: "Cancel", value: "cancel", className: "modal-secondary" },
            { label: "Save Inventory", value: "save", className: "modal-primary" }
        ]
    });

    if (result.action !== "save") return null;

    const profile = {
        playerName: result.values.playerName || "",
        characterName: result.values.characterName || ""
    };
    saveInventoryProfile(profile);
    updateInventoryProfileDisplay();
    return profile;
}

async function showClearInventoryDialog() {
    return await showInventoryModal({
        title: "Clear Inventory?",
        message: "Clear this inventory, character name, and player name from this browser? Saved JSON files will not be affected.",
        actions: [
            { label: "Cancel", value: "cancel", className: "modal-secondary" },
            { label: "Save Inventory First", value: "save", className: "modal-primary" },
            { label: "Clear Inventory", value: "clear", className: "modal-danger" }
        ]
    });
}

async function ensureInventoryProfileBeforeExport() {
    return await showInventoryProfileDialog();
}

function buildInventoryExportPayload() {
    const profile = loadInventoryProfile();
    return {
        app: "Obojima Potion Toolkit",
        version: 2,
        playerName: profile.playerName || "",
        characterName: profile.characterName || "",
        dataset: currentValuesYear || "2024",
        exportedAt: new Date().toISOString(),
        ingredients: getActiveInventoryList()
    };
}

function getInventoryDownloadName(profile) {
    function cleanPart(value) {
        return String(value || "")
            .trim()
            .replace(/[\\/:*?"<>|]/g, "")
            .replace(/\s+/g, "_");
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth()+1).padStart(2,"0");
    const dd = String(now.getDate()).padStart(2,"0");
    const hh = String(now.getHours()).padStart(2,"0");
    const min = String(now.getMinutes()).padStart(2,"0");
    const stamp = `${yyyy}-${mm}-${dd}_${hh}${min}`;

    const player = cleanPart(profile.playerName);
    const character = cleanPart(profile.characterName);

    if (player && character) return `${player}_${character}_${stamp}.json`;
    if (character) return `${character}_${stamp}.json`;
    if (player) return `${player}_${stamp}.json`;
    return `obojima_inventory_${stamp}.json`;
}

function parseImportedInventory(parsed) {
    const ingredients = Array.isArray(parsed) ? parsed : (parsed.ingredients || []);
    return {
        playerName: parsed && !Array.isArray(parsed) ? (parsed.playerName || "") : "",
        characterName: parsed && !Array.isArray(parsed) ? (parsed.characterName || "") : "",
        dataset: parsed && !Array.isArray(parsed) ? parsed.dataset : null,
        ingredients: normalizeInventoryList(ingredients)
    };
}

async function handleInventoryExport() {
    const currentInventory = getActiveInventoryList();
    const currentProfile = loadInventoryProfile();
    if (currentInventory.length === 0 && !currentProfile.playerName && !currentProfile.characterName) {
        alert("There is no inventory to save yet.");
        updateSaveInventoryButtons();
        return;
    }
    const profile = await ensureInventoryProfileBeforeExport();
    if (!profile) return;
    const payload = buildInventoryExportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getInventoryDownloadName(profile);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBackupCurrent();
    updateInventoryProfileDisplay();
}

function applyImportedInventory(parsed, clearResultsCallback) {
    const imported = parseImportedInventory(parsed);
    setActiveInventoryList(imported.ingredients);
    saveInventoryProfile({
        playerName: imported.playerName || "",
        characterName: imported.characterName || ""
    });
    if (imported.dataset === "2014" || imported.dataset === "2024") {
        currentValuesYear = imported.dataset;
        localStorage.setItem("obojimaValuesYear", currentValuesYear);
        if (typeof updateValuesToggleButton === "function") updateValuesToggleButton();
        if (typeof updateCompleterValuesToggleButton === "function") updateCompleterValuesToggleButton();
    }
    applyStoredInventoryToButtons();
    updateInventoryProfileDisplay();
    setBackupCurrent();
    if (typeof clearResultsCallback === "function") clearResultsCallback();
}

window.POTION_NAMES = {};


const DATASET_FILES = {
    "2014": "data/ingredients_2014.json",
    "2024": "data/ingredients_2024.json"
};

const REGION_LIST = [
    "Gift of Shuritashi",
    "Land of Hot Water",
    "Mount Arbora",
    "Gale Fields",
    "Coastal Highlands",
    "Brackwater Wetlands",
    "The Shallows"
];

const REGION_ADJACENCIES = {
    "Gift of Shuritashi": ["Land of Hot Water", "Mount Arbora", "Coastal Highlands", "Gale Fields", "The Shallows"],
    "Land of Hot Water": ["Gift of Shuritashi", "Mount Arbora", "Brackwater Wetlands", "The Shallows"],
    "Mount Arbora": ["Gift of Shuritashi", "Gale Fields", "Brackwater Wetlands", "Land of Hot Water"],
    "Gale Fields": ["Gift of Shuritashi", "Brackwater Wetlands", "Coastal Highlands", "Mount Arbora"],
    "Coastal Highlands": ["Gale Fields", "Gift of Shuritashi", "Brackwater Wetlands", "The Shallows"],
    "Brackwater Wetlands": ["Land of Hot Water", "Mount Arbora", "Coastal Highlands", "Gale Fields", "The Shallows"],
    "The Shallows": ["Land of Hot Water", "Brackwater Wetlands", "Coastal Highlands", "Gift of Shuritashi"]
};

const INGREDIENT_CACHE = {};
let POTION_NAMES_CACHE = null;

function normalizeRarity(rarity) {
    const value = String(rarity || "").toLowerCase();
    if (value === "c" || value === "common") return "common";
    if (value === "u" || value === "uncommon") return "uncommon";
    if (value === "r" || value === "rare") return "rare";
    return value;
}

function ingredientSortKey(ingredient) {
    return String(ingredient.name || "").toLocaleLowerCase();
}

async function loadIngredientData(dataset) {
    const key = DATASET_FILES[dataset] ? dataset : "2024";
    if (!INGREDIENT_CACHE[key]) {
        const response = await fetch(DATASET_FILES[key]);
        if (!response.ok) throw new Error(`Failed to load ingredient data: ${response.status}`);
        const ingredients = await response.json();
        INGREDIENT_CACHE[key] = ingredients.slice().sort((a, b) => ingredientSortKey(a).localeCompare(ingredientSortKey(b)));
    }
    return INGREDIENT_CACHE[key];
}

async function loadPotionNames() {
    if (!POTION_NAMES_CACHE) {
        const response = await fetch("data/potion_names.json");
        if (!response.ok) throw new Error(`Failed to load potion names: ${response.status}`);
        POTION_NAMES_CACHE = await response.json();
    }
    return POTION_NAMES_CACHE;
}

function splitIngredientsByRarity(ingredients) {
    return {
        common: ingredients.filter(ing => normalizeRarity(ing.rarity) === "common").sort((a, b) => ingredientSortKey(a).localeCompare(ingredientSortKey(b))),
        uncommon: ingredients.filter(ing => normalizeRarity(ing.rarity) === "uncommon").sort((a, b) => ingredientSortKey(a).localeCompare(ingredientSortKey(b))),
        rare: ingredients.filter(ing => normalizeRarity(ing.rarity) === "rare").sort((a, b) => ingredientSortKey(a).localeCompare(ingredientSortKey(b)))
    };
}

function createIngredientButton(ingredient) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ingredient-button";
    button.dataset.ingredient = ingredient.name;
    button.dataset.rarity = normalizeRarity(ingredient.rarity);
    const sourceMarker = ingredient.source === "Obojima: Tales from Yatamon" ? "*" : "";
    button.innerHTML = `${ingredient.name}${sourceMarker} [${ingredient.combat}-${ingredient.utility}-${ingredient.whimsy}]`;
    return button;
}

async function renderIngredientButtons(dataset) {
    const ingredients = await loadIngredientData(dataset);
    const groups = splitIngredientsByRarity(ingredients);
    const targets = {
        common: document.getElementById("common-ingredients"),
        uncommon: document.getElementById("uncommon-ingredients"),
        rare: document.getElementById("rare-ingredients")
    };

    Object.entries(targets).forEach(([rarity, target]) => {
        if (!target) return;
        const heading = target.querySelector("h3");
        target.innerHTML = "";
        if (heading) target.appendChild(heading);
        groups[rarity].forEach(ingredient => target.appendChild(createIngredientButton(ingredient)));
    });
}

function combinations(array, size) {
    const results = [];
    function choose(start, combo) {
        if (combo.length === size) {
            results.push(combo.slice());
            return;
        }
        for (let i = start; i <= array.length - (size - combo.length); i++) {
            combo.push(array[i]);
            choose(i + 1, combo);
            combo.pop();
        }
    }
    choose(0, []);
    return results;
}

function getPotionDisplayName(potionType, potionValue, potionNames) {
    const key = String(potionValue);
    if (potionType === "Combat") return `${key}. ${(potionNames.combat_names || {})[key] || "No matching potion"}`;
    if (potionType === "Utility") return `${key}. ${(potionNames.utility_names || {})[key] || "No matching potion"}`;
    return `${key}. ${(potionNames.whimsy_names || {})[key] || "No matching potion"}`;
}

function getRecipeTypes(totalCombat, totalUtility, totalWhimsy) {
    const recipeTypes = [];
    if (totalCombat > 0 && totalCombat >= totalUtility && totalCombat >= totalWhimsy) recipeTypes.push(["Combat", totalCombat]);
    if (totalUtility > 0 && totalUtility >= totalCombat && totalUtility >= totalWhimsy) recipeTypes.push(["Utility", totalUtility]);
    if (totalWhimsy > 0 && totalWhimsy >= totalCombat && totalWhimsy >= totalUtility) recipeTypes.push(["Whimsy", totalWhimsy]);
    return recipeTypes;
}

function extractNumber(potionName) {
    const match = String(potionName || "").match(/^(\d+)/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function serializeIngredient(ing) {
    return {
        name: ing.name,
        rarity: normalizeRarity(ing.rarity),
        combat: ing.combat,
        utility: ing.utility,
        whimsy: ing.whimsy,
        source: ing.source || ""
    };
}


function loadStoredInventory() {
    try {
        const stored = JSON.parse(localStorage.getItem(OBOJIMA_INVENTORY_STORAGE_KEY) || "[]");
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        console.warn("Unable to load stored inventory.", error);
        return [];
    }
}

function saveStoredInventory() {
    localStorage.setItem(OBOJIMA_INVENTORY_STORAGE_KEY, JSON.stringify(selectedInventory));
}

function normalizeInventoryList(items) {
    if (!Array.isArray(items)) return [];
    return Array.from(new Set(items.filter(item => typeof item === "string" && item.trim()).map(item => item.trim())));
}

function applyStoredInventoryToButtons() {
    document.querySelectorAll(".ingredient-button").forEach(button => {
        const ingredient = button.getAttribute("data-ingredient");
        const rarityClass = button.getAttribute("data-rarity");
        const isSelected = selectedInventory.includes(ingredient);

        button.classList.toggle("selected", isSelected);
        button.classList.toggle("common", isSelected && rarityClass === "common");
        button.classList.toggle("uncommon", isSelected && rarityClass === "uncommon");
        button.classList.toggle("rare", isSelected && rarityClass === "rare");
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    updateCompleterValuesToggleButton();
    populateRegionOptions();
    window.POTION_NAMES = await loadPotionNames();
    populatePotionOptions();
    await loadCompleterIngredientButtonsForCurrentYear();
    updateInventoryProfileDisplay();
    updateSaveInventoryButtons();
});

function populateRegionOptions() {
    const regionSelect = document.getElementById("current-region");
    if (!regionSelect) return;
    regionSelect.innerHTML = "";
    REGION_LIST.forEach(region => {
        const option = document.createElement("option");
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    });
}

function setupCompleterIngredientButtons() {
    document.querySelectorAll(".ingredient-button").forEach(button => {
        button.addEventListener("click", () => {
            const ingredient = button.getAttribute("data-ingredient");
            const rarityClass = button.getAttribute("data-rarity");

            button.classList.toggle("selected");
            button.classList.toggle(rarityClass);

            if (selectedInventory.includes(ingredient)) {
                selectedInventory = selectedInventory.filter(i => i !== ingredient);
            } else {
                selectedInventory.push(ingredient);
            }

            selectedInventory = normalizeInventoryList(selectedInventory);
            saveStoredInventory();
            markInventoryChanged();
        });
    });
}

function toggleCompleterValuesYear() {
    currentValuesYear = currentValuesYear === "2024" ? "2014" : "2024";
    localStorage.setItem("obojimaValuesYear", currentValuesYear);

    updateCompleterValuesToggleButton();
    loadCompleterIngredientButtonsForCurrentYear();
    markInventoryChanged();
}

function updateCompleterValuesToggleButton() {
    document.querySelectorAll(".values-toggle-button").forEach(toggleButton => {
        toggleButton.textContent = currentValuesYear === "2024"
            ? "Use 2014 Values"
            : "Use 2024 Values";
    });
}

async function loadCompleterIngredientButtonsForCurrentYear() {
    try {
        await renderIngredientButtons(currentValuesYear);
        setupCompleterIngredientButtons();
        selectedInventory = normalizeInventoryList(selectedInventory);
        saveStoredInventory();
        applyStoredInventoryToButtons();
    } catch (error) {
        console.error(error);
    }
}

function populatePotionOptions() {
    const type = document.getElementById("target-potion-type").value;
    const potionSelect = document.getElementById("target-potion");
    potionSelect.innerHTML = "";

    const keyMap = {
        "Combat": "combat_names",
        "Utility": "utility_names",
        "Whimsy": "whimsy_names"
    };

    const names = window.POTION_NAMES[keyMap[type]] || {};
    Object.keys(names)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(number => {
            const option = document.createElement("option");
            option.value = String(number);
            option.textContent = `${number}. ${names[String(number)]}`;
            potionSelect.appendChild(option);
        });
}

function ingredientDistanceLabel(ingredient, currentRegion) {
    const rarity = normalizeRarity(ingredient.rarity);
    const regions = ingredient.regions || [];

    if (rarity === "rare") {
        return [3, "Rare Ingredient", []];
    }

    if (regions.includes(currentRegion)) {
        return [0, "Current Region", [currentRegion]];
    }

    const nearbyRegions = regions.filter(region => (REGION_ADJACENCIES[currentRegion] || []).includes(region));
    if (nearbyRegions.length > 0) {
        return [1, "Adjacent Region", nearbyRegions];
    }

    if (regions.length > 0) {
        return [2, "Distant Region", regions];
    }

    return [2, "Distant Region", []];
}

async function completeRecipe() {
    if (selectedInventory.length < 2) {
        alert("Please select at least two ingredients in your inventory.");
        return;
    }

    const ingredients = await loadIngredientData(currentValuesYear);
    const potionNames = await loadPotionNames();
    const currentRegion = document.getElementById("current-region").value || "Gift of Shuritashi";
    const targetType = document.getElementById("target-potion-type").value;
    const targetValue = Number(document.getElementById("target-potion").value);
    const selectedSet = new Set(selectedInventory);
    const selected = ingredients.filter(ing => selectedSet.has(ing.name));
    const selectedNames = new Set(selected.map(ing => ing.name));

    const completeInventoryResults = [];
    combinations(selected, 3).forEach(combo => {
        const totalCombat = combo.reduce((sum, ing) => sum + Number(ing.combat || 0), 0);
        const totalUtility = combo.reduce((sum, ing) => sum + Number(ing.utility || 0), 0);
        const totalWhimsy = combo.reduce((sum, ing) => sum + Number(ing.whimsy || 0), 0);
        const recipeTypes = getRecipeTypes(totalCombat, totalUtility, totalWhimsy);

        if (recipeTypes.some(([type, value]) => type === targetType && value === targetValue)) {
            completeInventoryResults.push({
                owned_ingredients: combo.map(serializeIngredient),
                attribute_totals: `[${totalCombat}-${totalUtility}-${totalWhimsy}]`
            });
        }
    });

    if (completeInventoryResults.length > 0) {
        renderCompleterResults({
            target_potion: getPotionDisplayName(targetType, targetValue, potionNames),
            already_complete: true,
            complete_recipes: completeInventoryResults,
            results: [],
            message: "Potion can be brewed using current inventory—no additional ingredients needed."
        });
        return;
    }

    const possibleResults = [];
    ingredients.forEach(candidate => {
        if (selectedNames.has(candidate.name)) return;

        combinations(selected, 2).forEach(ownedPair => {
            const combo = [...ownedPair, candidate];
            const totalCombat = combo.reduce((sum, ing) => sum + Number(ing.combat || 0), 0);
            const totalUtility = combo.reduce((sum, ing) => sum + Number(ing.utility || 0), 0);
            const totalWhimsy = combo.reduce((sum, ing) => sum + Number(ing.whimsy || 0), 0);
            const recipeTypes = getRecipeTypes(totalCombat, totalUtility, totalWhimsy);

            if (!recipeTypes.some(([type, value]) => type === targetType && value === targetValue)) return;

            const [distanceRank, distanceLabel, availabilityRegions] = ingredientDistanceLabel(candidate, currentRegion);
            possibleResults.push({
                missing_ingredient: serializeIngredient(candidate),
                owned_ingredients: ownedPair.map(serializeIngredient),
                attribute_totals: `[${totalCombat}-${totalUtility}-${totalWhimsy}]`,
                distance_rank: distanceRank,
                distance_label: distanceLabel,
                availability_regions: availabilityRegions
            });
        });
    });

    const totalCompletingIngredients = new Set(possibleResults.map(r => r.missing_ingredient.name)).size;
    const deduped = {};
    possibleResults.forEach(result => {
        const key = result.missing_ingredient.name;
        if (!deduped[key] || result.distance_rank < deduped[key].distance_rank) deduped[key] = result;
    });

    let results = Object.values(deduped).sort((a, b) => {
        const rarityOrder = { common: 0, uncommon: 1, rare: 2 };
        return (a.distance_rank - b.distance_rank)
            || ((rarityOrder[a.missing_ingredient.rarity] ?? 9) - (rarityOrder[b.missing_ingredient.rarity] ?? 9))
            || a.missing_ingredient.name.localeCompare(b.missing_ingredient.name);
    });

    if (results.length > 0) {
        const bestRank = results[0].distance_rank;
        results = results.filter(result => result.distance_rank === bestRank);
    }

    renderCompleterResults({
        target_potion: getPotionDisplayName(targetType, targetValue, potionNames),
        results,
        completion_count: totalCompletingIngredients,
        message: "No single ingredient completes this potion from your current inventory. Try selecting different ingredients or adding to your inventory."
    });
}

function formatCompleterIngredient(ingredient) {
    const sourceMarker = ingredient.source === "Obojima: Tales from Yatamon" ? "*" : "";
    return `${ingredient.name}${sourceMarker} [${ingredient.combat}-${ingredient.utility}-${ingredient.whimsy}]`;
}

function getUniqueRegions(results) {
    const seen = new Set();
    results.forEach(result => {
        (result.availability_regions || []).forEach(region => seen.add(region));
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

function formatDesignation(distanceLabel, regions) {
    if (distanceLabel === "Rare Ingredient") {
        return "Rare Ingredient";
    }

    const regionCount = regions.length;
    let label = distanceLabel;

    if (distanceLabel === "Adjacent Region") {
        label = regionCount === 1 ? "Adjacent Region" : "Adjacent Regions";
    } else if (distanceLabel === "Distant Region") {
        label = regionCount === 1 ? "Distant Region" : "Distant Regions";
    } else if (distanceLabel === "Current Region") {
        label = "Current Region";
    }

    return regionCount > 0 ? `${label} (${regions.join(", ")})` : label;
}

function renderCompleterResults(data) {
    const resultsDiv = document.getElementById("completer-results");
    resultsDiv.innerHTML = "";

    const title = document.createElement("div");
    title.className = "recipe-summary";
    title.textContent = data.target_potion;
    resultsDiv.appendChild(title);

    if (data.already_complete && data.complete_recipes && data.complete_recipes.length > 0) {
        const message = document.createElement("p");
        message.className = "completer-empty";
        message.textContent = data.message || "Potion can be brewed using current inventory—no additional ingredients needed.";
        resultsDiv.appendChild(message);

        const completeGrid = document.createElement("div");
        completeGrid.className = "completion-grid";

        data.complete_recipes.forEach(recipe => {
            const card = document.createElement("div");
            card.className = "completion-card";

            const ingredientsList = recipe.owned_ingredients.map(ing => {
                const rarityClass = ing.rarity.toLowerCase();
                return `<li class="ingredient ${rarityClass}">${formatCompleterIngredient(ing)}</li>`;
            }).join("");

            card.innerHTML = `
                <h4>Current Inventory Recipe</h4>
                <p class="completion-meta">Recipe Total ${recipe.attribute_totals}</p>
                <ul class="completion-recipe-list">${ingredientsList}</ul>
            `;

            completeGrid.appendChild(card);
        });

        resultsDiv.appendChild(completeGrid);
        resultsDiv.scrollIntoView({behavior: "smooth"});
        return;
    }

    if (!data.results || data.results.length === 0) {
        const message = document.createElement("p");
        message.className = "completer-empty";
        message.textContent = data.message || "No single ingredient completes this potion from your current inventory. Try selecting different ingredients or adding to your inventory.";
        resultsDiv.appendChild(message);
        resultsDiv.scrollIntoView({behavior: "smooth"});
        return;
    }

    const tally = document.createElement("div");
    tally.className = "completer-tally";
    const completionCount = data.completion_count || 0;
    tally.textContent = `${completionCount.toLocaleString()} ${completionCount === 1 ? "Ingredient" : "Ingredients"} Found That Complete a Recipe for the Selected Potion`;
    resultsDiv.appendChild(tally);

    const bestRegions = getUniqueRegions(data.results);
    const bestDesignation = formatDesignation(data.results[0].distance_label, bestRegions);
    const intro = document.createElement("p");
    intro.className = "completer-intro";
    intro.textContent = `Best Available ${data.results.length === 1 ? "Option" : "Options"}: ${bestDesignation}`;
    resultsDiv.appendChild(intro);

    const grid = document.createElement("div");
    grid.className = "completion-grid";

    data.results.forEach(result => {
        const card = document.createElement("div");
        card.className = "completion-card";

        const ingredient = result.missing_ingredient;
        const rarityClass = ingredient.rarity.toLowerCase();
        const cardRegions = result.availability_regions || [];
        const cardDesignation = formatDesignation(result.distance_label, cardRegions);

        const ownedList = result.owned_ingredients.map(ing => {
            const ownedRarityClass = ing.rarity.toLowerCase();
            return `<li class="ingredient ${ownedRarityClass}">${formatCompleterIngredient(ing)}</li>`;
        }).join("");

        card.innerHTML = `
            <div class="completion-card-header">
                <h4>Add: <span class="ingredient ${rarityClass}">${formatCompleterIngredient(ingredient)}</span></h4>
                <p class="completion-meta">Recipe Total ${result.attribute_totals}</p>
            </div>
            <ul class="completion-recipe-list">${ownedList}<li class="ingredient ${rarityClass}">${formatCompleterIngredient(ingredient)}</li></ul>
            <p class="completion-region-footer">${cardDesignation}</p>
        `;

        grid.appendChild(card);
    });

    resultsDiv.appendChild(grid);
    resultsDiv.scrollIntoView({behavior: "smooth"});
}

async function clearCompleterSelection() {
    const result = await showClearInventoryDialog();
    if (result.action === "cancel") return;
    if (result.action === "save") {
        await handleInventoryExport();
        return;
    }

    selectedInventory = [];
    saveStoredInventory();
    clearInventoryProfile();
    updateInventoryProfileDisplay();
    updateSaveInventoryButtons();
    document.querySelectorAll(".ingredient-button").forEach(button => {
        button.classList.remove("selected", "common", "uncommon", "rare");
    });
    document.getElementById("completer-results").innerHTML = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function exportInventory() {
    await handleInventoryExport();
}

function importInventory() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";

    input.addEventListener("change", () => {
        const file = input.files && input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result);
                applyImportedInventory(parsed, () => {
                    document.getElementById("completer-results").innerHTML = "";
                });
            } catch (error) {
                alert("Sorry, that inventory file could not be loaded.");
                console.error("Unable to import inventory.", error);
            }
        };
        reader.readAsText(file);
    });

    input.click();
}
