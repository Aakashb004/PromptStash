import Browser from "../adapters/browser";
import { Persona } from "../types";

export class PersonaManager {
  static async getAll(): Promise<Persona[]> {
    const result = await Browser.storage.local.get({
      personas: [],
    });
    return result.personas as Persona[];
  }

  static async save(persona: Persona): Promise<void> {
    const personas = await this.getAll();
    personas.unshift(persona);
    await Browser.storage.local.set({
      personas,
    });
  }

  static async delete(id: string): Promise<void> {
    const personas = await this.getAll();
    const filtered = personas.filter((p) => p.id !== id);
    await Browser.storage.local.set({
      personas: filtered,
    });
    
    // Cascading clean up: remove the reference from any bound stashes
    const { StashManager } = await import("./stashManager");
    const stashes = await StashManager.getAll();
    let changed = false;
    const updatedStashes = stashes.map((s) => {
      if (s.personaId === id) {
        changed = true;
        const { personaId, ...rest } = s;
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

  static async update(id: string, updates: Partial<Persona>): Promise<void> {
    const personas = await this.getAll();
    const updated = personas.map((persona) => {
      if (persona.id !== id) return persona;
      return {
        ...persona,
        ...updates,
      };
    });
    await Browser.storage.local.set({
      personas: updated,
    });
  }
}
