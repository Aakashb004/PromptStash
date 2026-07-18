import Browser from "../adapters/browser";
import { StashManager } from "../storage/stashManager";
import { PersonaManager } from "../storage/personaManager";
import { FolderManager } from "../storage/folderManager";
import { Stash, Persona, Folder } from "../types";
import { VersionManager } from "../storage/versionManager";
import { PackagingEngine } from "../utils/packagingEngine";
import { TokenEstimator } from "../utils/tokenEstimator";
import { SemanticSearch } from "../utils/semanticSearch";

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

// Tabs & Views
const stashesTabBtn = document.getElementById("stashesTabBtn") as HTMLButtonElement;
const personasTabBtn = document.getElementById("personasTabBtn") as HTMLButtonElement;
const personasList = document.getElementById("personasList") as HTMLDivElement;
const quickStats = document.querySelector(".quick-stats") as HTMLElement;

// Persona Drawer elements
const togglePersonaDrawerBtn = document.getElementById("togglePersonaDrawerBtn") as HTMLButtonElement;
const personaDrawer = document.getElementById("personaDrawer") as HTMLDivElement;
const closePersonaDrawerBtn = document.getElementById("closePersonaDrawerBtn") as HTMLButtonElement;
const savePersonaBtn = document.getElementById("savePersonaBtn") as HTMLButtonElement;
const editPersonaId = document.getElementById("editPersonaId") as HTMLInputElement;
const personaEmojiInput = document.getElementById("personaEmoji") as HTMLInputElement;
const personaNameInput = document.getElementById("personaName") as HTMLInputElement;
const personaDescriptionInput = document.getElementById("personaDescription") as HTMLInputElement;
const personaSystemPromptInput = document.getElementById("personaSystemPrompt") as HTMLTextAreaElement;
const personaDrawerTitle = document.getElementById("personaDrawerTitle") as HTMLHeadingElement;

// Stash Persona dropdowns
const stashPersonaSelect = document.getElementById("stashPersona") as HTMLSelectElement;
const editStashPersonaSelect = document.getElementById("editStashPersona") as HTMLSelectElement;

// Folder UI elements
const stashFolderSelect = document.getElementById("stashFolder") as HTMLSelectElement;
const editStashFolderSelect = document.getElementById("editStashFolder") as HTMLSelectElement;
const addFolderBtn = document.getElementById("addFolderBtn") as HTMLButtonElement;
const editAddFolderBtn = document.getElementById("editAddFolderBtn") as HTMLButtonElement;
const filterChipsContainer = document.getElementById("filterChips") as HTMLDivElement;

let activeTab: "stashes" | "personas" = "stashes";
let activeFilterType: "all" | "pinned" | "folder" | "status" = "all";
let activeFilterValue: string = "";
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

    const personaId = stashPersonaSelect.value || undefined;
    const folderId = stashFolderSelect.value || undefined;

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
      personaId,
      folderId,
      status: "active",
    };

    await StashManager.save(stash);

    // Reset inputs
    titleInput.value = "";
    contentInput.value = "";
    tagsInput.value = "";
    autoTriggerInput.value = "";
    stashPersonaSelect.value = "";
    stashFolderSelect.value = "";
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
    if (activeTab === "stashes") {
      await renderStashes();
    } else {
      await renderPersonas();
    }
  });

  // Tab switcher buttons
  stashesTabBtn.addEventListener("click", () => {
    activeTab = "stashes";
    stashesTabBtn.classList.add("active");
    personasTabBtn.classList.remove("active");
    stashList.classList.remove("hidden");
    personasList.classList.add("hidden");
    quickStats.style.display = "grid";
    toggleDrawerBtn.classList.remove("hidden");
    togglePersonaDrawerBtn.classList.add("hidden");
    searchInput.placeholder = "Search stashes by title or tags...";
    searchInput.value = "";
    currentSearch = "";
    refreshAll();
  });

  personasTabBtn.addEventListener("click", () => {
    activeTab = "personas";
    stashesTabBtn.classList.remove("active");
    personasTabBtn.classList.add("active");
    stashList.classList.add("hidden");
    personasList.classList.remove("hidden");
    quickStats.style.display = "none";
    toggleDrawerBtn.classList.add("hidden");
    togglePersonaDrawerBtn.classList.remove("hidden");
    searchInput.placeholder = "Search personas by name or description...";
    searchInput.value = "";
    currentSearch = "";
    refreshAll();
  });

  // Open Persona Drawer
  togglePersonaDrawerBtn.addEventListener("click", () => {
    personaDrawerTitle.textContent = "Create Persona";
    editPersonaId.value = "";
    personaEmojiInput.value = "";
    personaNameInput.value = "";
    personaDescriptionInput.value = "";
    personaSystemPromptInput.value = "";
    personaDrawer.classList.remove("hidden");
  });

  closePersonaDrawerBtn.addEventListener("click", () => {
    personaDrawer.classList.add("hidden");
  });

  // Save Persona Handler
  savePersonaBtn.addEventListener("click", async () => {
    const id = editPersonaId.value;
    const emoji = personaEmojiInput.value.trim() || "🤖";
    const name = personaNameInput.value.trim();
    const description = personaDescriptionInput.value.trim();
    const systemPrompt = personaSystemPromptInput.value.trim();

    if (!name || !systemPrompt) {
      showToast("Name and System Prompt are required.", "error");
      return;
    }

    if (id) {
      await PersonaManager.update(id, {
        emoji,
        name,
        description,
        systemPrompt,
      });
      showToast("Persona updated successfully!");
    } else {
      const persona: Persona = {
        id: crypto.randomUUID(),
        emoji,
        name,
        description,
        systemPrompt,
        timestamp: Date.now(),
      };
      await PersonaManager.save(persona);
      showToast("Persona created successfully!");
    }

    personaDrawer.classList.add("hidden");
    await refreshAll();
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

  // Folder creation trigger
  addFolderBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleCreateFolder();
  });
  editAddFolderBtn.addEventListener("click", (e) => {
    e.preventDefault();
    handleCreateFolder();
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

    const personaId = editStashPersonaSelect.value || undefined;
    const folderId = editStashFolderSelect.value || undefined;

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
        personaId,
        folderId,
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
  await populatePersonaDropdowns();
  await populateFolderDropdowns();
  await renderFilterChips();
  if (activeTab === "stashes") {
    await renderStashes();
  } else {
    await renderPersonas();
  }
}

async function populatePersonaDropdowns() {
  const personas = await PersonaManager.getAll();
  const currentStashVal = stashPersonaSelect.value;
  const currentEditVal = editStashPersonaSelect.value;

  const optionsHtml = [
    '<option value="">None (No system instructions)</option>',
    ...personas.map((p) => `<option value="${p.id}">${escapeHtml(p.emoji)} ${escapeHtml(p.name)}</option>`)
  ].join("\n");

  stashPersonaSelect.innerHTML = optionsHtml;
  editStashPersonaSelect.innerHTML = optionsHtml;

  stashPersonaSelect.value = currentStashVal;
  editStashPersonaSelect.value = currentEditVal;
}

async function renderPersonas() {
  let personas = await PersonaManager.getAll();

  if (currentSearch) {
    personas = SemanticSearch.search(personas, currentSearch, (p) => ({
      title: p.name,
      text: p.systemPrompt,
      tags: [p.description || ""]
    }));
  }

  personasList.innerHTML = "";

  if (personas.length === 0) {
    personasList.innerHTML = `
      <div class="empty-state">
        <svg class="empty-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="8" y1="12" x2="16" y2="12"></line>
        </svg>
        <h4>No personas found</h4>
        <p>${currentSearch ? "Refine your search parameters." : "Add a new AI Persona to customize context!"}</p>
      </div>
    `;
    return;
  }

  personas.forEach((persona) => {
    const card = document.createElement("div");
    card.className = "persona-card";
    card.innerHTML = `
      <div class="persona-emoji">${escapeHtml(persona.emoji)}</div>
      <div class="persona-info">
        <div class="persona-name">${escapeHtml(persona.name)}</div>
        <div class="persona-desc">${escapeHtml(persona.description || "No description provided.")}</div>
        <div class="persona-badge">System Persona</div>
      </div>
      <div class="card-actions">
        <button class="edit-btn icon-only-btn" title="Edit Persona">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
        <button class="delete-btn icon-only-btn" title="Delete Persona">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    `;

    const editBtn = card.querySelector(".edit-btn") as HTMLButtonElement;
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openPersonaEditDrawer(persona);
    });

    const deleteBtn = card.querySelector(".delete-btn") as HTMLButtonElement;
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm(`Are you sure you want to delete the "${persona.name}" persona?`)) {
        await PersonaManager.delete(persona.id);
        showToast("Persona deleted.");
        await refreshAll();
      }
    });

    personasList.appendChild(card);
  });
}

function openPersonaEditDrawer(persona: Persona) {
  personaDrawerTitle.textContent = "Edit Persona";
  editPersonaId.value = persona.id;
  personaEmojiInput.value = persona.emoji;
  personaNameInput.value = persona.name;
  personaDescriptionInput.value = persona.description || "";
  personaSystemPromptInput.value = persona.systemPrompt;
  personaDrawer.classList.remove("hidden");
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

  let systemPrompt: string | undefined = undefined;
  if (stash.personaId) {
    const personas = await PersonaManager.getAll();
    const persona = personas.find((p) => p.id === stash.personaId);
    if (persona) {
      systemPrompt = persona.systemPrompt;
    }
  }

  const resolvedText = await PackagingEngine.resolve(stash.text, {
    ...context,
    customValues,
    systemPrompt
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
  const folders = await FolderManager.getAll();

  // 1. Filter by search query if any
  if (currentSearch) {
    stashes = SemanticSearch.search(stashes, currentSearch, (s) => ({
      title: s.title,
      text: s.text,
      tags: s.tags
    }));
  }

  // 2. Filter by status / folder / pinning
  if (activeFilterType === "all") {
    stashes = stashes.filter((s) => s.status === "active");
  } else if (activeFilterType === "pinned") {
    stashes = stashes.filter((s) => s.status === "active" && s.favorite);
  } else if (activeFilterType === "folder") {
    stashes = stashes.filter((s) => s.status === "active" && s.folderId === activeFilterValue);
  } else if (activeFilterType === "status") {
    stashes = stashes.filter((s) => s.status === activeFilterValue);
  }

  // 3. Sort Pinned (Favorites) to the top unless strictly in pinned or status views
  if (activeFilterType !== "pinned" && activeFilterType !== "status") {
    stashes.sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return b.timestamp - a.timestamp;
    });
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

    let folderBadge = "";
    if (stash.folderId) {
      const folder = folders.find((f) => f.id === stash.folderId);
      if (folder) {
        folderBadge = `<span class="card-folder-badge">${escapeHtml(folder.emoji)} ${escapeHtml(folder.name)}</span>`;
      }
    }

    let statusBadge = "";
    if (stash.status && stash.status !== "active") {
      statusBadge = `<span class="card-status-badge ${stash.status}">${stash.status}</span>`;
    }

    let actionButtons = "";
    if (stash.status === "trash") {
      actionButtons = `
        <button class="restore-trash icon-btn" title="Restore Prompt">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <polyline points="3 3 3 8 8 8"></polyline>
          </svg>
        </button>
        <button class="permanent-delete icon-btn" title="Permanently Delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;
    } else {
      const isArchived = stash.status === "archived";
      actionButtons = `
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
        <button class="action-btn archive" title="${isArchived ? "Unarchive Prompt" : "Archive Prompt"}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="21 8 21 21 3 21 3 8"></polyline>
            <rect x="1" y="3" width="22" height="5"></rect>
            <line x1="10" y1="12" x2="14" y2="12"></line>
          </svg>
        </button>
        <button class="action-btn delete" title="Move to Trash">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      `;
    }

    card.innerHTML = `
      <div class="card-header">
        <div class="card-title-area">
          <span class="card-favorite-star card-pin-btn ${stash.favorite ? "pinned" : ""}" title="Favorite">
            ${stash.favorite ? "★" : "☆"}
          </span>
          <span class="card-title" title="${escapeHtml(stash.title)}">${escapeHtml(stash.title)}</span>
        </div>
        <div class="card-actions">
          ${actionButtons}
        </div>
      </div>
      <div class="card-content">${escapeHtml(stash.text)}</div>
      <div class="card-footer">
        <div class="card-tags">
          ${folderBadge}
          ${statusBadge}
          ${tagsHtml}
        </div>
        <span class="card-usage">${stash.usageCount} ${stash.usageCount === 1 ? "use" : "uses"} • ${TokenEstimator.estimate(stash.text)} tokens</span>
      </div>
    `;

    // Click card body triggers copy/inject (only if not trashed)
    card.addEventListener("click", (e) => {
      if (stash.status === "trash") return;
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
      showToast(stash.favorite ? "Removed from Pinned" : "Pinned to top");
    });

    // Action handlers depending on status
    if (stash.status === "trash") {
      const restoreTrashBtn = card.querySelector(".restore-trash") as HTMLButtonElement;
      restoreTrashBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await StashManager.updateStatus(stash.id, "active");
        showToast("Prompt restored to active!");
        await refreshAll();
      });

      const permDeleteBtn = card.querySelector(".permanent-delete") as HTMLButtonElement;
      permDeleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to permanently delete "${stash.title}"?`)) {
          await StashManager.permanentlyDelete(stash.id);
          showToast("Prompt permanently deleted.");
          await refreshAll();
        }
      });
    } else {
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

      const archiveBtn = card.querySelector(".archive") as HTMLButtonElement;
      archiveBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const isArchived = stash.status === "archived";
        await StashManager.updateStatus(stash.id, isArchived ? "active" : "archived");
        showToast(isArchived ? "Prompt unarchived" : "Prompt archived");
        await refreshAll();
      });

      const deleteBtn = card.querySelector(".delete") as HTMLButtonElement;
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await StashManager.updateStatus(stash.id, "trash");
        showToast("Moved prompt to Trash.");
        await refreshAll();
      });
    }

    stashList.appendChild(card);
  });
}

async function populateFolderDropdowns() {
  const folders = await FolderManager.getAll();
  const currentStashVal = stashFolderSelect.value;
  const currentEditVal = editStashFolderSelect.value;

  const optionsHtml = [
    '<option value="">None (No folder)</option>',
    ...folders.map((f) => `<option value="${f.id}">${escapeHtml(f.emoji)} ${escapeHtml(f.name)}</option>`)
  ].join("\n");

  stashFolderSelect.innerHTML = optionsHtml;
  editStashFolderSelect.innerHTML = optionsHtml;

  stashFolderSelect.value = currentStashVal;
  editStashFolderSelect.value = currentEditVal;
}

async function renderFilterChips() {
  if (activeTab !== "stashes") {
    filterChipsContainer.parentElement?.classList.add("hidden");
    return;
  }
  filterChipsContainer.parentElement?.classList.remove("hidden");

  const folders = await FolderManager.getAll();
  filterChipsContainer.innerHTML = "";

  const chips = [
    { type: "all", value: "", label: "✨ All" },
    { type: "pinned", value: "", label: "⭐ Pinned" },
    ...folders.map((f) => ({ type: "folder", value: f.id, label: `${f.emoji} ${f.name}` })),
    { type: "status", value: "archived", label: "📦 Archived" },
    { type: "status", value: "trash", label: "🗑️ Trash" }
  ];

  chips.forEach((c) => {
    const active = activeFilterType === c.type && activeFilterValue === c.value;
    const btn = document.createElement("button");
    btn.className = `chip ${active ? "active" : ""}`;
    btn.textContent = c.label;
    btn.addEventListener("click", () => {
      activeFilterType = c.type as any;
      activeFilterValue = c.value;
      refreshAll();
    });
    filterChipsContainer.appendChild(btn);
  });
}

async function handleCreateFolder() {
  const name = prompt("Enter folder name (e.g. Work, Writing):");
  if (!name) return;
  const emoji = prompt("Enter folder emoji icon (e.g. 💼, 📝):") || "📁";
  
  const folder: Folder = {
    id: crypto.randomUUID(),
    name,
    emoji,
    timestamp: Date.now(),
  };

  await FolderManager.save(folder);
  showToast("Folder created successfully!");
  await refreshAll();
}

function openEditDrawer(stash: Stash) {
  editStashId.value = stash.id;
  editTitleInput.value = stash.title;
  editTagsInput.value = (stash.tags || []).join(", ");
  editAutoTriggerInput.value = stash.autoTrigger || "";
  editContentInput.value = stash.text;
  editStashPersonaSelect.value = stash.personaId || "";
  editStashFolderSelect.value = stash.folderId || "";
  
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
