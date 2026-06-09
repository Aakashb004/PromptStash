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

  tags: [],

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

stashes.forEach((stash) => {

  const card =
    document.createElement("div");

  card.className =
    "stash-card";

  card.innerHTML = `
    <div class="stash-title">
      ${escapeHtml(stash.title)}
    </div>

    <div class="stash-content">
      ${escapeHtml(
        stash.text
      )}
    </div>
  `;

  stashList.appendChild(
    card
  );
}

);
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