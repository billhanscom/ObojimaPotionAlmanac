(function () {
    const storageKey = "obojimaHighContrast";

    function applyHighContrast(isEnabled) {
        document.body.classList.toggle("high-contrast", isEnabled);
        document.querySelectorAll(".hc-on").forEach(link => link.classList.toggle("active", isEnabled));
        document.querySelectorAll(".hc-off").forEach(link => link.classList.toggle("active", !isEnabled));
    }

    document.addEventListener("DOMContentLoaded", () => {
        const isEnabled = localStorage.getItem(storageKey) === "true";
        applyHighContrast(isEnabled);
    });

    window.setHighContrastChoice = function (isEnabled) {
        localStorage.setItem(storageKey, String(isEnabled));
        applyHighContrast(isEnabled);
    };
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
    syncBinaryHoverUnderline(".contrast-control", ".hc-toggle-link");
    syncBinaryHoverUnderline(".toolkit-nav", ".toolkit-nav-link");
});

