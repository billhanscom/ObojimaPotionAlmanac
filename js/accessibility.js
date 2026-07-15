(function () {
    const storageKey = "obojimaHighContrast";

    function applyHighContrast(isEnabled) {
        document.body.classList.toggle("high-contrast", isEnabled);
        document.querySelectorAll(".contrast-toggle-button").forEach(button => {
            button.setAttribute("aria-pressed", String(isEnabled));
            button.setAttribute("aria-label", isEnabled ? "Turn off high contrast mode" : "Turn on high contrast mode");
            button.setAttribute("title", isEnabled ? "Turn off high contrast" : "Turn on high contrast");
            button.textContent = "◐ HC";
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        const isEnabled = localStorage.getItem(storageKey) === "true";
        applyHighContrast(isEnabled);

        document.querySelectorAll(".contrast-toggle-button").forEach(button => {
            button.addEventListener("click", () => {
                const nextState = !document.body.classList.contains("high-contrast");
                localStorage.setItem(storageKey, String(nextState));
                applyHighContrast(nextState);
            });
        });
    });
})();


document.addEventListener("DOMContentLoaded",()=>{
 document.querySelectorAll('#results,#completer-results').forEach(r=>{r.setAttribute('aria-live','polite');});
 document.querySelectorAll('.ingredient-button').forEach(b=>{
   const rarity=b.dataset.rarity||'ingredient';
   b.setAttribute('aria-label',`Select ingredient: ${b.dataset.ingredient}. ${rarity} ingredient.`);
 });
 document.querySelectorAll('select').forEach(s=>{
   if(!s.id)return;
   s.setAttribute('aria-label', s.previousElementSibling? s.previousElementSibling.textContent.trim():s.id);
 });
});


function syncBinaryHoverUnderline(groupSelector, optionSelector) {
    document.querySelectorAll(groupSelector).forEach(group => {
        const options = Array.from(group.querySelectorAll(optionSelector));

        function setHover(option) {
            const activeOption = options.find(item => item.classList.contains("active"));
            const isAlternate = activeOption && option !== activeOption;
            options.forEach(item => item.classList.toggle("hover-active", item === option && isAlternate));
            group.classList.toggle("has-hover", Boolean(isAlternate));
        }

        function clearHover() {
            options.forEach(item => item.classList.remove("hover-active"));
            group.classList.remove("has-hover");
        }

        options.forEach(option => {
            option.addEventListener("mouseenter", () => setHover(option));
            option.addEventListener("focus", () => setHover(option));
        });

        group.addEventListener("mouseleave", clearHover);
        group.addEventListener("focusout", event => {
            if (!group.contains(event.relatedTarget)) clearHover();
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    syncBinaryHoverUnderline(".values-control", ".value-choice");
    syncBinaryHoverUnderline(".toolkit-nav", ".toolkit-nav-link");
});


document.addEventListener("DOMContentLoaded", () => {
    syncBinaryHoverUnderline(".toolkit-nav", ".toolkit-nav-link");
});
