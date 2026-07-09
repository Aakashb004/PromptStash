import Browser from "../adapters/browser";
import { StashManager } from "../storage/stashManager";
import { Stash } from "../types";

// Inputs
const titleInput = document.getElementById("title") as HTMLInputElement;
const tagsInput = document.getElementById("tags") as HTMLInputElement;
const autoTriggerInput = document.getElementById("autoTrigger") as HTMLInputElement;
const contentInput = document.getElementById("content") as HTMLTextAreaElement;

// Buttons & Drawers
const toggleDrawerBtn = document.getElementById("toggleDrawerBtn") as HTMLButtonElement;
const closeDrawerBtn = document.getElementById("closeDrawerBtn") as HTMLButtonElement;
const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;
const drawer = document.getElementById("drawer") as HTMLDivElement;

// Containers
const stashList = document.getElementById("stashList") as HTMLDivElement;
const searchInput = document.getElementById("searchInput") as HTMLInputElement;
const importFile = document.getElementById("importFile") as HTMLInputElement;

// Analytics & Statistics
const totalStashes = document.getElementById("totalStashes") as HTMLSpanElement;
const totalUses = document.getElementById("totalUses") as HTMLSpanElement;
const favoriteCount = document.getElementById("favoriteCount") as HTMLSpanElement;
const totalCharacters = document.getElementById("totalCharacters") as HTMLSpanElement;
const averageSize = document.getElementById("averageSize") as HTMLSpanElement;
const stashCountLabel = document.getElementById("stashCount") as HTMLSpanElement;

// Actions
const exportBtn = document.getElementById("exportBtn") as HTMLButtonElement;
const importBtn = document.getElementById("importBtn") as HTMLButtonElement;

let currentSearch = "";

// Custom Toast notification helper
function showToast(message: string, type: "success" | "error" = "success") {
  let container = document.querySelector(".toast-container") as HTMLDivElement;
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === "success" ? "✓" : "✕"}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 2500);
}

// HTML Escaping Utility
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Global initialization
initialize();

async function initialize() {
  // Hotkey focus for search input (Ctrl+K or Cmd+K)
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // Toggle drawer visibility
  toggleDrawerBtn.addEventListener("click", () => {
    drawer.classList.remove("hidden");
    titleInput.focus();
  });

  closeDrawerBtn.addEventListener("click", () => {
    drawer.classList.add("hidden");
  });

  // Save Prompt Handler
  saveBtn.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    const text = contentInput.value.trim();
    const rawTags = tagsInput.value.trim();

    if (!title || !text) {
      showToast("Please enter a title and content.", "error");
      return;
    }

    // Parse comma separated tags or fallback to general
    const tags = rawTags
      ? rawTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : ["general"];

    let autoTrigger = autoTriggerInput.value.trim().toLowerCase();
    if (autoTrigger) {
      if (autoTrigger.startsWith("/")) {
        autoTrigger = autoTrigger.substring(1);
      }
      if (!/^[a-z0-9_-]+$/.test(autoTrigger)) {
        showToast("Trigger shortcut can only contain letters, numbers, hyphens, and underscores.", "error");
        return;
      }
    }

    const stash: Stash = {
      id: crypto.randomUUID(),
      title,
      text,
      autoTrigger,
      tags,
      favorite: false,
      usageCount: 0,
      timestamp: Date.now(),
      versions: [
        {
          version: 1,
          text,
          createdAt: Date.now(),
        },
      ],
    };

    await StashManager.save(stash);

    // Reset inputs
    titleInput.value = "";
    contentInput.value = "";
    tagsInput.value = "";
    autoTriggerInput.value = "";

    // Close Drawer
    drawer.classList.add("hidden");

    // Refresh UI
    await refreshAll();
    showToast("Prompt saved successfully!");
  });

  // Search input listeners
  searchInput.addEventListener("input", async () => {
    currentSearch = searchInput.value.toLowerCase();
    await renderStashes();
  });

  // Export back-up handler
  exportBtn.addEventListener("click", async () => {
    try {
      const stashes = await StashManager.getAll();
      const blob = new Blob(
        [
          JSON.stringify(
            {
              version: "5.5.0",
              exportDate: new Date().toISOString(),
              capsules: stashes,
            },
            null,
            2
          ),
        ],
        { type: "application/json" }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `promptstash-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Backup exported successfully!");
    } catch (e) {
      showToast("Failed to export backup.", "error");
    }
  });

  // Import triggers file select
  importBtn.addEventListener("click", () => {
    importFile.click();
  });

  // Import handler
  importFile.addEventListener("change", async (e: Event) => {
    try {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || !Array.isArray(data.capsules)) {
        showToast("Invalid backup file structure.", "error");
        return;
      }

      await Browser.storage.local.set({
        capsules: data.capsules,
      });

      // Clear input selection
      importFile.value = "";

      await refreshAll();
      showToast("Backup imported successfully!");
    } catch (err) {
      showToast("Failed to import backup file.", "error");
    }
  });

  // Initial load
  await refreshAll();
}

async function refreshAll() {
  await loadStats();
  await loadAnalytics();
  await renderStashes();
}

async function loadStats() {
  const stashes = await StashManager.getAll();
  totalStashes.textContent = stashes.length.toString();

  const usage = stashes.reduce((sum, stash) => sum + stash.usageCount, 0);
  totalUses.textContent = usage.toString();

  if (stashCountLabel) {
    stashCountLabel.textContent = `${stashes.length} ${stashes.length === 1 ? "Stash" : "Stashes"}`;
  }
}

async function loadAnalytics() {
  const stashes = await StashManager.getAll();

  const favorites = stashes.filter((s) => s.favorite).length;
  favoriteCount.textContent = favorites.toString();

  const chars = stashes.reduce((sum, s) => sum + s.text.length, 0);
  totalCharacters.textContent = chars.toString();

  const avg = stashes.length ? Math.round(chars / stashes.length) : 0;
  averageSize.textContent = avg.toString();
}

// Inject prompt or copy as fallback
async function injectOrCopy(stash: Stash) {
  try {
    const tabs = await Browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];

    if (activeTab?.id) {
      const response = await Browser.tabs.sendMessage(activeTab.id, {
        action: "inject-prompt",
        text: stash.text,
      });

      if (response && response.success) {
        await StashManager.incrementUsage(stash.id);
        await refreshAll();
        showToast("Prompt injected into page!");
        return;
      }
    }
  } catch (err) {
    console.warn("Script context connection failed, falling back to clipboard:", err);
  }

  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(stash.text);
    await StashManager.incrementUsage(stash.id);
    await refreshAll();
    showToast("Copied (no active AI text area found)!");
  } catch (err) {
    showToast("Failed to copy prompt.", "error");
  }
}

// Render dynamic lists
async function renderStashes() {
  let stashes = await StashManager.getAll();

  if (currentSearch) {
    stashes = stashes.filter(
      (stash) =>
        stash.title.toLowerCase().includes(currentSearch) ||
        stash.text.toLowerCase().includes(currentSearch) ||
        stash.tags.some((tag) => tag.toLowerCase().includes(currentSearch))
    );
  }

  stashList.innerHTML = "";

  if (stashes.length === 0) {
    stashList.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <h4>No stashes found</h4>
        <p>${currentSearch ? "Refine your search parameters." : "Add a new prompt stash to get started!"}</p>
      </div>
    `;
    return;
  }

  stashes.forEach((stash) => {
    const card = document.createElement("div");
    card.className = "stash-card";

    const tagsHtml = stash.tags
      .map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`)
      .join("");

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title-area">
          <span class="card-favorite-star ${stash.favorite ? "active" : ""}" title="Favorite">
            ${stash.favorite ? "★" : "☆"}
          </span>
          <span class="card-title" title="${escapeHtml(stash.title)}">${escapeHtml(stash.title)}</span>
        </div>
        <div class="card-actions">
          <button class="action-btn inject" title="Inject Prompt">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          <button class="action-btn copy" title="Copy to Clipboard">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="action-btn delete" title="Delete Stash">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="card-content">${escapeHtml(stash.text)}</div>
      <div class="card-footer">
        <div class="card-tags">${tagsHtml}</div>
        <span class="card-usage">${stash.usageCount} ${stash.usageCount === 1 ? "use" : "uses"}</span>
      </div>
    `;

    // Click card body triggers copy/inject
    card.addEventListener("click", (e) => {
      // Prevent trigger when clicking action buttons or favorite stars
      const target = e.target as HTMLElement;
      if (target.closest(".card-actions") || target.closest(".card-favorite-star")) {
        return;
      }
      injectOrCopy(stash);
    });

    // Favorite handler
    const favStar = card.querySelector(".card-favorite-star") as HTMLElement;
    favStar.addEventListener("click", async (e) => {
      e.stopPropagation();
      await StashManager.toggleFavorite(stash.id);
      await refreshAll();
      showToast(stash.favorite ? "Removed from Favorites" : "Added to Favorites");
    });

    // Direct actions
    const injectBtn = card.querySelector(".inject") as HTMLButtonElement;
    injectBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await injectOrCopy(stash);
    });

    const copyBtn = card.querySelector(".copy") as HTMLButtonElement;
    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(stash.text);
        await StashManager.incrementUsage(stash.id);
        await refreshAll();
        showToast("Copied to clipboard!");
      } catch (err) {
        showToast("Failed to copy.", "error");
      }
    });

    const deleteBtn = card.querySelector(".delete") as HTMLButtonElement;
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await StashManager.delete(stash.id);
      await refreshAll();
      showToast("Prompt deleted.");
    });

    stashList.appendChild(card);
  });
}
