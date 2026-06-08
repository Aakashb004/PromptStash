import type { ManifestV3Export } from "@crxjs/vite-plugin";

const manifest: ManifestV3Export = {
  manifest_version: 3,

  name: "PromptStash PRO",

  version: "5.0.0",

  description:
    "Production-grade local-first context management for AI platforms.",

  permissions: [
    "storage",
    "activeTab",
    "downloads"
  ],

  host_permissions: [
    "https://chatgpt.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*"
  ],

  background: {
    service_worker:
      "src/background/background.ts"
  },

  action: {
    default_popup:
      "src/popup/popup.html"
  },

  commands: {
    "trigger-stash": {
      suggested_key: {
        default: "Ctrl+Shift+S"
      },
      description:
        "Open PromptStash Dashboard"
    },

    "harvest-context": {
      suggested_key: {
        default: "Ctrl+Shift+Y"
      },
      description:
        "Harvest Context"
    }
  },

  content_scripts: [
    {
      matches: [
        "https://chatgpt.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*"
      ],

      js: [
        "src/content/content.ts"
      ]
    }
  ]
};

export default manifest;