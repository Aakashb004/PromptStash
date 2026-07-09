import Browser from "../adapters/browser";

Browser.runtime.onInstalled.addListener(() => {
  console.log("PromptStash Loaded");
});

Browser.commands.onCommand.addListener(async (command: string) => {
  const tabs = await Browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  const tab = tabs[0];
  if (!tab?.id) return;

  Browser.tabs.sendMessage(tab.id, {
    action: command,
  });
});