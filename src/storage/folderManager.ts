import Browser from "../adapters/browser";
import { Folder } from "../types";

export class FolderManager {
  static async getAll(): Promise<Folder[]> {
    const result = await Browser.storage.local.get({
      folders: [],
    });
    return result.folders as Folder[];
  }

  static async save(folder: Folder): Promise<void> {
    const folders = await this.getAll();
    folders.unshift(folder);
    await Browser.storage.local.set({
      folders,
    });
  }

  static async delete(id: string): Promise<void> {
    const folders = await this.getAll();
    const filtered = folders.filter((f) => f.id !== id);
    await Browser.storage.local.set({
      folders: filtered,
    });

    // Cascading clean up: remove the reference from any bound stashes
    const { StashManager } = await import("./stashManager");
    const stashes = await StashManager.getAll();
    let changed = false;
    const updatedStashes = stashes.map((s) => {
      if (s.folderId === id) {
        changed = true;
        const { folderId, ...rest } = s;
        return rest;
      }
      return s;
    });
    if (changed) {
      await Browser.storage.local.set({
        capsules: updatedStashes,
      });
    }
  }

  static async update(id: string, updates: Partial<Folder>): Promise<void> {
    const folders = await this.getAll();
    const updated = folders.map((folder) => {
      if (folder.id !== id) return folder;
      return {
        ...folder,
        ...updates,
      };
    });
    await Browser.storage.local.set({
      folders: updated,
    });
  }
}
