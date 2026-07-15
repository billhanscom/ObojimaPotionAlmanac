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
    document.querySelectorAll(".value-choice").forEach(choice => {
        const isActive = choice.dataset.year === currentYear;
        choice.classList.toggle("active", isActive);
        choice.setAttribute("aria-current", isActive ? "true" : "false");
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


function groupRecipesByPotion(recipes) {
    const grouped = new Map();
    recipes.forEach(recipe => {
        const key = recipe.potion_type;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key).push(recipe);
    });
    return Array.from(grouped.entries()).map(([potionType, recipeList]) => ({
        potionType,
        recipes: recipeList
    }));
}

function recipeHeading(recipe, index, siblingRecipes) {
    const sameTotalCount = siblingRecipes.filter(item => item.attribute_totals === recipe.attribute_totals).length;
    const totalIndex = siblingRecipes
        .slice(0, index + 1)
        .filter(item => item.attribute_totals === recipe.attribute_totals).length;
    return sameTotalCount > 1
        ? `${recipe.attribute_totals} Recipe ${totalIndex}`
        : `${recipe.attribute_totals} Recipe`;
}

function randomSampleRecipes(recipes, maxShown = 12) {
    const copy = recipes.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, maxShown);
}

function renderGroupedPotionResults(type, recipes) {
    if (!recipes || recipes.length === 0) return "<p>No recipes found</p>";

    return groupRecipesByPotion(recipes).map(group => {
        const shownRecipes = group.recipes.length > 12 ? randomSampleRecipes(group.recipes, 12) : group.recipes.slice();
        const recipeWord = group.recipes.length === 1 ? "recipe" : "recipes";
        const countLabel = group.recipes.length > shownRecipes.length
            ? `${group.recipes.length} ${recipeWord} (${shownRecipes.length} shown)`
            : `${group.recipes.length} ${recipeWord}`;

        const recipesHtml = shownRecipes.map((recipe, index) => {
            const ingredientsList = recipe.ingredients.map(ing => {
                const rarityClass = ing.rarity.toLowerCase();
                return `<li class="ingredient ${rarityClass}">${Obojima.formatIngredientName(ing)}</li>`;
            }).join("");

            return `<div class="recipe-subcard"><h5>${recipeHeading(recipe, index, shownRecipes)}</h5><ul>${ingredientsList}</ul></div>`;
        }).join("");

        return `<details class="potion-group-card">
            <summary><span class="potion-group-summary-text"><span class="potion-group-title">${group.potionType}</span><span class="potion-group-count">${countLabel}</span></span></summary>
            <div class="potion-group-recipes">${recipesHtml}</div>
        </details>`;
    }).join("");
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

        column.innerHTML += renderGroupedPotionResults(type, recipes[type]);

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


function viewInventory() {
    Obojima.openInventoryView(
        () => selectedIngredients,
        items => {
            selectedIngredients = Obojima.normalizeInventoryList(items);
            Obojima.saveStoredInventory(selectedIngredients);
            if (typeof Obojima.applyInventoryToButtons === "function") {
                Obojima.applyInventoryToButtons(selectedIngredients);
            }
        },
        () => {
            Obojima.updateSaveInventoryButtons(selectedIngredients);
        }
    );
}
