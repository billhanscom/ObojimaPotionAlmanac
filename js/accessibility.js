(function () {
    const storageKey = "obojimaHighContrast";

    function applyHighContrast(isEnabled) {
        document.body.classList.toggle("high-contrast", isEnabled);
        document.querySelectorAll(".hc-on").forEach(label => label.classList.toggle("active", isEnabled));
        document.querySelectorAll(".hc-off").forEach(label => label.classList.toggle("active", !isEnabled));
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
        options.forEach(option => {
            option.addEventListener("mouseenter", () => {
                options.forEach(item => item.classList.toggle("hover-active", item === option));
                group.classList.add("has-hover");
            });
            option.addEventListener("focus", () => {
                options.forEach(item => item.classList.toggle("hover-active", item === option));
                group.classList.add("has-hover");
            });
        });
        group.addEventListener("mouseleave", () => {
            options.forEach(item => item.classList.remove("hover-active"));
            group.classList.remove("has-hover");
        });
        group.addEventListener("focusout", event => {
            if (!group.contains(event.relatedTarget)) {
                options.forEach(item => item.classList.remove("hover-active"));
                group.classList.remove("has-hover");
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    syncBinaryHoverUnderline(".values-control", ".value-choice");
    syncBinaryHoverUnderline(".contrast-control", ".hc-toggle-link");
});
