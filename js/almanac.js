let selectedIngredients = Obojima.loadStoredInventory();

document.addEventListener("DOMContentLoaded", async () => {
    updateValuesToggleButton();
    await loadIngredientButtonsForCurrentYear();
    Obojima.updateInventoryProfileDisplay();
    Obojima.updateSaveInventoryButtons(selectedIngredients);
});

function setSelectedIngredients(items) {
    selectedIngredients = Obojima.normalizeInventoryList(items);
    Obojima.saveStoredInventory(selectedIngredients);
}

function markInventoryChanged() {
    Obojima.updateInventoryProfileDisplay();
    Obojima.updateSaveInventoryButtons(selectedIngredients);
}

function setupIngredientButtons() {
    Obojima.bindIngredientButtons(
        () => selectedIngredients,
        setSelectedIngredients,
        markInventoryChanged
    );
}

function toggleValuesYear() {
    Obojima.toggleValuesYear();
    updateValuesToggleButton();
    loadIngredientButtonsForCurrentYear();
    markInventoryChanged();
}

function setValuesYearChoice(year) {
    Obojima.setValuesYear(year);
    updateValuesToggleButton();
    loadIngredientButtonsForCurrentYear();
    markInventoryChanged();
}

function updateValuesToggleButton() {
    const currentYear = Obojima.getValuesYear();
    document.querySelectorAll(".value-choice").forEach(button => {
        const isActive = button.dataset.year === currentYear;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
}

async function loadIngredientButtonsForCurrentYear() {
    try {
        await Obojima.renderIngredientButtons(Obojima.getValuesYear());
        setupIngredientButtons();
        selectedIngredients = Obojima.normalizeInventoryList(selectedIngredients);
        Obojima.saveStoredInventory(selectedIngredients);
        Obojima.applyInventoryToButtons(selectedIngredients);
    } catch (error) {
        console.error(error);
    }
}

async function getRecipesForSelection() {
    const ingredients = await Obojima.loadIngredientData(Obojima.getValuesYear());
    const potionNames = await Obojima.loadPotionNames();
    const selectedSet = new Set(selectedIngredients);
    const selected = ingredients.filter(ing => selectedSet.has(ing.name));
    const possibleRecipes = { Combat: [], Utility: [], Whimsy: [] };

    Obojima.combinations(selected, 3).forEach(combo => {
        const totalCombat = combo.reduce((sum, ing) => sum + Number(ing.combat || 0), 0);
        const totalUtility = combo.reduce((sum, ing) => sum + Number(ing.utility || 0), 0);
        const totalWhimsy = combo.reduce((sum, ing) => sum + Number(ing.whimsy || 0), 0);
        const recipeTypes = Obojima.getRecipeTypes(totalCombat, totalUtility, totalWhimsy);

        recipeTypes.forEach(([potionType, potionValue]) => {
            possibleRecipes[potionType].push({
                potion_type: Obojima.getPotionDisplayName(potionType, potionValue, potionNames),
                attribute_totals: `[${totalCombat}-${totalUtility}-${totalWhimsy}]`,
                ingredients: combo.map(Obojima.serializeIngredient)
            });
        });
    });

    Object.values(possibleRecipes).forEach(list => {
        list.sort((a, b) => Obojima.extractNumber(a.potion_type) - Obojima.extractNumber(b.potion_type));
    });

    return possibleRecipes;
}

async function findRecipes() {
    if (selectedIngredients.length < 3) {
        alert("Oops! Please select at least three ingredients.");
        return;
    }

    const recipes = await getRecipesForSelection();
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "";

    let recipeCount = 0;
    const potionNames = new Set();

    ["Combat", "Utility", "Whimsy"].forEach(type => {
        if (recipes[type]) {
            recipeCount += recipes[type].length;
            recipes[type].forEach(r => potionNames.add(r.potion_type));
        }
    });

    const summary = document.createElement("div");
    summary.className = "recipe-summary";
    summary.textContent = `${recipeCount.toLocaleString()} Recipes Found for ${potionNames.size.toLocaleString()} Potions`;
    resultsDiv.appendChild(summary);

    const columnHeaders = {
        Combat: "Combat Potions",
        Utility: "Utility Potions",
        Whimsy: "Whimsy Potions"
    };

    ["Combat", "Utility", "Whimsy"].forEach(type => {
        const column = document.createElement("div");
        column.classList.add("recipe-column");
        column.innerHTML = `<h3>${columnHeaders[type]}</h3>`;

        if (recipes[type] && recipes[type].length > 0) {
            column.innerHTML += recipes[type].map(recipe => {
                const ingredientsList = recipe.ingredients.map(ing => {
                    const rarityClass = ing.rarity.toLowerCase();
                    return `<li class="ingredient ${rarityClass}">${Obojima.formatIngredientName(ing)}</li>`;
                }).join("");

                return `<div class="recipe-card completion-card"><h4>${recipe.potion_type} ${recipe.attribute_totals}</h4><ul class="completion-recipe-list">${ingredientsList}</ul></div>`;
            }).join("");
        } else {
            column.innerHTML += "<p>No recipes found</p>";
        }

        resultsDiv.appendChild(column);
    });

    resultsDiv.scrollIntoView({ behavior: "smooth" }, () => selectedIngredients);
}

async function clearSelection() {
    const result = await Obojima.showClearInventoryDialog();
    if (result.action === "cancel") return;
    if (result.action === "save") {
        await Obojima.exportInventory(selectedIngredients);
        return;
    }

    selectedIngredients = [];
    Obojima.saveStoredInventory(selectedIngredients);
    Obojima.clearInventoryProfile();
    Obojima.updateInventoryProfileDisplay();
    Obojima.updateSaveInventoryButtons(selectedIngredients);
    Obojima.applyInventoryToButtons(selectedIngredients);

    document.getElementById("results").innerHTML = "";
    window.scrollTo({ top: 0, behavior: "smooth" }, () => selectedIngredients);
}

async function exportInventory() {
    await Obojima.exportInventory(selectedIngredients);
}

function importInventory() {
    Obojima.importInventoryFile(imported => {
        selectedIngredients = imported.ingredients;
        Obojima.saveStoredInventory(selectedIngredients);
        updateValuesToggleButton();
        loadIngredientButtonsForCurrentYear();
        document.getElementById("results").innerHTML = "";
    }, () => selectedIngredients);
}
