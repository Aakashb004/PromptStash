// Declare browser global for compilation compatibility
declare const browser: any;

export interface BrowserStorage {
  get(keys: string | string[] | Record<string, any>): Promise<Record<string, any>>;
  set(items: Record<string, any>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
}

export interface BrowserRuntime {
  sendMessage(message: any): Promise<any>;
  onMessage: {
    addListener(
      callback: (
        message: any,
        sender: any,
        sendResponse: (response?: any) => void
      ) => void | boolean
    ): void;
  };
  onInstalled: {
    addListener(callback: () => void): void;
  };
}

export interface BrowserTabs {
  query(queryInfo: any): Promise<any[]>;
  sendMessage(tabId: number, message: any): Promise<any>;
}

export interface BrowserCommands {
  onCommand: {
    addListener(callback: (command: string) => void): void;
  };
}

class BrowserAdapter {
  storage = {
    local: {
      get: async (keys: string | string[] | Record<string, any>): Promise<Record<string, any>> => {
        if (typeof browser !== "undefined" && browser.storage?.local) {
          return await browser.storage.local.get(keys);
        }
        return new Promise((resolve) => {
          chrome.storage.local.get(keys, (res) => resolve(res || {}));
        });
      },
      set: async (items: Record<string, any>): Promise<void> => {
        if (typeof browser !== "undefined" && browser.storage?.local) {
          return await browser.storage.local.set(items);
        }
        return new Promise((resolve) => {
          chrome.storage.local.set(items, resolve);
        });
      },
      remove: async (keys: string | string[]): Promise<void> => {
        if (typeof browser !== "undefined" && browser.storage?.local) {
          return await browser.storage.local.remove(keys);
        }
        return new Promise((resolve) => {
          chrome.storage.local.remove(keys, resolve);
        });
      },
      clear: async (): Promise<void> => {
        if (typeof browser !== "undefined" && browser.storage?.local) {
          return await browser.storage.local.clear();
        }
        return new Promise((resolve) => {
          chrome.storage.local.clear(resolve);
        });
      },
    },
  };

  runtime = {
    sendMessage: async (message: any): Promise<any> => {
      if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
        return await browser.runtime.sendMessage(message);
      }
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (res) => resolve(res));
      });
    },
    onMessage: {
      addListener: (
        callback: (
          message: any,
          sender: any,
          sendResponse: (response?: any) => void
        ) => void | boolean
      ): void => {
        const target = typeof browser !== "undefined" ? browser : chrome;
        target.runtime.onMessage.addListener(callback);
      },
    },
    onInstalled: {
      addListener: (callback: () => void): void => {
        const target = typeof browser !== "undefined" ? browser : chrome;
        target.runtime.onInstalled.addListener(callback);
      },
    },
  };

  tabs = {
    query: async (queryInfo: any): Promise<any[]> => {
      if (typeof browser !== "undefined" && browser.tabs?.query) {
        return await browser.tabs.query(queryInfo);
      }
      return new Promise((resolve) => {
        chrome.tabs.query(queryInfo, (res) => resolve(res || []));
      });
    },
    sendMessage: async (tabId: number, message: any): Promise<any> => {
      if (typeof browser !== "undefined" && browser.tabs?.sendMessage) {
        return await browser.tabs.sendMessage(tabId, message);
      }
      return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, message, (res) => resolve(res));
      });
    },
  };

  commands = {
    onCommand: {
      addListener: (callback: (command: string) => void): void => {
        const target = typeof browser !== "undefined" ? browser : chrome;
        target.commands.onCommand.addListener(callback);
      },
    },
  };
}

export const Browser = new BrowserAdapter();
export default Browser;
