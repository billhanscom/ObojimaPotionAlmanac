let selectedIngredients = [];
let commonIngredients = [];
let uncommonIngredients = [];
let rareIngredients = [];

// Load ingredients from JSON file
async function loadIngredients() {
    try {
        const response = await fetch('path/to/ingredients.json'); // Adjust path as needed
        const data = await response.json();
        
        // Filter ingredients by rarity
        data.forEach(ingredient => {
            if (ingredient.rarity === 'C') {
                commonIngredients.push(ingredient.name);
            } else if (ingredient.rarity === 'U') {
                uncommonIngredients.push(ingredient.name);
            } else if (ingredient.rarity === 'R') {
                rareIngredients.push(ingredient.name);
            }
        });
        
        console.log("Ingredients loaded successfully.");
    } catch (error) {
        console.error("Error loading ingredients:", error);
    }
}

// Call the function to load ingredients when the page loads
loadIngredients();

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
            console.log("Selected Ingredients:", selectedIngredients); // Debug log to verify selection
        });
    });
});

// Function to generate random ingredients based on user input
function generateIngredients() {
    const commonCount = parseInt(document.getElementById("common-count").value, 10);
    const uncommonCount = parseInt(document.getElementById("uncommon-count").value, 10);
    const rareCount = parseInt(document.getElementById("rare-count").value, 10);

    const selectedCommon = getRandomSelection(commonIngredients, commonCount);
    const selectedUncommon = getRandomSelection(uncommonIngredients, uncommonCount);
    const selectedRare = getRandomSelection(rareIngredients, rareCount);

    const ingredientList = document.getElementById("ingredient-list");
    ingredientList.innerHTML = `<h3>Generated Ingredients</h3>
        <p><strong>Common:</strong> ${selectedCommon.map(item => `<span class="common">${item}</span>`).join(', ')}</p>
        <p><strong>Uncommon:</strong> ${selectedUncommon.map(item => `<span class="uncommon">${item}</span>`).join(', ')}</p>
        <p><strong>Rare:</strong> ${selectedRare.map(item => `<span class="rare">${item}</span>`).join(', ')}</p>`;
}

// Helper function to select random items from an array
function getRandomSelection(arr, count) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random()); // Shuffle the array
    return shuffled.slice(0, count); // Return the first 'count' elements
}

// Function to find recipes
async function findRecipes() {
    if (selectedIngredients.length < 3) {
        alert("Oops! Please select at least three ingredients.");
        return;
    }

    console.log("Sending ingredients:", selectedIngredients); // Debug log before request
    const response = await fetch('/get-recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: selectedIngredients })
    });

    const recipes = await response.json();
    console.log("Received recipes:", recipes); // Debug log for response data

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

                const recipeLabel = potionData.count === 1 ? "1" : `${potionData.count}`;
                potionContainer.innerHTML = `<h4 class="potion-header">${potionName} (${recipeLabel}) <span class="toggle-arrow">▲</span></h4>`;

                const recipeDetails = document.createElement('div');
                recipeDetails.classList.add('recipe-details');
                recipeDetails.style.display = 'none';

                // Color-code each ingredient in the recipe by rarity
                recipeDetails.innerHTML = potionData.recipes.map((recipe, index) => {
                    const ingredientsList = recipe.ingredients.map(ing => {
                        const rarityClass = ing.rarity.toLowerCase();
                        return `<li class="ingredient ${rarityClass}">${ing.name} [${ing.combat}/${ing.utility}/${ing.whimsy}]</li>`;
                    }).join('');
                    return `<h5>Recipe ${index + 1} ${recipe.attribute_totals}</h5><ul>${ingredientsList}</ul>`;
                }).join('');

                const header = potionContainer.querySelector('.potion-header');
                const toggleArrow = header.querySelector('.toggle-arrow');
                header.addEventListener('click', () => {
                    recipeDetails.style.display = recipeDetails.style.display === 'none' ? 'block' : 'none';
                    toggleArrow.classList.toggle('expanded');
                    toggleArrow.textContent = recipeDetails.style.display === 'none' ? '▲' : '▼';
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

// Function to clear selected ingredients
function clearSelection() {
    selectedIngredients = [];
    document.querySelectorAll(".ingredient-button").forEach(button => {
        button.classList.remove("selected", "common", "uncommon", "rare");
    });
    document.getElementById("results").innerHTML = '';
}