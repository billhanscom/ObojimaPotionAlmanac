let selectedIngredients = [];

// Toggle selection for ingredient buttons
document.addEventListener("DOMContentLoaded", () => {
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
        });
    });
});

async function findRecipes() {
    if (selectedIngredients.length < 3) {
        alert("Oops! Please select at least three ingredients.");
        return;
    }

    const response = await fetch('/get-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: selectedIngredients })
    });

    const recipes = await response.json();
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    const columnHeaders = {
        "Combat": "Combat Potions",
        "Utility": "Utility Potions",
        "Whimsy": "Whimsy Potions"
    };

    ["Combat", "Utility", "Whimsy"].forEach(type => {
        const column = document.createElement('div');
        column.classList.add('recipe-column');
        column.innerHTML = `<h3 class="recipe-title">${columnHeaders[type]}</h3>`;

        if (recipes[type]) {
            for (const [potionName, potionData] of Object.entries(recipes[type])) {
                const potionContainer = document.createElement('div');
                potionContainer.classList.add('potion-container');

                const recipeLabel = potionData.count === 1 ? "1 recipe" : `${potionData.count} recipes`;
                potionContainer.innerHTML = `<h4 class="potion-header button-like">${potionName} (${recipeLabel})</h4>`;

                const recipeDetails = document.createElement('div');
                recipeDetails.classList.add('recipe-details');
                recipeDetails.style.display = 'none';

                recipeDetails.innerHTML = potionData.recipes.map(recipe => {
                    const ingredientsList = recipe.ingredients.map(ing => {
                        const rarityClass = ing.rarity.toLowerCase();
                        return `<li class="ingredient ${rarityClass}">${ing.name} [${ing.combat}/${ing.utility}/${ing.whimsy}]</li>`;
                    }).join('');
                    return `<h5>Attributes: ${recipe.attribute_totals}</h5><ul>${ingredientsList}</ul>`;
                }).join('');

                potionContainer.querySelector('.potion-header').addEventListener('click', () => {
                    recipeDetails.style.display = recipeDetails.style.display === 'none' ? 'block' : 'none';
                });

                potionContainer.appendChild(recipeDetails);
                column.appendChild(potionContainer);
            }
        } else {
            column.innerHTML += '<p>No recipes found</p>';
        }

        resultsDiv.appendChild(column);
    });

    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function clearSelection() {
    selectedIngredients = [];
    document.querySelectorAll(".ingredient-button").forEach(button => {
        button.classList.remove("selected", "common", "uncommon", "rare");
    });
    document.getElementById("results").innerHTML = '';
}