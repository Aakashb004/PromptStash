import {
  StashManager
} from "../storage/stashManager";

const testBtn =
document.getElementById(
  "testBtn"
);

testBtn?.addEventListener(
  "click",
  async () => {

    await StashManager.save({

      id:
        crypto.randomUUID(),

      title:
        "Test Stash",

      text:
        "Hello PromptStash",

      autoTrigger:
        "",

      tags: [],

      favorite:
        false,

      usageCount:
        0,

      timestamp:
        Date.now(),

      versions: [
        {
          version: 1,
          text:
            "Hello PromptStash",
          createdAt:
            Date.now()
        }
      ]
    });

    const stashes =
      await StashManager.getAll();

    console.log(
      stashes
    );

    alert(
      "Stash Saved"
    );
  }
);