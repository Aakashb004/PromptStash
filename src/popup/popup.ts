import { StashManager, type Stash } from "../storage/stashManager";

const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;

saveBtn?.addEventListener("click", async () => {

const stash: Stash = {
id: crypto.randomUUID(),
title: "Test",
text: "Test Content",
autoTrigger: "",
tags: [],
favorite: false,
usageCount: 0,
timestamp: Date.now(),
versions: [
{
version: 1,
text: "Test Content",
createdAt: Date.now()
}
]
};

await StashManager.save(stash);

alert("Saved Successfully");
});

console.log("Popup Loaded");
