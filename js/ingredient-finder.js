let selectedInventory = Obojima.loadStoredInventory();
let potionNames = {};

document.addEventListener("DOMContentLoaded", async () => {
    updateCompleterValuesToggleButton();
    populateRegionOptions();
    potionNames = await Obojima.loadPotionNames();
    populatePotionOptions();
    await loadCompleterIngredientButtonsForCurrentYear();
    Obojima.updateInventoryProfileDisplay();
    Obojima.updateSaveInventoryButtons(selectedInventory);
});

function setSelectedInventory(items) {
    selectedInventory = Obojima.normalizeInventoryList(items);
    Obojima.saveStoredInventory(selectedInventory);
}

function markInventoryChanged() {
    Obojima.updateInventoryProfileDisplay();
    Obojima.updateSaveInventoryButtons(selectedInventory);
}

function populateRegionOptions() {
    const regionSelect = document.getElementById("current-region");
    if (!regionSelect) return;

    regionSelect.innerHTML = "";
    Obojima.REGION_LIST.forEach(region => {
        const option = document.createElement("option");
        option.value = region;
        option.textContent = region;
        regionSelect.appendChild(option);
    }, () => selectedInventory);
}

function setupCompleterIngredientButtons() {
    Obojima.bindIngredientButtons(
        () => selectedInventory,
        setSelectedInventory,
        markInventoryChanged
    );
}

function toggleCompleterValuesYear() {
    Obojima.toggleValuesYear();
    updateCompleterValuesToggleButton();
    loadCompleterIngredientButtonsForCurrentYear();
    markInventoryChanged();
}

function setValuesYearChoice(year) {
    Obojima.setValuesYear(year);
    updateCompleterValuesToggleButton();
    loadCompleterIngredientButtonsForCurrentYear();
    markInventoryChanged();
}

function updateCompleterValuesToggleButton() {
    const currentYear = Obojima.getValuesYear();
    document.querySelectorAll(".value-choice").forEach(button => {
        const isActive = button.dataset.year === currentYear;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
}

async function loadCompleterIngredientButtonsForCurrentYear() {
    try {
        await Obojima.renderIngredientButtons(Obojima.getValuesYear());
        setupCompleterIngredientButtons();
        selectedInventory = Obojima.normalizeInventoryList(selectedInventory);
        Obojima.saveStoredInventory(selectedInventory);
        Obojima.applyInventoryToButtons(selectedInventory);
    } catch (error) {
        console.error(error);
    }
}

function populatePotionOptions() {
    const type = document.getElementById("target-potion-type").value;
    const potionSelect = document.getElementById("target-potion");
    potionSelect.innerHTML = "";

    const keyMap = {
        Combat: "combat_names",
        Utility: "utility_names",
        Whimsy: "whimsy_names"
    };

    const names = potionNames[keyMap[type]] || {};
    Object.keys(names)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(number => {
            const option = document.createElement("option");
            option.value = String(number);
            option.textContent = `${number}. ${names[String(number)]}`;
            potionSelect.appendChild(option);
        }, () => selectedInventory);
}

function ingredientDistanceLabel(ingredient, currentRegion) {
    const rarity = Obojima.normalizeRarity(ingredient.rarity);
    const regions = ingredient.regions || [];

    if (rarity === "rare") return [3, "Rare Ingredient", []];

    if (regions.includes(currentRegion)) return [0, "Current Region", [currentRegion]];

    const nearbyRegions = regions.filter(region => (Obojima.REGION_ADJACENCIES[currentRegion] || []).includes(region));
    if (nearbyRegions.length > 0) return [1, "Adjacent Region", nearbyRegions];

    if (regions.length > 0) return [2, "Distant Region", regions];

    return [2, "Distant Region", []];
}

async function completeRecipe() {
    if (selectedInventory.length < 2) {
        alert("Please select at least two ingredients in your inventory.");
        return;
    }

    const ingredients = await Obojima.loadIngredientData(Obojima.getValuesYear());
    const currentRegion = document.getElementById("current-region").value || "Gift of Shuritashi";
    const targetType = document.getElementById("target-potion-type").value;
    const targetValue = Number(document.getElementById("target-potion").value);
    const selectedSet = new Set(selectedInventory);
    const selected = ingredients.filter(ing => selectedSet.has(ing.name));
    const selectedNames = new Set(selected.map(ing => ing.name));

    const completeInventoryResults = [];
    Obojima.combinations(selected, 3).forEach(combo => {
        const totalCombat = combo.reduce((sum, ing) => sum + Number(ing.combat || 0), 0);
        const totalUtility = combo.reduce((sum, ing) => sum + Number(ing.utility || 0), 0);
        const totalWhimsy = combo.reduce((sum, ing) => sum + Number(ing.whimsy || 0), 0);
        const recipeTypes = Obojima.getRecipeTypes(totalCombat, totalUtility, totalWhimsy);

        if (recipeTypes.some(([type, value]) => type === targetType && value === targetValue)) {
            completeInventoryResults.push({
                owned_ingredients: combo.map(Obojima.serializeIngredient),
                attribute_totals: `[${totalCombat}-${totalUtility}-${totalWhimsy}]`
            });
        }
    });

    if (completeInventoryResults.length > 0) {
        renderCompleterResults({
            target_potion: Obojima.getPotionDisplayName(targetType, targetValue, potionNames),
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

        Obojima.combinations(selected, 2).forEach(ownedPair => {
            const combo = [...ownedPair, candidate];
            const totalCombat = combo.reduce((sum, ing) => sum + Number(ing.combat || 0), 0);
            const totalUtility = combo.reduce((sum, ing) => sum + Number(ing.utility || 0), 0);
            const totalWhimsy = combo.reduce((sum, ing) => sum + Number(ing.whimsy || 0), 0);
            const recipeTypes = Obojima.getRecipeTypes(totalCombat, totalUtility, totalWhimsy);

            if (!recipeTypes.some(([type, value]) => type === targetType && value === targetValue)) return;

            const [distanceRank, distanceLabel, availabilityRegions] = ingredientDistanceLabel(candidate, currentRegion);
            possibleResults.push({
                missing_ingredient: Obojima.serializeIngredient(candidate),
                owned_ingredients: ownedPair.map(Obojima.serializeIngredient),
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
        target_potion: Obojima.getPotionDisplayName(targetType, targetValue, potionNames),
        results,
        completion_count: totalCompletingIngredients,
        message: "No single ingredient completes this potion from your current inventory. Try selecting different ingredients or adding to your inventory."
    }, () => selectedInventory);
}

function getUniqueRegions(results) {
    const seen = new Set();
    results.forEach(result => {
        (result.availability_regions || []).forEach(region => seen.add(region));
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

function formatDesignation(distanceLabel, regions) {
    if (distanceLabel === "Rare Ingredient") return "Rare Ingredient";

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
                return `<li class="ingredient ${rarityClass}">${Obojima.formatIngredientName(ing)}</li>`;
            }).join("");

            card.innerHTML = `
                <h4>Current Inventory Recipe</h4>
                <p class="completion-meta">Recipe Total ${recipe.attribute_totals}</p>
                <ul class="completion-recipe-list">${ingredientsList}</ul>
            `;

            completeGrid.appendChild(card);
        });

        resultsDiv.appendChild(completeGrid);
        resultsDiv.scrollIntoView({ behavior: "smooth" });
        return;
    }

    if (!data.results || data.results.length === 0) {
        const message = document.createElement("p");
        message.className = "completer-empty";
        message.textContent = data.message || "No single ingredient completes this potion from your current inventory. Try selecting different ingredients or adding to your inventory.";
        resultsDiv.appendChild(message);
        resultsDiv.scrollIntoView({ behavior: "smooth" });
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
            return `<li class="ingredient ${ownedRarityClass}">${Obojima.formatIngredientName(ing)}</li>`;
        }).join("");

        card.innerHTML = `
            <div class="completion-card-header">
                <h4>Add: <span class="ingredient ${rarityClass}">${Obojima.formatIngredientName(ingredient)}</span></h4>
                <p class="completion-meta">Recipe Total ${result.attribute_totals}</p>
            </div>
            <ul class="completion-recipe-list">${ownedList}<li class="ingredient ${rarityClass}">${Obojima.formatIngredientName(ingredient)}</li></ul>
            <p class="completion-region-footer">${cardDesignation}</p>
        `;

        grid.appendChild(card);
    });

    resultsDiv.appendChild(grid);
    resultsDiv.scrollIntoView({ behavior: "smooth" }, () => selectedInventory);
}

async function clearCompleterSelection() {
    const result = await Obojima.showClearInventoryDialog();
    if (result.action === "cancel") return;
    if (result.action === "save") {
        await Obojima.exportInventory(selectedInventory);
        return;
    }

    selectedInventory = [];
    Obojima.saveStoredInventory(selectedInventory);
    Obojima.clearInventoryProfile();
    Obojima.updateInventoryProfileDisplay();
    Obojima.updateSaveInventoryButtons(selectedInventory);
    Obojima.applyInventoryToButtons(selectedInventory);

    document.getElementById("completer-results").innerHTML = "";
    window.scrollTo({ top: 0, behavior: "smooth" }, () => selectedInventory);
}

async function exportInventory() {
    await Obojima.exportInventory(selectedInventory);
}

function importInventory() {
    Obojima.importInventoryFile(imported => {
        selectedInventory = imported.ingredients;
        Obojima.saveStoredInventory(selectedInventory);
        updateCompleterValuesToggleButton();
        loadCompleterIngredientButtonsForCurrentYear();
        document.getElementById("completer-results").innerHTML = "";
    }, () => selectedInventory);
}
