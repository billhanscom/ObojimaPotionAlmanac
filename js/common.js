/* Obojima Potion Toolkit shared utilities */

const OBOJIMA_INVENTORY_STORAGE_KEY = "obojimaIngredientInventory";
const OBOJIMA_PLAYER_NAME_KEY = "obojimaPlayerName";
const OBOJIMA_CHARACTER_NAME_KEY = "obojimaCharacterName";
const OBOJIMA_LAST_EXPORT_HASH_KEY = "obojimaLastExportHash";
const OBOJIMA_VALUES_YEAR_KEY = "obojimaValuesYear";
const OBOJIMA_INVENTORY_QUANTITIES_KEY = "obojimaInventoryQuantities";

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

const Obojima = (() => {
    const ingredientCache = {};
    let potionNamesCache = null;

    function getValuesYear() {
        return localStorage.getItem(OBOJIMA_VALUES_YEAR_KEY) || "2024";
    }

    function setValuesYear(year) {
        const normalized = DATASET_FILES[year] ? year : "2024";
        localStorage.setItem(OBOJIMA_VALUES_YEAR_KEY, normalized);
        return normalized;
    }

    function toggleValuesYear() {
        return setValuesYear(getValuesYear() === "2024" ? "2014" : "2024");
    }

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

    async function loadIngredientData(dataset = getValuesYear()) {
        const key = DATASET_FILES[dataset] ? dataset : "2024";
        if (!ingredientCache[key]) {
            const response = await fetch(DATASET_FILES[key]);
            if (!response.ok) throw new Error(`Failed to load ingredient data: ${response.status}`);
            const ingredients = await response.json();
            ingredientCache[key] = ingredients
                .slice()
                .sort((a, b) => ingredientSortKey(a).localeCompare(ingredientSortKey(b)));
        }
        return ingredientCache[key];
    }

    async function loadPotionNames() {
        if (!potionNamesCache) {
            const response = await fetch("data/potion_names.json");
            if (!response.ok) throw new Error(`Failed to load potion names: ${response.status}`);
            potionNamesCache = await response.json();
        }
        return potionNamesCache;
    }

    function splitIngredientsByRarity(ingredients) {
        return {
            common: ingredients.filter(ing => normalizeRarity(ing.rarity) === "common").sort((a, b) => ingredientSortKey(a).localeCompare(ingredientSortKey(b))),
            uncommon: ingredients.filter(ing => normalizeRarity(ing.rarity) === "uncommon").sort((a, b) => ingredientSortKey(a).localeCompare(ingredientSortKey(b))),
            rare: ingredients.filter(ing => normalizeRarity(ing.rarity) === "rare").sort((a, b) => ingredientSortKey(a).localeCompare(ingredientSortKey(b)))
        };
    }

    function formatIngredientName(ingredient) {
        const sourceMarker = ingredient.source === "Obojima: Tales from Yatamon" ? "*" : "";
        return `${ingredient.name}${sourceMarker} [${ingredient.combat}-${ingredient.utility}-${ingredient.whimsy}]`;
    }

    function createIngredientButton(ingredient) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "ingredient-button";
        button.dataset.ingredient = ingredient.name;
        button.dataset.rarity = normalizeRarity(ingredient.rarity);
        button.innerHTML = formatIngredientName(ingredient);
        return button;
    }

    async function renderIngredientButtons(dataset = getValuesYear()) {
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
            return normalizeInventoryList(stored);
        } catch (error) {
            console.warn("Unable to load stored inventory.", error);
            return [];
        }
    }

    function saveStoredInventory(items) {
        const normalized = normalizeInventoryList(items);
        localStorage.setItem(OBOJIMA_INVENTORY_STORAGE_KEY, JSON.stringify(normalized));
        reconcileInventoryQuantities(normalized);
    }

    function normalizeInventoryList(items) {
        if (!Array.isArray(items)) return [];
        return Array.from(new Set(
            items
                .map(item => typeof item === "string" ? item : (item && item.name))
                .filter(item => typeof item === "string" && item.trim())
                .map(item => item.trim())
        ));
    }

    function loadInventoryQuantities() {
        try {
            const stored = JSON.parse(localStorage.getItem(OBOJIMA_INVENTORY_QUANTITIES_KEY) || "{}");
            return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
        } catch (error) {
            console.warn("Unable to load inventory quantities.", error);
            return {};
        }
    }

    function saveInventoryQuantities(quantities) {
        localStorage.setItem(OBOJIMA_INVENTORY_QUANTITIES_KEY, JSON.stringify(quantities || {}));
    }

    function reconcileInventoryQuantities(items) {
        const inventory = normalizeInventoryList(items);
        const inventorySet = new Set(inventory);
        const quantities = loadInventoryQuantities();
        const nextQuantities = {};

        inventory.forEach(name => {
            const value = Number(quantities[name]);
            nextQuantities[name] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
        });

        Object.keys(quantities).forEach(name => {
            if (!inventorySet.has(name)) return;
            const value = Number(quantities[name]);
            nextQuantities[name] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
        });

        saveInventoryQuantities(nextQuantities);
        return nextQuantities;
    }

    function getInventoryQuantity(name) {
        const quantities = loadInventoryQuantities();
        const value = Number(quantities[name]);
        return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
    }

    function setInventoryQuantity(name, quantity, getInventory, setInventory, onChange) {
        const inventory = normalizeInventoryList(typeof getInventory === "function" ? getInventory() : loadStoredInventory());
        const quantities = reconcileInventoryQuantities(inventory);
        const nextQuantity = Math.max(0, Math.floor(Number(quantity) || 0));

        if (nextQuantity <= 0) {
            const nextInventory = inventory.filter(item => item !== name);
            delete quantities[name];
            saveInventoryQuantities(quantities);
            if (typeof setInventory === "function") setInventory(nextInventory);
            applyInventoryToButtons(nextInventory);
        } else {
            if (!inventory.includes(name) && typeof setInventory === "function") {
                setInventory(inventory.concat([name]));
            }
            quantities[name] = nextQuantity;
            saveInventoryQuantities(quantities);
        }

        if (typeof onChange === "function") onChange();
    }

    function incrementInventoryQuantity(name, delta, getInventory, setInventory, onChange) {
        const current = getInventoryQuantity(name);
        setInventoryQuantity(name, current + delta, getInventory, setInventory, onChange);
    }

    function applyInventoryToButtons(items) {
        const normalized = normalizeInventoryList(items);
        document.querySelectorAll(".ingredient-button").forEach(button => {
            const ingredient = button.getAttribute("data-ingredient");
            const rarityClass = button.getAttribute("data-rarity");
            const isSelected = normalized.includes(ingredient);

            button.classList.toggle("selected", isSelected);
            button.classList.toggle("common", isSelected && rarityClass === "common");
            button.classList.toggle("uncommon", isSelected && rarityClass === "uncommon");
            button.classList.toggle("rare", isSelected && rarityClass === "rare");
        });
    }

    function bindIngredientButtons(getInventory, setInventory, onChange) {
        document.querySelectorAll(".ingredient-button").forEach(button => {
            button.addEventListener("click", () => {
                const ingredient = button.getAttribute("data-ingredient");
                const current = normalizeInventoryList(getInventory());
                const quantities = reconcileInventoryQuantities(current);
                const next = current.includes(ingredient)
                    ? current.filter(item => item !== ingredient)
                    : current.concat([ingredient]);

                if (current.includes(ingredient)) {
                    delete quantities[ingredient];
                    saveInventoryQuantities(quantities);
                } else if (!quantities[ingredient]) {
                    quantities[ingredient] = 1;
                    saveInventoryQuantities(quantities);
                }

                setInventory(normalizeInventoryList(next));
                applyInventoryToButtons(next);
                if (typeof onChange === "function") onChange();
            });
        });
    }

    async function showInventoryView(getInventory, setInventory, onChange) {
        const inventory = normalizeInventoryList(typeof getInventory === "function" ? getInventory() : loadStoredInventory());
        reconcileInventoryQuantities(inventory);

        const result = await showInventoryModal({
            title: "Current Inventory",
            message: inventory.length ? "" : "No ingredients are currently in this inventory.",
            actions: [
                { label: "Done", value: "done", className: "modal-primary" }
            ]
        });

        // showInventoryModal is used for its dialog shell elsewhere. This custom view
        // replaces the standard dialog contents after creation, so this fallback is
        // intentionally unused.
        return result;
    }

    async function openInventoryView(getInventory, setInventory, onChange) {
        const inventory = normalizeInventoryList(typeof getInventory === "function" ? getInventory() : loadStoredInventory());
        reconcileInventoryQuantities(inventory);

        const backdrop = document.createElement("div");
        backdrop.className = "inventory-modal-backdrop";
        backdrop.setAttribute("role", "dialog");
        backdrop.setAttribute("aria-modal", "true");

        const modal = document.createElement("div");
        modal.className = "inventory-modal inventory-view-modal";

        const heading = document.createElement("h3");
        heading.textContent = "Current Inventory";
        modal.appendChild(heading);

        const profile = loadInventoryProfile();
        const subtitle = document.createElement("p");
        subtitle.className = "inventory-view-subtitle";
        if (profile.characterName || profile.playerName) {
            subtitle.textContent = `${profile.characterName || "Unnamed Character"}${profile.playerName ? ` (Player: ${profile.playerName})` : ""}`;
        } else {
            subtitle.textContent = "No inventory loaded";
        }
        modal.appendChild(subtitle);

        const list = document.createElement("div");
        list.className = "inventory-view-list";

        if (inventory.length === 0) {
            const empty = document.createElement("p");
            empty.className = "inventory-view-empty";
            empty.textContent = "No ingredients are currently in this inventory.";
            list.appendChild(empty);
        } else {
            inventory.slice().sort((a, b) => a.localeCompare(b)).forEach(name => {
                const row = document.createElement("div");
                row.className = "inventory-view-row";

                const itemName = document.createElement("span");
                itemName.className = "inventory-view-name";
                itemName.textContent = name;

                const controls = document.createElement("div");
                controls.className = "inventory-quantity-controls";

                const minus = document.createElement("button");
                minus.type = "button";
                minus.className = "inventory-quantity-button";
                minus.textContent = "-";
                minus.setAttribute("aria-label", `Decrease ${name}`);

                const count = document.createElement("span");
                count.className = "inventory-quantity-count";
                count.textContent = String(getInventoryQuantity(name));

                const plus = document.createElement("button");
                plus.type = "button";
                plus.className = "inventory-quantity-button";
                plus.textContent = "+";
                plus.setAttribute("aria-label", `Increase ${name}`);

                minus.addEventListener("click", () => {
                    incrementInventoryQuantity(name, -1, getInventory, setInventory, onChange);
                    const updatedInventory = normalizeInventoryList(typeof getInventory === "function" ? getInventory() : loadStoredInventory());
                    if (!updatedInventory.includes(name)) {
                        row.remove();
                        if (updatedInventory.length === 0 && !list.querySelector(".inventory-view-empty")) {
                            const empty = document.createElement("p");
                            empty.className = "inventory-view-empty";
                            empty.textContent = "No ingredients are currently in this inventory.";
                            list.appendChild(empty);
                        }
                    } else {
                        count.textContent = String(getInventoryQuantity(name));
                    }
                    updateSaveInventoryButtons(updatedInventory);
                });

                plus.addEventListener("click", () => {
                    incrementInventoryQuantity(name, 1, getInventory, setInventory, onChange);
                    count.textContent = String(getInventoryQuantity(name));
                    updateSaveInventoryButtons(typeof getInventory === "function" ? getInventory() : loadStoredInventory());
                });

                controls.appendChild(minus);
                controls.appendChild(count);
                controls.appendChild(plus);
                row.appendChild(itemName);
                row.appendChild(controls);
                list.appendChild(row);
            });
        }

        const actionRow = document.createElement("div");
        actionRow.className = "inventory-modal-actions";
        const done = document.createElement("button");
        done.type = "button";
        done.className = "modal-primary";
        done.textContent = "Done";
        done.addEventListener("click", () => closeInventoryModal(backdrop));
        actionRow.appendChild(done);

        modal.appendChild(list);
        modal.appendChild(actionRow);
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        done.focus();

        backdrop.addEventListener("click", event => {
            if (event.target === backdrop) closeInventoryModal(backdrop);
        });

        modal.addEventListener("keydown", event => {
            if (event.key === "Escape") closeInventoryModal(backdrop);
        });
    }

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
        localStorage.removeItem(OBOJIMA_INVENTORY_QUANTITIES_KEY);
    }

    function getCanonicalInventoryState(items) {
        const profile = loadInventoryProfile();
        return {
            version: 2,
            playerName: profile.playerName || "",
            characterName: profile.characterName || "",
            dataset: getValuesYear(),
            ingredients: normalizeInventoryList(items).slice().sort((a, b) => a.localeCompare(b)),
            quantities: reconcileInventoryQuantities(items)
        };
    }

    function canonicalStringify(value) {
        if (Array.isArray(value)) return "[" + value.map(canonicalStringify).join(",") + "]";
        if (value && typeof value === "object") {
            return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonicalStringify(value[key])).join(",") + "}";
        }
        return JSON.stringify(value);
    }

    function currentInventoryHash(items) {
        return canonicalStringify(getCanonicalInventoryState(items));
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
            display.textContent = "No inventory loaded";
        }
    }

    function updateSaveInventoryButtons(items) {
        const buttons = document.querySelectorAll(".save-inventory-button");
        if (!buttons.length) return;

        const inventory = normalizeInventoryList(items);
        const profile = loadInventoryProfile();
        const hasMeaningfulState = inventory.length > 0 || profile.playerName || profile.characterName;
        const lastHash = localStorage.getItem(OBOJIMA_LAST_EXPORT_HASH_KEY);
        const currentHash = currentInventoryHash(inventory);

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

    function setBackupCurrent(items) {
        localStorage.setItem(OBOJIMA_LAST_EXPORT_HASH_KEY, currentInventoryHash(items));
        updateSaveInventoryButtons(items);
    }

    function closeInventoryModal(backdrop) {
        if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
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
                { id: "inventory-player-name", name: "playerName", label: "Player name", value: current.playerName, placeholder: "Optional" },
                { id: "inventory-character-name", name: "characterName", label: "Character name", value: current.characterName, placeholder: "Optional" }
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

    function buildInventoryExportPayload(items) {
        const profile = loadInventoryProfile();
        return {
            app: "Obojima Potion Toolkit",
            version: 2,
            playerName: profile.playerName || "",
            characterName: profile.characterName || "",
            dataset: getValuesYear(),
            exportedAt: new Date().toISOString(),
            ingredients: normalizeInventoryList(items),
            quantities: reconcileInventoryQuantities(items)
        };
    }

    function getInventoryDownloadName(profile) {
        function cleanPart(value) {
            return String(value || "").trim().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
        }

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const min = String(now.getMinutes()).padStart(2, "0");
        const stamp = `${yyyy}-${mm}-${dd}_${hh}${min}`;

        const player = cleanPart(profile.playerName);
        const character = cleanPart(profile.characterName);

        if (player && character) return `${player}_${character}_${stamp}.json`;
        if (character) return `${character}_${stamp}.json`;
        if (player) return `${player}_${stamp}.json`;
        return `obojima_inventory_${stamp}.json`;
    }

    async function exportInventory(items) {
        const inventory = normalizeInventoryList(items);
        const currentProfile = loadInventoryProfile();

        if (inventory.length === 0 && !currentProfile.playerName && !currentProfile.characterName) {
            alert("There is no inventory to save yet.");
            updateSaveInventoryButtons(inventory);
            return false;
        }

        const profile = await showInventoryProfileDialog();
        if (!profile) return false;

        const payload = buildInventoryExportPayload(inventory);
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = getInventoryDownloadName(profile);
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        setBackupCurrent(inventory);
        updateInventoryProfileDisplay();
        return true;
    }

    function parseImportedInventory(parsed) {
        const ingredients = Array.isArray(parsed) ? parsed : (parsed.ingredients || []);
        const quantities = parsed && !Array.isArray(parsed) && parsed.quantities && typeof parsed.quantities === "object"
            ? parsed.quantities
            : {};
        return {
            playerName: parsed && !Array.isArray(parsed) ? (parsed.playerName || "") : "",
            characterName: parsed && !Array.isArray(parsed) ? (parsed.characterName || "") : "",
            dataset: parsed && !Array.isArray(parsed) ? parsed.dataset : null,
            ingredients: normalizeInventoryList(ingredients),
            quantities
        };
    }

    async function importInventoryFile(onImported, getCurrentInventory = null) {
        const currentItems = typeof getCurrentInventory === "function" ? getCurrentInventory() : [];
        const lastHash = localStorage.getItem(OBOJIMA_LAST_EXPORT_HASH_KEY);
        const currentHash = currentInventoryHash(currentItems);
        const profile = loadInventoryProfile();
        const dirty = (currentItems.length > 0 || profile.playerName || profile.characterName) && (!lastHash || lastHash !== currentHash);

        if (dirty) {
            const result = await showInventoryModal({
                title: "Load Inventory?",
                message: "Loading an inventory will overwrite your current inventory, player name, and character name.",
                actions: [
                    { label: "Cancel", value: "cancel", className: "modal-secondary" },
                    { label: "Save Inventory First", value: "save", className: "modal-primary" },
                    { label: "Load Inventory", value: "load", className: "modal-danger" }
                ]
            });

            if (result.action === "cancel") return;
            if (result.action === "save") {
                const exported = await exportInventory(currentItems);
                if (!exported) return;
            }
        }

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
                    const imported = parseImportedInventory(parsed);
                    if (imported.dataset === "2014" || imported.dataset === "2024") setValuesYear(imported.dataset);
                    saveInventoryQuantities(imported.quantities || {});
                    reconcileInventoryQuantities(imported.ingredients);
                    saveInventoryProfile({
                        playerName: imported.playerName || "",
                        characterName: imported.characterName || ""
                    });
                    updateInventoryProfileDisplay();
                    if (typeof onImported === "function") onImported(imported);
                    setBackupCurrent(imported.ingredients);
                } catch (error) {
                    alert("Sorry, that inventory file could not be loaded.");
                    console.error("Unable to import inventory.", error);
                }
            };
            reader.readAsText(file);
        });

        input.click();
    }

    return {
        REGION_LIST,
        REGION_ADJACENCIES,
        normalizeRarity,
        loadIngredientData,
        loadPotionNames,
        renderIngredientButtons,
        combinations,
        getPotionDisplayName,
        getRecipeTypes,
        extractNumber,
        serializeIngredient,
        formatIngredientName,
        loadStoredInventory,
        saveStoredInventory,
        normalizeInventoryList,
        applyInventoryToButtons,
        bindIngredientButtons,
        getValuesYear,
        setValuesYear,
        toggleValuesYear,
        updateInventoryProfileDisplay,
        updateSaveInventoryButtons,
        setBackupCurrent,
        clearInventoryProfile,
        showClearInventoryDialog,
        exportInventory,
        importInventoryFile,
        loadInventoryQuantities,
        saveInventoryQuantities,
        getInventoryQuantity,
        setInventoryQuantity,
        incrementInventoryQuantity,
        openInventoryView
    };
})();
