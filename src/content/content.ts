import Browser from "../adapters/browser";
import { StashManager } from "../storage/stashManager";
import { Stash } from "../types";
import { PackagingEngine } from "../utils/packagingEngine";
import { SemanticSearch } from "../utils/semanticSearch";

console.log("PromptStash AI Integration Service Active");

let overlayHost: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let activeStashes: Stash[] = [];
let filteredStashes: Stash[] = [];
let selectedIndex = 0;
let lastFocusedInput: HTMLElement | null = null;

const PALETTE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  
  :host {
    all: initial;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
  .ps-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(4, 6, 12, 0.4);
    backdrop-filter: blur(6px);
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 15vh;
    pointer-events: auto;
    z-index: 9999999;
  }
  .ps-dialog {
    width: 520px;
    max-height: 540px;
    background-color: #080c14;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: psFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes psFadeIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .ps-search-container {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    gap: 10px;
  }
  .ps-search-icon {
    width: 16px;
    height: 16px;
    color: #64748b;
    flex-shrink: 0;
  }
  .ps-search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #f8fafc;
    font-size: 13px;
    font-family: inherit;
  }
  .ps-search-input::placeholder {
    color: #475569;
  }
  .ps-context-badge {
    font-size: 9px;
    font-weight: 700;
    color: #818cf8;
    background: rgba(99, 102, 241, 0.1);
    border: 1px solid rgba(99, 102, 241, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    flex-shrink: 0;
  }
  .ps-results {
    flex: 1;
    overflow-y: auto;
    padding: 6px;
  }
  .ps-item {
    display: flex;
    flex-direction: column;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    margin-bottom: 2px;
  }
  .ps-item:last-child {
    margin-bottom: 0;
  }
  .ps-item.selected {
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }
  .ps-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }
  .ps-item-title {
    font-size: 12px;
    font-weight: 600;
    color: #f8fafc;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 320px;
  }
  .ps-item.selected .ps-item-title {
    color: #ffffff;
  }
  .ps-item-trigger {
    font-size: 9px;
    font-weight: 700;
    background: rgba(255, 255, 255, 0.05);
    color: #64748b;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .ps-item.selected .ps-item-trigger {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
  }
  .ps-item-content {
    font-size: 11px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.4;
  }
  .ps-item.selected .ps-item-content {
    color: rgba(255, 255, 255, 0.85);
  }
  .ps-item-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
  }
  .ps-item-tags {
    display: flex;
    gap: 4px;
  }
  .ps-item-tag {
    font-size: 9px;
    background: rgba(99, 102, 241, 0.08);
    color: #818cf8;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .ps-item.selected .ps-item-tag {
    background: rgba(255, 255, 255, 0.15);
    color: #ffffff;
  }
  .ps-item-use {
    font-size: 9px;
    color: #475569;
  }
  .ps-item.selected .ps-item-use {
    color: rgba(255, 255, 255, 0.7);
  }
  .ps-footer {
    padding: 8px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: #05080e;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #64748b;
    font-weight: 500;
  }
  .ps-footer-left {
    display: flex;
    gap: 12px;
  }
  .ps-key {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: #94a3b8;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: 600;
  }
  .ps-empty {
    padding: 32px 16px;
    text-align: center;
    color: #475569;
    font-size: 12px;
  }
  .ps-inline-toast {
    position: absolute;
    bottom: 50px;
    left: 50%;
    transform: translateX(-50%);
    background: #10b981;
    color: white;
    font-size: 11px;
    padding: 6px 12px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    animation: psFadeIn 0.15s ease;
  }
  .ps-form {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    height: 100%;
    max-height: 100%;
  }
  .ps-form-title {
    font-size: 13px;
    font-weight: 600;
    color: #f8fafc;
    margin-bottom: 4px;
  }
  .ps-form-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .ps-form-label {
    font-size: 10px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .ps-form-input {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #f8fafc;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    transition: all 0.15s ease;
  }
  .ps-form-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  }
  .ps-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }
  .ps-btn {
    font-size: 12px;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    border: none;
    font-family: inherit;
    transition: all 0.15s ease;
  }
  .ps-btn-primary {
    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
    color: #ffffff;
  }
  .ps-btn-primary:hover {
    opacity: 0.9;
  }
  .ps-btn-secondary {
    background: transparent;
    color: #64748b;
  }
  .ps-btn-secondary:hover {
    color: #f8fafc;
  }
`;

function isPromptInput(el: HTMLElement): boolean {
  if (!el) return false;

  if (el instanceof HTMLInputElement) {
    const type = el.type.toLowerCase();
    if (type !== "text" && type !== "search") return false;
  }

  const isTextArea = el instanceof HTMLTextAreaElement;
  const isContentEditable = el.isContentEditable;
  const isTextBoxRole = el.getAttribute("role") === "textbox";

  if (!isTextArea && !isContentEditable && !isTextBoxRole) {
    return false;
  }

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  return true;
}

// Focus listener to keep track of active prompt elements
document.addEventListener("focusin", (e) => {
  const target = e.target as HTMLElement;
  if (isPromptInput(target)) {
    lastFocusedInput = target;
  }
});

document.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  if (isPromptInput(target)) {
    lastFocusedInput = target;
  }
});

// Platform context detection
function getContextName(): string {
  const host = location.hostname.toLowerCase();
  if (host.includes("chatgpt.com")) return "ChatGPT";
  if (host.includes("claude.ai")) return "Claude";
  if (host.includes("gemini.google.com")) return "Gemini";
  if (host.includes("deepseek.com")) return "DeepSeek";
  if (host.includes("grok.com")) return "Grok";
  if (host.includes("copilot.microsoft.com") || host.includes("copilot.com")) return "Copilot";
  if (host.includes("poe.com")) return "Poe";
  if (host.includes("perplexity.ai")) return "Perplexity";
  if (host.includes("huggingface.co")) return "HuggingFace";
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    if (document.title.toLowerCase().includes("open webui")) return "Open WebUI";
    return "Local Dev";
  }
  return "General Context";
}

// Locate primary input field heuristically
function findPrimaryPromptInput(): HTMLElement | null {
  if (lastFocusedInput && document.body.contains(lastFocusedInput)) {
    return lastFocusedInput;
  }

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>("textarea, [contenteditable='true'], [role='textbox']")
  );

  const visibleCandidates = candidates.filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  if (visibleCandidates.length === 0) return null;
  if (visibleCandidates.length === 1) return visibleCandidates[0];

  let bestCandidate: HTMLElement | null = null;
  let highestScore = -1;

  for (const el of visibleCandidates) {
    let score = 0;
    if (el instanceof HTMLTextAreaElement) score += 10;
    if (el.isContentEditable) score += 8;

    const placeholder = (
      el.getAttribute("placeholder") ||
      el.getAttribute("aria-label") ||
      ""
    ).toLowerCase();

    if (
      placeholder.includes("message") ||
      placeholder.includes("ask") ||
      placeholder.includes("prompt") ||
      placeholder.includes("chat") ||
      placeholder.includes("grok") ||
      placeholder.includes("deepseek") ||
      placeholder.includes("copilot")
    ) {
      score += 25;
    }

    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight / 2) {
      score += 15;
    }

    const id = el.id.toLowerCase();
    const className = el.className.toLowerCase();
    if (id.includes("search") || className.includes("search")) score -= 10;
    if (id.includes("login") || id.includes("email") || id.includes("password")) score -= 30;

    if (score > highestScore) {
      highestScore = score;
      bestCandidate = el;
    }
  }

  return bestCandidate;
}

// Inject text into target and fire events to notify frameworks
function injectText(el: HTMLElement, text: string, mode: "replace" | "append" | "prepend" | "cursor"): boolean {
  try {
    el.focus();

    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      const val = el.value;
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;

      let newTextVal = "";
      let newCursorPos = 0;

      if (mode === "replace") {
        newTextVal = text;
        newCursorPos = text.length;
      } else if (mode === "append") {
        newTextVal = val ? val + "\n\n" + text : text;
        newCursorPos = newTextVal.length;
      } else if (mode === "prepend") {
        newTextVal = val ? text + "\n\n" + val : text;
        newCursorPos = text.length;
      } else {
        // Cursor insertion
        newTextVal = val.slice(0, start) + text + val.slice(end);
        newCursorPos = start + text.length;
      }

      // Bypass React state tracking using prototype descriptors
      const nativeValueSetter = Object.getOwnPropertyDescriptor(
        el instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype,
        "value"
      )?.set;

      if (nativeValueSetter) {
        nativeValueSetter.call(el, newTextVal);
      } else {
        el.value = newTextVal;
      }

      el.selectionStart = el.selectionEnd = newCursorPos;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    } else if (el.isContentEditable) {
      if (mode === "replace") {
        // Select all text and replace
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(el);
          selection.removeAllRanges();
          selection.addRange(range);
          document.execCommand("delete", false);
        }
        document.execCommand("insertText", false, text);
      } else if (mode === "append") {
        // Move selection range to end and insert
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        // Add newlines if there is content already
        const hasContent = el.innerText.trim().length > 0;
        document.execCommand("insertText", false, hasContent ? "\n\n" + text : text);
      } else if (mode === "prepend") {
        const selection = window.getSelection();
        if (selection) {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        const hasContent = el.innerText.trim().length > 0;
        document.execCommand("insertText", false, hasContent ? text + "\n\n" : text);
      } else {
        // Cursor insertion at active position
        document.execCommand("insertText", false, text);
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }
  } catch (err) {
    console.error("PromptStash text injection failed:", err);
  }
  return false;
}

// Show Shadow DOM notification toast
function showInlineToast(message: string) {
  if (!shadowRoot) return;
  const overlay = shadowRoot.querySelector(".ps-overlay");
  if (!overlay) return;

  const toast = document.createElement("div");
  toast.className = "ps-inline-toast";
  toast.textContent = message;
  overlay.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 1800);
}

// Render dynamic results inside Command Palette Shadow DOM
function renderOverlayList() {
  if (!shadowRoot) return;
  const resultsDiv = shadowRoot.querySelector(".ps-results") as HTMLDivElement;
  if (!resultsDiv) return;

  resultsDiv.innerHTML = "";

  if (filteredStashes.length === 0) {
    resultsDiv.innerHTML = `<div class="ps-empty">No matching prompts found.</div>`;
    return;
  }

  filteredStashes.forEach((stash, index) => {
    const item = document.createElement("div");
    item.className = `ps-item ${index === selectedIndex ? "selected" : ""}`;

    const tagsHtml = stash.tags
      .slice(0, 3)
      .map((t) => `<span class="ps-item-tag">${escapeHtml(t)}</span>`)
      .join("");

    const shortcutText = stash.autoTrigger ? `/${stash.autoTrigger}` : "";

    item.innerHTML = `
      <div class="ps-item-header">
        <span class="ps-item-title">${escapeHtml(stash.title)}</span>
        ${shortcutText ? `<span class="ps-item-trigger">${escapeHtml(shortcutText)}</span>` : ""}
      </div>
      <div class="ps-item-content">${escapeHtml(stash.text)}</div>
      <div class="ps-item-footer">
        <div class="ps-item-tags">${tagsHtml}</div>
        <span class="ps-item-use">${stash.usageCount} uses</span>
      </div>
    `;

    item.addEventListener("click", async () => {
      await handleStashSelection(stash, "replace");
    });

    resultsDiv.appendChild(item);
  });

  // Keep selected item scrolled into view
  const selectedItem = resultsDiv.querySelector(".ps-item.selected") as HTMLElement;
  if (selectedItem) {
    selectedItem.scrollIntoView({ block: "nearest" });
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function ensureOverlayCreated() {
  if (overlayHost) return;

  overlayHost = document.createElement("div");
  overlayHost.id = "promptstash-shadow-host";
  overlayHost.style.cssText = "position: fixed; z-index: 2147483647; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none;";
  document.body.appendChild(overlayHost);

  shadowRoot = overlayHost.attachShadow({ mode: "open" });

  // Styles
  const style = document.createElement("style");
  style.textContent = PALETTE_CSS;
  shadowRoot.appendChild(style);

  // Overlay container
  const overlay = document.createElement("div");
  overlay.className = "ps-overlay";
  
  // Close when clicking overlay background directly
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hideCommandPalette();
  });

  // Modal Dialog
  const dialog = document.createElement("div");
  dialog.className = "ps-dialog";

  const currentPlatform = getContextName();

  dialog.innerHTML = `
    <div class="ps-search-view" style="display: flex; flex-direction: column; height: 100%;">
      <div class="ps-search-container">
        <svg class="ps-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input class="ps-search-input" type="text" placeholder="Search prompts...">
        <span class="ps-context-badge">${currentPlatform} Context</span>
      </div>
      <div class="ps-results"></div>
      <div class="ps-footer">
        <div class="ps-footer-left">
          <span><span class="ps-key">↵</span> Replace</span>
          <span><span class="ps-key">⇧↵</span> Append</span>
          <span><span class="ps-key">⌥↵</span> Prepend</span>
        </div>
        <div>
          <span><span class="ps-key">Tab</span> Copy</span>
          <span><span class="ps-key">Esc</span> Close</span>
        </div>
      </div>
    </div>
    <div class="ps-form-view" style="display: none; height: 100%;"></div>
  `;

  overlay.appendChild(dialog);
  shadowRoot.appendChild(overlay);

  const searchInput = dialog.querySelector(".ps-search-input") as HTMLInputElement;
  searchInput.focus();

  // Search input change filtering
  searchInput.addEventListener("input", () => {
    const query = searchInput.value;
    filteredStashes = SemanticSearch.search(activeStashes, query, (s) => ({
      title: s.title,
      text: s.text,
      tags: s.tags
    }));
    selectedIndex = 0;
    renderOverlayList();
  });

  // Key event bindings for overlay modal
  searchInput.addEventListener("keydown", async (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = filteredStashes.length ? (selectedIndex + 1) % filteredStashes.length : 0;
      renderOverlayList();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = filteredStashes.length ? (selectedIndex - 1 + filteredStashes.length) % filteredStashes.length : 0;
      renderOverlayList();
    } else if (e.key === "Escape") {
      e.preventDefault();
      hideCommandPalette();
    } else if (e.key === "Tab") {
      e.preventDefault(); // Prevent focus cycling out
      if (filteredStashes.length && filteredStashes[selectedIndex]) {
        const stash = filteredStashes[selectedIndex];
        try {
          const context = await gatherPageContext();
          const systemPrompt = await getPersonaSystemPrompt(stash.personaId);
          const resolvedText = await PackagingEngine.resolve(stash.text, {
            ...context,
            systemPrompt
          });
          await navigator.clipboard.writeText(resolvedText);
          showInlineToast("Copied to clipboard!");
        } catch (err) {
          showInlineToast("Copy failed.");
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredStashes.length && filteredStashes[selectedIndex]) {
        const stash = filteredStashes[selectedIndex];
        let mode: "replace" | "append" | "prepend" = "replace";
        if (e.shiftKey) mode = "append";
        if (e.altKey) mode = "prepend";

        await handleStashSelection(stash, mode);
      }
    }
  });
}

function showCommandPalette() {
  ensureOverlayCreated();
  
  if (overlayHost) {
    overlayHost.style.display = "block";
    const searchView = shadowRoot?.querySelector(".ps-search-view") as HTMLDivElement;
    const formView = shadowRoot?.querySelector(".ps-form-view") as HTMLDivElement;
    if (searchView && formView) {
      formView.style.display = "none";
      formView.innerHTML = "";
      searchView.style.display = "block";
    }

    const searchInput = shadowRoot?.querySelector(".ps-search-input") as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
  }

  filteredStashes = [...activeStashes];
  selectedIndex = 0;
  renderOverlayList();
}

function hideCommandPalette() {
  if (overlayHost) {
    overlayHost.style.display = "none";
    if (shadowRoot) {
      const searchView = shadowRoot.querySelector(".ps-search-view") as HTMLDivElement;
      const formView = shadowRoot.querySelector(".ps-form-view") as HTMLDivElement;
      if (searchView && formView) {
        formView.style.display = "none";
        formView.innerHTML = "";
        searchView.style.display = "block";
      }
    }
  }
}

function scrapePageText(): string {
  const selection = window.getSelection()?.toString().trim();
  if (selection) return selection;

  const selectors = ["article", "main", "[role='main']", ".main-content", ".post-content"];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el instanceof HTMLElement) {
      const text = el.innerText.trim();
      if (text.length > 50) return cleanText(text);
    }
  }

  const paragraphs = Array.from(document.querySelectorAll("p, h1, h2, h3, li"));
  const textBlocks = paragraphs
    .map((p) => (p as HTMLElement).innerText.trim())
    .filter((txt) => txt.length > 15);
    
  if (textBlocks.length > 0) {
    return cleanText(textBlocks.join("\n\n"));
  }

  return cleanText(document.body.innerText);
}

function cleanText(text: string): string {
  return text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function showHarvestForm(pageTitle: string, harvestedText: string) {
  ensureOverlayCreated();

  if (overlayHost) {
    overlayHost.style.display = "block";
  }

  const searchView = shadowRoot?.querySelector(".ps-search-view") as HTMLDivElement;
  const formView = shadowRoot?.querySelector(".ps-form-view") as HTMLDivElement;
  if (!searchView || !formView) return;

  searchView.style.display = "none";
  formView.style.display = "block";

  formView.innerHTML = `
    <div class="ps-form">
      <div class="ps-form-title">Harvest Page Context</div>
      <div class="ps-form-group">
        <label class="ps-form-label" for="harvest-title">Stash Title</label>
        <input class="ps-form-input" id="harvest-title" type="text" value="Harvested: ${escapeHtml(pageTitle)}">
      </div>
      <div class="ps-form-group">
        <label class="ps-form-label" for="harvest-tags">Tags</label>
        <input class="ps-form-input" id="harvest-tags" type="text" value="harvested">
      </div>
      <div class="ps-form-group">
        <label class="ps-form-label" for="harvest-trigger">Auto Trigger Shortcut</label>
        <input class="ps-form-input" id="harvest-trigger" type="text" placeholder="e.g. shortcut (optional)">
      </div>
      <div class="ps-form-group" style="flex: 1; display: flex; flex-direction: column;">
        <label class="ps-form-label" for="harvest-text">Harvested Text</label>
        <textarea class="ps-form-input" id="harvest-text" style="flex: 1; min-height: 80px; resize: none; font-family: inherit; font-size: 11px;">${escapeHtml(harvestedText)}</textarea>
      </div>
      <div class="ps-form-actions">
        <button class="ps-btn ps-btn-secondary ps-btn-cancel">Discard</button>
        <button class="ps-btn ps-btn-primary ps-btn-save">Save Stash</button>
      </div>
    </div>
  `;

  const titleInput = formView.querySelector("#harvest-title") as HTMLInputElement;
  if (titleInput) titleInput.focus();

  const cancelBtn = formView.querySelector(".ps-btn-cancel") as HTMLButtonElement;
  cancelBtn.addEventListener("click", () => {
    hideCommandPalette();
  });

  const saveBtn = formView.querySelector(".ps-btn-save") as HTMLButtonElement;
  saveBtn.addEventListener("click", async () => {
    const title = (formView.querySelector("#harvest-title") as HTMLInputElement).value.trim();
    const rawTags = (formView.querySelector("#harvest-tags") as HTMLInputElement).value.trim();
    const text = (formView.querySelector("#harvest-text") as HTMLTextAreaElement).value.trim();
    let autoTrigger = (formView.querySelector("#harvest-trigger") as HTMLInputElement).value.trim().toLowerCase();

    if (!title || !text) {
      showInlineToast("Title and content are required!");
      return;
    }

    const tags = rawTags
      ? rawTags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
      : ["harvested"];

    if (autoTrigger) {
      if (autoTrigger.startsWith("/")) {
        autoTrigger = autoTrigger.substring(1);
      }
      if (!/^[a-z0-9_-]+$/.test(autoTrigger)) {
        showInlineToast("Invalid trigger format!");
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
    hideCommandPalette();
    showInlineToast("Stash saved successfully!");
  });
}

// Global commands receiver
Browser.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
  if (message.action === "trigger-stash") {
    StashManager.getAll().then((stashes) => {
      activeStashes = stashes;
      showCommandPalette();
    });
    sendResponse({ success: true });
  } else if (message.action === "inject-prompt") {
    const inputEl = findPrimaryPromptInput();
    if (!inputEl) {
      sendResponse({ success: false, reason: "no-input" });
      return true;
    }
    const success = injectText(inputEl, message.text, "replace");
    sendResponse({ success });
  } else if (message.action === "get-page-context") {
    gatherPageContext().then((context) => {
      sendResponse(context);
    }).catch((err) => {
      console.error("Failed to gather page context:", err);
      sendResponse({ url: window.location.href, title: document.title, selection: "", clipboard: "" });
    });
    return true; // async
  } else if (message.action === "harvest-context") {
    const text = scrapePageText();
    showHarvestForm(document.title, text);
    sendResponse({ success: true });
  }
  return true;
});

async function getPersonaSystemPrompt(personaId?: string): Promise<string | undefined> {
  if (!personaId) return undefined;
  try {
    const result = await Browser.storage.local.get({ personas: [] });
    const personas = result.personas as any[];
    const persona = personas.find(p => p.id === personaId);
    return persona ? persona.systemPrompt : undefined;
  } catch (err) {
    console.warn("Failed to get persona system prompt:", err);
    return undefined;
  }
}

async function getClipboardText(): Promise<string> {
  try {
    return await navigator.clipboard.readText();
  } catch (err) {
    console.warn("Could not read clipboard in content script:", err);
    return "";
  }
}

async function gatherPageContext(): Promise<{ url: string; title: string; selection: string; clipboard: string }> {
  const selection = window.getSelection()?.toString() || "";
  const clipboard = await getClipboardText();
  return {
    url: window.location.href,
    title: document.title,
    selection,
    clipboard
  };
}

async function handleStashSelection(stash: Stash, mode: "replace" | "append" | "prepend" = "replace") {
  const customVars = PackagingEngine.extractCustomVariables(stash.text);
  
  if (customVars.length > 0) {
    showVariablesForm(stash, customVars, mode);
  } else {
    const context = await gatherPageContext();
    const systemPrompt = await getPersonaSystemPrompt(stash.personaId);
    const resolvedText = await PackagingEngine.resolve(stash.text, {
      ...context,
      systemPrompt
    });
    
    const inputEl = findPrimaryPromptInput();
    if (inputEl) {
      injectText(inputEl, resolvedText, mode);
      await StashManager.incrementUsage(stash.id);
      hideCommandPalette();
    } else {
      showInlineToast("No target textbox found!");
    }
  }
}

function showVariablesForm(stash: Stash, vars: string[], mode: "replace" | "append" | "prepend") {
  if (!shadowRoot) return;
  const searchView = shadowRoot.querySelector(".ps-search-view") as HTMLDivElement;
  const formView = shadowRoot.querySelector(".ps-form-view") as HTMLDivElement;
  if (!searchView || !formView) return;

  searchView.style.display = "none";
  formView.style.display = "block";
  
  formView.innerHTML = `
    <div class="ps-form">
      <div class="ps-form-title">Variables for "${escapeHtml(stash.title)}"</div>
      ${vars.map((v) => `
        <div class="ps-form-group">
          <label class="ps-form-label" for="var-${v}">${escapeHtml(v)}</label>
          <input class="ps-form-input ps-var-input" id="var-${v}" data-var="${v}" type="text" placeholder="Enter value for ${escapeHtml(v)}...">
        </div>
      `).join("")}
      <div class="ps-form-actions">
        <button class="ps-btn ps-btn-secondary ps-btn-cancel">Cancel</button>
        <button class="ps-btn ps-btn-primary ps-btn-submit">Inject</button>
      </div>
    </div>
  `;
  
  const firstInput = formView.querySelector(".ps-var-input") as HTMLInputElement;
  if (firstInput) firstInput.focus();
  
  const cancelBtn = formView.querySelector(".ps-btn-cancel") as HTMLButtonElement;
  const cancelForm = () => {
    formView.style.display = "none";
    formView.innerHTML = "";
    searchView.style.display = "block";
    
    const searchInput = searchView.querySelector(".ps-search-input") as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
    filteredStashes = [...activeStashes];
    selectedIndex = 0;
    renderOverlayList();
  };
  
  cancelBtn.addEventListener("click", cancelForm);
  
  const submitBtn = formView.querySelector(".ps-btn-submit") as HTMLButtonElement;
  const submitForm = async () => {
    const inputs = formView.querySelectorAll(".ps-var-input") as NodeListOf<HTMLInputElement>;
    const customValues: Record<string, string> = {};
    inputs.forEach((input) => {
      const vName = input.getAttribute("data-var") || "";
      customValues[vName] = input.value;
    });
    
    const context = await gatherPageContext();
    const systemPrompt = await getPersonaSystemPrompt(stash.personaId);
    const resolvedText = await PackagingEngine.resolve(stash.text, {
      ...context,
      customValues,
      systemPrompt
    });
    
    const inputEl = findPrimaryPromptInput();
    if (inputEl) {
      injectText(inputEl, resolvedText, mode);
      await StashManager.incrementUsage(stash.id);
      hideCommandPalette();
    } else {
      showInlineToast("No target textbox found!");
    }
  };
  
  submitBtn.addEventListener("click", submitForm);
  
  const inputs = formView.querySelectorAll(".ps-form-input") as NodeListOf<HTMLInputElement>;
  inputs.forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitForm();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelForm();
      }
    });
  });
}

// Auto Trigger Keystroke Expansion Checker
document.addEventListener("keydown", async (e: KeyboardEvent) => {
  const target = e.target as HTMLElement;
  if (!isPromptInput(target)) return;

  // We expansion-trigger on Space or Enter key
  if (e.key === " " || e.key === "Enter") {
    await handleAutoTriggerCheck(target, e);
  }
});

async function handleAutoTriggerCheck(target: HTMLElement, e: KeyboardEvent) {
  try {
    // 1. Textarea/Input element expansion
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      const val = target.value;
      const cursor = target.selectionStart || 0;
      const textBefore = val.slice(0, cursor);

      // Match slash followed by keyword characters at end of preceding text
      const match = textBefore.match(/\/([a-z0-9_-]+)$/i);
      if (!match) return;

      const keyword = match[1].toLowerCase();
      const stashes = await StashManager.getAll();
      const matchedStash = stashes.find((s) => s.autoTrigger === keyword);

      if (matchedStash) {
        e.preventDefault(); // Stop space/enter from inserting

        let customValues: Record<string, string> = {};
        const customVars = PackagingEngine.extractCustomVariables(matchedStash.text);
        let cancelled = false;
        
        for (const v of customVars) {
          const val = prompt(`Enter value for variable "${v}":`);
          if (val === null) {
            cancelled = true;
            break;
          }
          customValues[v] = val;
        }
        
        if (cancelled) return;

        // Calculate replaced strings
        const textBeforeTrigger = textBefore.slice(0, textBefore.length - keyword.length - 1);
        const textAfterTrigger = val.slice(cursor);
        
        const context = await gatherPageContext();
        const systemPrompt = await getPersonaSystemPrompt(matchedStash.personaId);
        const replacementText = await PackagingEngine.resolve(matchedStash.text, {
          ...context,
          customValues,
          systemPrompt
        });

        const newTextVal = textBeforeTrigger + replacementText + textAfterTrigger;
        const newCursorPos = textBeforeTrigger.length + replacementText.length;

        // Bypass React state overrides
        const nativeValueSetter = Object.getOwnPropertyDescriptor(
          target instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype,
          "value"
        )?.set;

        if (nativeValueSetter) {
          nativeValueSetter.call(target, newTextVal);
        } else {
          target.value = newTextVal;
        }

        target.selectionStart = target.selectionEnd = newCursorPos;
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));

        await StashManager.incrementUsage(matchedStash.id);
      }
    }
    // 2. Rich Text ContentEditable element expansion
    else if (target.isContentEditable) {
      const selection = window.getSelection();
      if (!selection || !selection.focusNode) return;

      const text = selection.focusNode.textContent || "";
      const offset = selection.focusOffset;
      const textBefore = text.slice(0, offset);

      const match = textBefore.match(/\/([a-z0-9_-]+)$/i);
      if (!match) return;

      const keyword = match[1].toLowerCase();
      const stashes = await StashManager.getAll();
      const matchedStash = stashes.find((s) => s.autoTrigger === keyword);

      if (matchedStash) {
        e.preventDefault(); // Stop space/enter input

        let customValues: Record<string, string> = {};
        const customVars = PackagingEngine.extractCustomVariables(matchedStash.text);
        let cancelled = false;
        
        for (const v of customVars) {
          const val = prompt(`Enter value for variable "${v}":`);
          if (val === null) {
            cancelled = true;
            break;
          }
          customValues[v] = val;
        }
        
        if (cancelled) return;

        const range = document.createRange();
        // Select exactly the slash and trigger text node characters
        range.setStart(selection.focusNode, offset - keyword.length - 1);
        range.setEnd(selection.focusNode, offset);
        
        selection.removeAllRanges();
        selection.addRange(range);

        const context = await gatherPageContext();
        const replacementText = await PackagingEngine.resolve(matchedStash.text, {
          ...context,
          customValues
        });

        // Delete text and insert replacement text dynamically
        document.execCommand("delete", false);
        document.execCommand("insertText", false, replacementText);
        
        target.dispatchEvent(new Event("input", { bubbles: true }));
        await StashManager.incrementUsage(matchedStash.id);
      }
    }
  } catch (err) {
    console.error("Auto trigger expansion failure:", err);
  }
}