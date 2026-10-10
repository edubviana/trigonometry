// Navegação por abas entre as visualizações.
const tabs = [...document.querySelectorAll(".tab")];

function show(viewId) {
  for (const tab of tabs) {
    const active = tab.dataset.view === viewId;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    document.getElementById(tab.dataset.view).hidden = !active;
  }
  document.dispatchEvent(new CustomEvent("viewchange", { detail: viewId }));
}

for (const tab of tabs) tab.addEventListener("click", () => show(tab.dataset.view));
