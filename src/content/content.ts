console.log(
  "PromptStash Content Loaded"
);

chrome.runtime.onMessage.addListener(
  (message: any) => {

    console.log(
      "PromptStash Message:",
      message
    );
  }
);