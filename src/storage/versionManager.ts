import Browser from "../adapters/browser";
import { StashManager } from "./stashManager";

export class VersionManager {
  static async addVersion(stashId: string, newText: string) {
    const stashes = await StashManager.getAll();
    const stash = stashes.find((s) => s.id === stashId);

    if (!stash) return;

    stash.versions.push({
      version: stash.versions.length + 1,
      text: newText,
      createdAt: Date.now(),
    });

    await Browser.storage.local.set({
      capsules: stashes,
    });
  }
}