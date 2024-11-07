from flask import Flask, request, jsonify, render_template
import json
from itertools import combinations
import re

app = Flask(__name__)

# Load potion names and ingredient data from JSON files
with open('potion_names.json') as f:
    potion_names_data = json.load(f)

combat_names = potion_names_data["combat_names"]
utility_names = potion_names_data["utility_names"]
whimsy_names = potion_names_data["whimsy_names"]

with open('ingredients.json') as f:
    ingredient_data = json.load(f)

# Helper function to sort recipes numerically by potion number
def extract_number(potion_name):
    match = re.match(r"(\d+)", potion_name)
    return int(match.group(0)) if match else float('inf')  # Sort "Unknown" or non-numeric values last

# Route to the main page to display the ingredient selection form
@app.route('/')
def index():
    # Separate ingredients by rarity for display in columns
    common_ingredients = [ing for ing in ingredient_data if ing['rarity'] == 'common']
    uncommon_ingredients = [ing for ing in ingredient_data if ing['rarity'] == 'uncommon']
    rare_ingredients = [ing for ing in ingredient_data if ing['rarity'] == 'rare']
    return render_template('index.html', common_ingredients=common_ingredients,
                           uncommon_ingredients=uncommon_ingredients, rare_ingredients=rare_ingredients)

# Calculate all possible recipes based on selected ingredients
@app.route('/get-recipes', methods=['POST'])
def get_recipes():
    user_ingredients = request.json['ingredients']  # Get selected ingredients

    # Filter selected ingredient details from JSON data
    selected_ingredients = [ing for ing in ingredient_data if ing['name'] in user_ingredients]

    # Dictionary to store unique potions and their permutations count
    possible_recipes = {'Combat': {}, 'Utility': {}, 'Whimsy': {}}
    for combo in combinations(selected_ingredients, 3):
        total_combat = sum([ing['combat'] for ing in combo])
        total_utility = sum([ing['utility'] for ing in combo])
        total_whimsy = sum([ing['whimsy'] for ing in combo])

        # Determine potion type(s) based on the highest scores, excluding any zero-score attributes
        recipe_types = []
        if total_combat > 0 and total_combat >= total_utility and total_combat >= total_whimsy:
            recipe_types.append(("Combat", total_combat))
        if total_utility > 0 and total_utility >= total_combat and total_utility >= total_whimsy:
            recipe_types.append(("Utility", total_utility))
        if total_whimsy > 0 and total_whimsy >= total_combat and total_whimsy >= total_utility:
            recipe_types.append(("Whimsy", total_whimsy))

        # Add recipes to the result only if a valid potion type is determined
        for potion_type, potion_value in recipe_types:
            # Fetch the appropriate potion name from the dictionary
            if potion_type == "Combat":
                potion_name = f"{potion_value}. {combat_names.get(str(potion_value), 'No matching potion')}"
            elif potion_type == "Utility":
                potion_name = f"{potion_value}. {utility_names.get(str(potion_value), 'No matching potion')}"
            elif potion_type == "Whimsy":
                potion_name = f"{potion_value}. {whimsy_names.get(str(potion_value), 'No matching potion')}"

            # Initialize potion entry if not exists
            if potion_name not in possible_recipes[potion_type]:
                possible_recipes[potion_type][potion_name] = {"count": 0, "recipes": []}

            # Increment count and add recipe
            possible_recipes[potion_type][potion_name]["count"] += 1
            recipe = {
                "attribute_totals": f"[{total_combat}/{total_utility}/{total_whimsy}]",
                "ingredients": [
                    {
                        "name": ing["name"],
                        "rarity": ing["rarity"],
                        "combat": ing["combat"],
                        "utility": ing["utility"],
                        "whimsy": ing["whimsy"]
                    } for ing in combo
                ]
            }
            possible_recipes[potion_type][potion_name]["recipes"].append(recipe)

    # Sort each potion type's recipes by potion number
    for potion_list in possible_recipes.values():
        sorted_potions = {k: v for k, v in sorted(potion_list.items(), key=lambda item: extract_number(item[0]))}
        potion_list.clear()
        potion_list.update(sorted_potions)

    # Return list of grouped recipes as JSON
    return jsonify(possible_recipes)

if __name__ == '__main__':
    app.run(debug=True)