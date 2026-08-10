const search = document.querySelector("#catalog-search");
const group = document.querySelector("#catalog-group");
const cards = [...document.querySelectorAll("[data-breed]")];
const count = document.querySelector("#catalog-count");
const empty = document.querySelector("#catalog-empty");
const reset = document.querySelector("#catalog-reset");

function applyFilters() {
  const query = search.value.trim().toLowerCase();
  const selectedGroup = group.value;
  let shown = 0;

  for (const card of cards) {
    const matchesText = !query || card.dataset.name.includes(query);
    const matchesGroup = selectedGroup === "all" || card.dataset.group === selectedGroup;
    card.hidden = !(matchesText && matchesGroup);
    if (!card.hidden) shown += 1;
  }

  count.textContent = shown === cards.length
    ? `showing all ${shown} breeds`
    : `showing ${shown} of ${cards.length} breeds`;
  empty.hidden = shown !== 0;
  reset.hidden = !query && selectedGroup === "all";
}

search.addEventListener("input", applyFilters);
group.addEventListener("change", applyFilters);
reset.addEventListener("click", () => {
  search.value = "";
  group.value = "all";
  applyFilters();
  search.focus();
});
