import Browser from "../adapters/browser";
import { Stash } from "../types";

export class StashManager {
  static async getAll(): Promise<Stash[]> {
    const result = await Browser.storage.local.get({
      capsules: [],
    });
    const stashes = result.capsules as Stash[];
    return stashes.map((s) => ({
      ...s,
      status: s.status || "active",
    }));
  }

  static async save(stash: Stash): Promise<void> {
    const stashes = await this.getAll();
    stashes.unshift({
      ...stash,
      status: stash.status || "active",
    });
    await Browser.storage.local.set({
      capsules: stashes,
    });
  }

  static async delete(id: string): Promise<void> {
    // Legacy delete moves to trash instead of permanent deletion!
    await this.updateStatus(id, "trash");
  }

  static async toggleFavorite(id: string): Promise<void> {
    const stashes = await this.getAll();
    const updated = stashes.map((stash) => {
      if (stash.id !== id) return stash;
      return {
        ...stash,
        favorite: !stash.favorite,
      };
    });
    await Browser.storage.local.set({
      capsules: updated,
    });
  }

  static async incrementUsage(id: string): Promise<void> {
    const stashes = await this.getAll();
    const updated = stashes.map((stash) => {
      if (stash.id !== id) return stash;
      return {
        ...stash,
        usageCount: stash.usageCount + 1,
      };
    });
    await Browser.storage.local.set({
      capsules: updated,
    });
  }

  static async update(id: string, updates: Partial<Stash>): Promise<void> {
    const stashes = await this.getAll();
    const updated = stashes.map((stash) => {
      if (stash.id !== id) return stash;
      return {
        ...stash,
        ...updates,
      };
    });
    await Browser.storage.local.set({
      capsules: updated,
    });
  }

  static async updateStatus(id: string, status: "active" | "archived" | "trash"): Promise<void> {
    const stashes = await this.getAll();
    const updated = stashes.map((stash) => {
      if (stash.id !== id) return stash;
      return {
        ...stash,
        status,
      };
    });
    await Browser.storage.local.set({
      capsules: updated,
    });
  }

  static async permanentlyDelete(id: string): Promise<void> {
    const stashes = await this.getAll();
    const filtered = stashes.filter((stash) => stash.id !== id);
    await Browser.storage.local.set({
      capsules: filtered,
    });
  }
}