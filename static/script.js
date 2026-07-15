const OBOJIMA_INVENTORY_STORAGE_KEY = "obojimaIngredientInventory";
let selectedIngredients = loadStoredInventory();
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

function ensureInventoryProfileBeforeExport() {
    const current = loadInventoryProfile();
    let playerName = current.playerName;
    let characterName = current.characterName;

    if (!playerName) {
        const entered = window.prompt("Player name for this inventory:", playerName);
        if (entered === null) return null;
        playerName = entered.trim();
    }

    if (!characterName) {
        const entered = window.prompt("Character name for this inventory:", characterName);
        if (entered === null) return null;
        characterName = entered.trim();
    }

    const profile = { playerName, characterName };
    saveInventoryProfile(profile);
    updateInventoryProfileDisplay();
    return profile;
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
        return String(value || "").trim().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ");
    }
    const player = cleanPart(profile.playerName);
    const character = cleanPart(profile.characterName);
    if (player && character) return `${player} - ${character}.json`;
    if (character) return `${character}.json`;
    if (player) return `${player} - Potion Inventory.json`;
    return "obojima-inventory.json";
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

function handleInventoryExport() {
    const currentInventory = getActiveInventoryList();
    const currentProfile = loadInventoryProfile();
    if (currentInventory.length === 0 && !currentProfile.playerName && !currentProfile.characterName) {
        alert("There is no inventory to save yet.");
        updateSaveInventoryButtons();
        return;
    }
    const profile = ensureInventoryProfileBeforeExport();
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
    localStorage.setItem(OBOJIMA_INVENTORY_STORAGE_KEY, JSON.stringify(selectedIngredients));
}

function normalizeInventoryList(items) {
    if (!Array.isArray(items)) return [];
    return Array.from(new Set(items.filter(item => typeof item === "string" && item.trim()).map(item => item.trim())));
}

function applyStoredInventoryToButtons() {
    document.querySelectorAll(".ingredient-button").forEach(button => {
        const ingredient = button.getAttribute("data-ingredient");
        const rarityClass = button.getAttribute("data-rarity");
        const isSelected = selectedIngredients.includes(ingredient);

        button.classList.toggle("selected", isSelected);
        button.classList.toggle("common", isSelected && rarityClass === "common");
        button.classList.toggle("uncommon", isSelected && rarityClass === "uncommon");
        button.classList.toggle("rare", isSelected && rarityClass === "rare");
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    updateValuesToggleButton();
    await loadIngredientButtonsForCurrentYear();
    updateInventoryProfileDisplay();
    updateSaveInventoryButtons();
});

function setupIngredientButtons() {
    document.querySelectorAll(".ingredient-button").forEach(button => {
        button.addEventListener("click", () => {
            const ingredient = button.getAttribute("data-ingredient");
            const rarityClass = button.getAttribute("data-rarity");

            button.classList.toggle("selected");
            button.classList.toggle(rarityClass);

            if (selectedIngredients.includes(ingredient)) {
                selectedIngredients = selectedIngredients.filter(i => i !== ingredient);
            } else {
                selectedIngredients.push(ingredient);
            }

            selectedIngredients = normalizeInventoryList(selectedIngredients);
            saveStoredInventory();
            markInventoryChanged();
        });
    });
}

function toggleValuesYear() {
    currentValuesYear = currentValuesYear === "2024" ? "2014" : "2024";
    localStorage.setItem("obojimaValuesYear", currentValuesYear);

    updateValuesToggleButton();
    loadIngredientButtonsForCurrentYear();
    markInventoryChanged();
}

function updateValuesToggleButton() {
    document.querySelectorAll(".values-toggle-button").forEach(toggleButton => {
        toggleButton.textContent = currentValuesYear === "2024"
            ? "Use 2014 Values"
            : "Use 2024 Values";
    });
}

async function loadIngredientButtonsForCurrentYear() {
    try {
        await renderIngredientButtons(currentValuesYear);
        setupIngredientButtons();
        selectedIngredients = normalizeInventoryList(selectedIngredients);
        saveStoredInventory();
        applyStoredInventoryToButtons();
    } catch (error) {
        console.error(error);
    }
}

function formatIngredientName(ingredient) {
    const sourceMarker = ingredient.source === "Obojima: Tales from Yatamon" ? "*" : "";
    return `${ingredient.name}${sourceMarker} [${ingredient.combat}-${ingredient.utility}-${ingredient.whimsy}]`;
}

async function getRecipesForSelection() {
    const ingredients = await loadIngredientData(currentValuesYear);
    const potionNames = await loadPotionNames();
    const selectedSet = new Set(selectedIngredients);
    const selected = ingredients.filter(ing => selectedSet.has(ing.name));
    const possibleRecipes = { Combat: [], Utility: [], Whimsy: [] };

    combinations(selected, 3).forEach(combo => {
        const totalCombat = combo.reduce((sum, ing) => sum + Number(ing.combat || 0), 0);
        const totalUtility = combo.reduce((sum, ing) => sum + Number(ing.utility || 0), 0);
        const totalWhimsy = combo.reduce((sum, ing) => sum + Number(ing.whimsy || 0), 0);
        const recipeTypes = getRecipeTypes(totalCombat, totalUtility, totalWhimsy);

        recipeTypes.forEach(([potionType, potionValue]) => {
            const recipe = {
                potion_type: getPotionDisplayName(potionType, potionValue, potionNames),
                attribute_totals: `[${totalCombat}-${totalUtility}-${totalWhimsy}]`,
                ingredients: combo.map(serializeIngredient)
            };
            possibleRecipes[potionType].push(recipe);
        });
    });

    Object.values(possibleRecipes).forEach(list => list.sort((a, b) => extractNumber(a.potion_type) - extractNumber(b.potion_type)));
    return possibleRecipes;
}

async function findRecipes() {
    if (selectedIngredients.length < 3) {
        alert("Oops! Please select at least three ingredients.");
        return;
    }

    const recipes = await getRecipesForSelection();
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    let recipeCount = 0;
    let potionNames = new Set();

    ["Combat", "Utility", "Whimsy"].forEach(type => {
        if (recipes[type]) {
            recipeCount += recipes[type].length;
            recipes[type].forEach(r => potionNames.add(r.potion_type));
        }
    });

    const summary = document.createElement("div");
    summary.className = "recipe-summary";
    summary.textContent =
        `${recipeCount.toLocaleString()} Recipes Found for ${potionNames.size.toLocaleString()} Potions`;

    resultsDiv.appendChild(summary);

    const columnHeaders = {
        "Combat": "Combat Potions",
        "Utility": "Utility Potions",
        "Whimsy": "Whimsy Potions"
    };

    ["Combat", "Utility", "Whimsy"].forEach(type => {
        const column = document.createElement('div');
        column.classList.add('recipe-column');
        column.innerHTML = `<h3>${columnHeaders[type]}</h3>`;

        if (recipes[type] && recipes[type].length > 0) {
            column.innerHTML += recipes[type].map(recipe => {
                const ingredientsList = recipe.ingredients.map(ing => {
                    const rarityClass = ing.rarity.toLowerCase();
                    return `<li class="ingredient ${rarityClass}">${formatIngredientName(ing)}</li>`;
                }).join('');

                return `<div class="recipe-card completion-card"><h4>${recipe.potion_type} ${recipe.attribute_totals}</h4><ul class="completion-recipe-list">${ingredientsList}</ul></div>`;
            }).join('');
        } else {
            column.innerHTML += '<p>No recipes found</p>';
        }

        resultsDiv.appendChild(column);
    });

    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function clearSelection() {
    const confirmed = window.confirm("Clear this inventory, character name, and player name from this browser? Saved JSON files will not be affected.");
    if (!confirmed) return;

    selectedIngredients = [];
    saveStoredInventory();
    clearInventoryProfile();
    updateInventoryProfileDisplay();
    updateSaveInventoryButtons();

    document.querySelectorAll(".ingredient-button").forEach(button => {
        button.classList.remove("selected", "common", "uncommon", "rare");
    });

    document.getElementById("results").innerHTML = '';
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function exportInventory() {
    handleInventoryExport();
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
                    document.getElementById("results").innerHTML = "";
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
