import Browser from "../adapters/browser";
import { StashManager } from "../storage/stashManager";
import { Stash } from "../types";

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
    max-height: 380px;
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
      const inputEl = findPrimaryPromptInput();
      if (inputEl) {
        injectText(inputEl, stash.text, "replace");
        await StashManager.incrementUsage(stash.id);
        hideCommandPalette();
      } else {
        showInlineToast("No target textbox found!");
      }
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

function showCommandPalette() {
  if (overlayHost) {
    overlayHost.style.display = "block";
    const searchInput = shadowRoot?.querySelector(".ps-search-input") as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
      searchInput.focus();
    }
    filteredStashes = [...activeStashes];
    selectedIndex = 0;
    renderOverlayList();
    return;
  }

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
  `;

  overlay.appendChild(dialog);
  shadowRoot.appendChild(overlay);

  const searchInput = dialog.querySelector(".ps-search-input") as HTMLInputElement;
  searchInput.focus();

  // Search input change filtering
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    filteredStashes = activeStashes.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.text.toLowerCase().includes(query) ||
        s.tags.some((t) => t.toLowerCase().includes(query))
    );
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
          await navigator.clipboard.writeText(stash.text);
          showInlineToast("Copied to clipboard!");
        } catch (err) {
          showInlineToast("Copy failed.");
        }
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredStashes.length && filteredStashes[selectedIndex]) {
        const stash = filteredStashes[selectedIndex];
        const inputEl = findPrimaryPromptInput();
        if (inputEl) {
          let mode: "replace" | "append" | "prepend" = "replace";
          if (e.shiftKey) mode = "append";
          if (e.altKey) mode = "prepend";

          injectText(inputEl, stash.text, mode);
          await StashManager.incrementUsage(stash.id);
          hideCommandPalette();
        } else {
          showInlineToast("No target textbox found!");
        }
      }
    }
  });

  filteredStashes = [...activeStashes];
  selectedIndex = 0;
  renderOverlayList();
}

function hideCommandPalette() {
  if (overlayHost) {
    overlayHost.style.display = "none";
  }
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
  }
  return true;
});

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

        // Calculate replaced strings
        const textBeforeTrigger = textBefore.slice(0, textBefore.length - keyword.length - 1);
        const textAfterTrigger = val.slice(cursor);
        const replacementText = matchedStash.text;

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

        const range = document.createRange();
        // Select exactly the slash and trigger text node characters
        range.setStart(selection.focusNode, offset - keyword.length - 1);
        range.setEnd(selection.focusNode, offset);
        
        selection.removeAllRanges();
        selection.addRange(range);

        // Delete text and insert replacement text dynamically
        document.execCommand("delete", false);
        document.execCommand("insertText", false, matchedStash.text);
        
        target.dispatchEvent(new Event("input", { bubbles: true }));
        await StashManager.incrementUsage(matchedStash.id);
      }
    }
  } catch (err) {
    console.error("Auto trigger expansion failure:", err);
  }
}