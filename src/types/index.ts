export interface Version {
  version: number;
  text: string;
  createdAt: number;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  emoji: string;
  timestamp: number;
}

export interface Stash {
  id: string;
  title: string;
  text: string;
  autoTrigger: string;
  tags: string[];
  favorite: boolean;
  usageCount: number;
  timestamp: number;
  versions: Version[];
  personaId?: string; // Optional bound Persona
}
