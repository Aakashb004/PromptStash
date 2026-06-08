chrome.runtime.onInstalled.addListener(() => {
  console.log("PromptStash PRO Loaded");
});

chrome.commands.onCommand.addListener(
  async (command: string) => {

    const tabs =
      await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

    const tab = tabs[0];

    if (!tab?.id) return;

    chrome.tabs.sendMessage(
      tab.id,
      {
        action: command
      }
    );
  }
);