import {
StashManager,
type Stash
} from "../storage/stashManager";

const titleInput =
document.getElementById("title") as HTMLInputElement;

const contentInput =
document.getElementById("content") as HTMLTextAreaElement;

const saveBtn =
document.getElementById("saveBtn") as HTMLButtonElement;

const stashList =
document.getElementById("stashList") as HTMLDivElement;

const searchInput =
document.getElementById("searchInput") as HTMLInputElement;

const totalStashes =
document.getElementById("totalStashes") as HTMLSpanElement;

const totalUses =
document.getElementById("totalUses") as HTMLSpanElement;

let currentSearch = "";

initialize();

async function initialize() {

searchInput?.addEventListener(
"input",
async () => {

  currentSearch =
    searchInput.value.toLowerCase();

  await renderStashes();
}

);

await loadStats();
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

  id:
    crypto.randomUUID(),

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

await StashManager.save(stash);

titleInput.value = "";
contentInput.value = "";

await loadStats();
await renderStashes();

alert("Stash Saved!");

}
);

async function renderStashes() {

let stashes =
await StashManager.getAll();

if (currentSearch) {

stashes =
  stashes.filter(
    stash =>
      stash.title
        .toLowerCase()
        .includes(currentSearch)
      ||
      stash.text
        .toLowerCase()
        .includes(currentSearch)
  );

}

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

    <span
      class="favorite-btn"
      data-id="${stash.id}">
      ${stash.favorite ? "⭐" : "☆"}
    </span>

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

    await StashManager.delete(
      stash.id
    );

    await loadStats();
    await renderStashes();
  }
);

const favoriteBtn =
  card.querySelector(
    ".favorite-btn"
  ) as HTMLSpanElement;

favoriteBtn.addEventListener(
  "click",
  async () => {

    await StashManager.toggleFavorite(
      stash.id
    );

    await renderStashes();
  }
);

stashList.appendChild(card);
});
}

async function loadStats() {

const stashes =
await StashManager.getAll();

totalStashes.textContent =
stashes.length.toString();

const usageCount =
stashes.reduce(
(sum, stash) =>
sum + stash.usageCount,
0
);

totalUses.textContent =
usageCount.toString();
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