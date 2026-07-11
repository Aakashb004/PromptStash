import Browser from "../adapters/browser";
import { StashManager } from "../storage/stashManager";
import { Stash } from "../types";
import { VersionManager } from "../storage/versionManager";
import { PackagingEngine } from "../utils/packagingEngine";
import { TokenEstimator } from "../utils/tokenEstimator";

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

// Variable Drawer elements
const varsDrawer = document.getElementById("varsDrawer") as HTMLDivElement;
const closeVarsDrawerBtn = document.getElementById("closeVarsDrawerBtn") as HTMLButtonElement;
const varsFormBody = document.getElementById("varsFormBody") as HTMLDivElement;
const varsSubmitBtn = document.getElementById("varsSubmitBtn") as HTMLButtonElement;
let activeSubmitListener: (() => void) | null = null;

// Edit Drawer elements
const editDrawer = document.getElementById("editDrawer") as HTMLDivElement;
const closeEditDrawerBtn = document.getElementById("closeEditDrawerBtn") as HTMLButtonElement;
const editStashId = document.getElementById("editStashId") as HTMLInputElement;
const editTitleInput = document.getElementById("editTitle") as HTMLInputElement;
const editTagsInput = document.getElementById("editTags") as HTMLInputElement;
const editAutoTriggerInput = document.getElementById("editAutoTrigger") as HTMLInputElement;
const editContentInput = document.getElementById("editContent") as HTMLTextAreaElement;
const versionTimeline = document.getElementById("versionTimeline") as HTMLDivElement;
const updateBtn = document.getElementById("updateBtn") as HTMLButtonElement;

// Counter elements
const createLength = document.getElementById("createLength") as HTMLSpanElement;
const createTokens = document.getElementById("createTokens") as HTMLSpanElement;
const editLength = document.getElementById("editLength") as HTMLSpanElement;
const editTokens = document.getElementById("editTokens") as HTMLSpanElement;

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
    createLength.textContent = "0";
    createTokens.textContent = "0";

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

  // Close variables drawer
  closeVarsDrawerBtn.addEventListener("click", () => {
    varsDrawer.classList.add("hidden");
  });

  // Close edit drawer
  closeEditDrawerBtn.addEventListener("click", () => {
    editDrawer.classList.add("hidden");
  });

  // Counter live updates for Create Prompt
  contentInput.addEventListener("input", () => {
    const text = contentInput.value;
    createLength.textContent = text.length.toString();
    createTokens.textContent = TokenEstimator.estimate(text).toString();
  });

  // Counter live updates for Edit Prompt
  editContentInput.addEventListener("input", () => {
    const text = editContentInput.value;
    editLength.textContent = text.length.toString();
    editTokens.textContent = TokenEstimator.estimate(text).toString();
  });

  // Save changes from Edit Drawer
  updateBtn.addEventListener("click", async () => {
    const id = editStashId.value;
    const title = editTitleInput.value.trim();
    const rawTags = editTagsInput.value.trim();
    const text = editContentInput.value.trim();

    if (!id || !title || !text) {
      showToast("Please enter a title and content.", "error");
      return;
    }

    const tags = rawTags
      ? rawTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : ["general"];

    let autoTrigger = editAutoTriggerInput.value.trim().toLowerCase();
    if (autoTrigger) {
      if (autoTrigger.startsWith("/")) {
        autoTrigger = autoTrigger.substring(1);
      }
      if (!/^[a-z0-9_-]+$/.test(autoTrigger)) {
        showToast("Trigger shortcut can only contain letters, numbers, hyphens, and underscores.", "error");
        return;
      }
    }

    const stashes = await StashManager.getAll();
    const stash = stashes.find((s) => s.id === id);
    if (stash) {
      if (stash.text !== text) {
        await VersionManager.addVersion(id, text);
      }
      
      await StashManager.update(id, {
        title,
        tags,
        autoTrigger,
        text,
      });

      editDrawer.classList.add("hidden");
      await refreshAll();
      showToast("Prompt updated successfully!");
    } else {
      showToast("Prompt not found.", "error");
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
async function processStashAction(stash: Stash, action: "inject" | "copy") {
  const customVars = PackagingEngine.extractCustomVariables(stash.text);
  if (customVars.length > 0) {
    showVarsDrawer(stash, customVars, action);
  } else {
    await executeStashAction(stash, action);
  }
}

function showVarsDrawer(stash: Stash, vars: string[], action: "inject" | "copy") {
  varsFormBody.innerHTML = "";
  
  vars.forEach((v) => {
    const group = document.createElement("div");
    group.className = "form-group";
    group.innerHTML = `
      <label for="var-${v}">${escapeHtml(v)}</label>
      <input class="popup-var-input" id="var-${v}" data-var="${v}" type="text" placeholder="Value for ${escapeHtml(v)}...">
    `;
    varsFormBody.appendChild(group);
  });
  
  varsSubmitBtn.textContent = action === "inject" ? "Inject Prompt" : "Copy Prompt";
  varsDrawer.classList.remove("hidden");
  
  const firstInput = varsFormBody.querySelector(".popup-var-input") as HTMLInputElement;
  if (firstInput) firstInput.focus();

  const inputs = varsFormBody.querySelectorAll(".popup-var-input") as NodeListOf<HTMLInputElement>;
  inputs.forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        varsSubmitBtn.click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        varsDrawer.classList.add("hidden");
      }
    });
  });
  
  if (activeSubmitListener) {
    varsSubmitBtn.removeEventListener("click", activeSubmitListener);
  }
  
  activeSubmitListener = async () => {
    const popupInputs = varsFormBody.querySelectorAll(".popup-var-input") as NodeListOf<HTMLInputElement>;
    const customValues: Record<string, string> = {};
    popupInputs.forEach((input) => {
      const vName = input.getAttribute("data-var") || "";
      customValues[vName] = input.value;
    });
    
    varsDrawer.classList.add("hidden");
    await executeStashAction(stash, action, customValues);
  };
  
  varsSubmitBtn.addEventListener("click", activeSubmitListener);
}

async function executeStashAction(stash: Stash, action: "inject" | "copy", customValues?: Record<string, string>) {
  let context: { url?: string; title?: string; selection?: string; clipboard?: string } = {};
  try {
    const tabs = await Browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    if (activeTab?.id) {
      const tabContext = await Browser.tabs.sendMessage(activeTab.id, {
        action: "get-page-context"
      });
      if (tabContext) {
        context = tabContext;
      }
    }
  } catch (err) {
    console.warn("Could not get page context from active tab:", err);
  }

  if (!context.url) {
    try {
      const tabs = await Browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (activeTab) {
        context.url = activeTab.url || "";
        context.title = activeTab.title || "";
      }
    } catch (e) {}
  }

  const resolvedText = await PackagingEngine.resolve(stash.text, {
    ...context,
    customValues
  });

  if (action === "inject") {
    let injected = false;
    try {
      const tabs = await Browser.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (activeTab?.id) {
        const response = await Browser.tabs.sendMessage(activeTab.id, {
          action: "inject-prompt",
          text: resolvedText,
        });
        if (response && response.success) {
          injected = true;
          showToast("Prompt injected into page!");
        }
      }
    } catch (err) {
      console.warn("Script context connection failed for injection:", err);
    }

    if (!injected) {
      try {
        await navigator.clipboard.writeText(resolvedText);
        showToast("Copied (no active AI text area found)!");
      } catch (err) {
        showToast("Failed to copy prompt.", "error");
      }
    }
  } else {
    try {
      await navigator.clipboard.writeText(resolvedText);
      showToast("Copied to clipboard!");
    } catch (err) {
      showToast("Failed to copy.", "error");
    }
  }

  await StashManager.incrementUsage(stash.id);
  await refreshAll();
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
          <button class="action-btn edit" title="Edit Stash">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
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
        <span class="card-usage">${stash.usageCount} ${stash.usageCount === 1 ? "use" : "uses"} • ${TokenEstimator.estimate(stash.text)} tokens</span>
      </div>
    `;

    // Click card body triggers copy/inject
    card.addEventListener("click", (e) => {
      // Prevent trigger when clicking action buttons or favorite stars
      const target = e.target as HTMLElement;
      if (target.closest(".card-actions") || target.closest(".card-favorite-star")) {
        return;
      }
      processStashAction(stash, "inject");
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
      processStashAction(stash, "inject");
    });

    const copyBtn = card.querySelector(".copy") as HTMLButtonElement;
    copyBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      processStashAction(stash, "copy");
    });

    const editBtn = card.querySelector(".edit") as HTMLButtonElement;
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditDrawer(stash);
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

function openEditDrawer(stash: Stash) {
  editStashId.value = stash.id;
  editTitleInput.value = stash.title;
  editTagsInput.value = (stash.tags || []).join(", ");
  editAutoTriggerInput.value = stash.autoTrigger || "";
  editContentInput.value = stash.text;
  
  editLength.textContent = stash.text.length.toString();
  editTokens.textContent = TokenEstimator.estimate(stash.text).toString();

  renderVersionTimeline(stash);
  editDrawer.classList.remove("hidden");
}

function renderVersionTimeline(stash: Stash) {
  versionTimeline.innerHTML = "";
  const versions = stash.versions || [];
  if (versions.length === 0) {
    versionTimeline.innerHTML = `<div class="empty-state" style="padding: 10px; font-size:11px;">No version history.</div>`;
    return;
  }

  const sortedVersions = [...versions].reverse();
  sortedVersions.forEach((v) => {
    const item = document.createElement("div");
    item.className = "version-item";
    
    const formattedDate = new Date(v.createdAt).toLocaleString();
    item.innerHTML = `
      <div class="version-meta">
        <span class="version-num">Version ${v.version}</span>
        <span class="version-date">${formattedDate}</span>
      </div>
      <span class="version-chars">${v.text.length} chars</span>
      <div class="version-actions">
        <button class="version-btn restore-btn" title="Restore this version">Restore</button>
      </div>
    `;

    const restoreBtn = item.querySelector(".restore-btn") as HTMLButtonElement;
    restoreBtn.addEventListener("click", () => {
      editContentInput.value = v.text;
      editLength.textContent = v.text.length.toString();
      editTokens.textContent = TokenEstimator.estimate(v.text).toString();
      showToast(`Loaded version ${v.version} into editor!`);
    });

    versionTimeline.appendChild(item);
  });
}
