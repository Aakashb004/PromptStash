# PromptStash

Production-grade local-first context and prompt management for AI platforms.

PromptStash helps you save, organize, search, version-control, and inject your prompts directly into any AI chat interface (ChatGPT, Claude, Gemini, DeepSeek, Grok, Copilot, Perplexity, Open WebUI, and more).

## Features

- **Universal AI Detection**: Intelligently detects and injects text into prompt inputs on any AI website.
- **Local-first Storage**: Your prompts are stored locally using Chrome/Browser storage APIs. Everything works offline by default.
- **Premium User Interface**: Modern Command-center layout inspired by Linear, Raycast, and Notion.
- **Analytics & History**: Detailed statistics and version history for every prompt capsule.
- **Import/Export**: Easy backup mechanism via JSON schema files.
- **Cross-browser Compatibility**: Built on a modular browser adapter supporting Chromium browsers (Chrome, Edge, Brave, Opera, Vivaldi, Arc) and Firefox.

## Folder Structure

```
src/
├── adapters/     # Cross-browser compatibility adapters
├── background/   # Service workers and hotkey listeners
├── content/      # Site injection and input element listeners
├── popup/        # Popup application HTML/CSS/TS
├── storage/      # Local-first storage engine (Stash & Version managers)
├── ui/           # Global styles and design system variables
├── types/        # TypeScript interfaces
└── utils/        # Mathematical tools & semantic search utilities
```

## Setup & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Dev Server (HMR)
```bash
npm run dev
```

### 3. Load Extension in Browser
1. Open your browser and navigate to the extensions page (e.g. `chrome://extensions`).
2. Toggle **Developer mode** (top-right).
3. Click **Load unpacked** and select the `dist` directory inside this repository.

### 4. Build for Production
```bash
npm run build
```
