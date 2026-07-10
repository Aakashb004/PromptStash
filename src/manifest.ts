import type { ManifestV3Export } from "@crxjs/vite-plugin";

const manifest: ManifestV3Export = {
  manifest_version: 3,

  name: "PromptStash",

  version: "5.0.0",

  description:
    "Production-grade local-first context management for AI platforms.",

  permissions: [
    "storage",
    "activeTab",
    "downloads",
    "clipboardRead"
  ],

  host_permissions: [
    "http://*/*",
    "https://*/*"
  ],

  background: {
    service_worker:
      "src/background/background.ts"
  },

  "action": {
  "default_popup": "src/popup/popup.html",
  "default_icon": {
    "16": "icon.png",
    "48": "icon.png",
    "128": "icon.png"
  }
},

"icons": {
  "16": "icon.png",
  "48": "icon.png",
  "128": "icon.png"
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
        "http://*/*",
        "https://*/*"
      ],

      js: [
        "src/content/content.ts"
      ]
    }
  ]
};

export default manifest;