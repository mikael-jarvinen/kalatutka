/**
 * research.js — tab switching and snapshot timestamp for the research page.
 *
 * Tabs are driven by location.hash (#tiede / #algoritmi) so they're linkable.
 * Falls back to the FI tab when the hash is empty or unknown.
 */

import { FETCHED_AT } from "./data/data.js";

const TABS = ["tiede", "algoritmi"];

function activate(tab) {
  const target = TABS.includes(tab) ? tab : "tiede";
  for (const t of TABS) {
    const button = document.querySelector(`.tab-button[data-tab="${t}"]`);
    const panel = document.getElementById(`panel-${t}`);
    if (button) button.classList.toggle("active", t === target);
    if (panel) panel.classList.toggle("active", t === target);
  }
}

function tabFromHash() {
  return location.hash.replace(/^#/, "") || "tiede";
}

function init() {
  const stamp = document.getElementById("dataStamp");
  if (stamp) stamp.textContent = FETCHED_AT.replace("T", " ");

  for (const button of document.querySelectorAll(".tab-button")) {
    button.addEventListener("click", () => {
      const t = button.dataset.tab;
      if (t) location.hash = t;
    });
  }

  window.addEventListener("hashchange", () => activate(tabFromHash()));
  activate(tabFromHash());
}

init();
