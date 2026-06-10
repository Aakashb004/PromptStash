import {
StashManager,
type Stash
} from "../storage/stashManager";

const titleInput =
document.getElementById(
"title"
) as HTMLInputElement;

const contentInput =
document.getElementById(
"content"
) as HTMLTextAreaElement;

const saveBtn =
document.getElementById(
"saveBtn"
) as HTMLButtonElement;

const stashList =
document.getElementById(
"stashList"
) as HTMLDivElement;

initialize();

async function initialize() {
await renderStashes();
}

saveBtn.addEventListener(
"click",
async () => {

const title =
  titleInput.value.trim();

const text =
  contentInput.value.trim();

if (!title || !text) {
  alert(
    "Please enter title and content."
  );
  return;
}

const stash: Stash = {
  id: crypto.randomUUID(),

  title,

  text,

  autoTrigger: "",

  tags: ["general"],

  favorite: false,

  usageCount: 0,

  timestamp: Date.now(),

  versions: [
    {
      version: 1,
      text,
      createdAt: Date.now()
    }
  ]
};

await StashManager.save(
  stash
);

titleInput.value = "";
contentInput.value = "";

await renderStashes();

alert("Stash Saved!");
});

async function renderStashes() {

  const stashes =
    await StashManager.getAll();

  stashList.innerHTML = "";

  const countEl =
    document.getElementById(
      "stashCount"
    );

  if (countEl) {
    countEl.textContent =
      `${stashes.length} Stashes`;
  }

  stashes.forEach((stash) => {

    const card =
      document.createElement("div");

    card.className =
      "stash-card";

    const tagsHtml =
      stash.tags
        .map(
          tag =>
            `<span class="tag">${tag}</span>`
        )
        .join("");

    card.innerHTML = `
      <div class="stash-title">
        ${stash.favorite ? "⭐ " : ""}
        ${escapeHtml(stash.title)}
      </div>

      <div class="stash-content">
        ${escapeHtml(stash.text)}
      </div>

      <div>
        ${tagsHtml}
      </div>

      <button
        class="delete-btn"
        data-id="${stash.id}">
        Delete
      </button>
    `;

    const deleteBtn =
      card.querySelector(
        ".delete-btn"
      ) as HTMLButtonElement;

    deleteBtn.addEventListener(
      "click",
      async () => {

        await deleteStash(
          stash.id
        );

        await renderStashes();
      }
    );

    stashList.appendChild(
      card
    );
  });
}
async function deleteStash(
  id: string
) {

  const stashes =
    await StashManager.getAll();

  const filtered =
    stashes.filter(
      stash => stash.id !== id
    );

  await chrome.storage.local.set({
    capsules: filtered
  });
}
function escapeHtml(
text: string
): string {

return text
.replace(
/&/g,
"&"
)
.replace(
/</g,
"<"
)
.replace(
/>/g,
">"
);
}