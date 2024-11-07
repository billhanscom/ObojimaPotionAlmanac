// Load ingredients JSON data
async function loadIngredients() {
    const response = await fetch('ingredients.json'); // Replace with the correct path to your JSON file
    return await response.json();
}

// Function to get a random selection from an array
function getRandomSelection(array, count) {
    const shuffled = array.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Function to generate ingredients based on user selection
async function generateIngredients() {
    // Get user inputs for the number of common and uncommon ingredients and selected region
    const commonCount = parseInt(document.getElementById("common-count").value, 10);
    const uncommonCount = parseInt(document.getElementById("uncommon-count").value, 10);
    const selectedRegion = document.getElementById("region-select").value;

    // Load ingredients data
    const allIngredients = await loadIngredients();

    // Filter ingredients by rarity and region (if a specific region is selected)
    let commonIngredients = allIngredients.filter(ingredient => ingredient.rarity === "common");
    let uncommonIngredients = allIngredients.filter(ingredient => ingredient.rarity === "uncommon");

    if (selectedRegion !== "all") {
        commonIngredients = commonIngredients.filter(ingredient =>
            ingredient.regions && ingredient.regions.includes(selectedRegion)
        );
        uncommonIngredients = uncommonIngredients.filter(ingredient =>
            ingredient.regions && ingredient.regions.includes(selectedRegion)
        );
    }

    // Get random selections for common and uncommon ingredients
    const selectedCommon = getRandomSelection(commonIngredients, commonCount);
    const selectedUncommon = getRandomSelection(uncommonIngredients, uncommonCount);

    // Display the results
    const ingredientList = document.getElementById("ingredient-list");
    ingredientList.innerHTML = `<h3>Generated Ingredients</h3>
        <p><strong>Common:</strong> ${selectedCommon.map(ing => ing.name).join(', ')}</p>
        <p><strong>Uncommon:</strong> ${selectedUncommon.map(ing => ing.name).join(', ')}</p>`;
}

// Function to clear results and reset inputs
function clearResults() {
    document.getElementById("ingredient-list").innerHTML = "";
    document.getElementById("common-count").value = 0;
    document.getElementById("uncommon-count").value = 0;
    document.getElementById("region-select").value = "all";
}