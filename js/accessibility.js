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
