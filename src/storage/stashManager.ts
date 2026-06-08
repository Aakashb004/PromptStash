export interface Stash {

  id: string;

  title: string;

  text: string;

  autoTrigger: string;

  tags: string[];

  favorite: boolean;

  usageCount: number;

  timestamp: number;

  versions: {
    version: number;
    text: string;
    createdAt: number;
  }[];
}

export class StashManager {

  static async getAll(): Promise<Stash[]> {

    const result =
      await chrome.storage.local.get({
        capsules: []
      });

    return result.capsules as Stash[];
  }

  static async save(
    stash: Stash
  ): Promise<void> {

    const stashes =
      await this.getAll();

    stashes.unshift(stash);

    await chrome.storage.local.set({
      capsules: stashes
    });
  }

  static async delete(
    id: string
  ): Promise<void> {

    const stashes =
      await this.getAll();

    const filtered =
      stashes.filter(
        s => s.id !== id
      );

    await chrome.storage.local.set({
      capsules: filtered
    });
  }

  static async toggleFavorite(
    id: string
  ): Promise<void> {

    const stashes =
      await this.getAll();

    const updated =
      stashes.map(stash => {

        if (
          stash.id !== id
        ) return stash;

        return {

          ...stash,

          favorite:
            !stash.favorite
        };
      });

    await chrome.storage.local.set({
      capsules: updated
    });
  }

  static async incrementUsage(
    id: string
  ): Promise<void> {

    const stashes =
      await this.getAll();

    const updated =
      stashes.map(stash => {

        if (
          stash.id !== id
        ) return stash;

        return {

          ...stash,

          usageCount:
            stash.usageCount + 1
        };
      });

    await chrome.storage.local.set({
      capsules: updated
    });
  }
}