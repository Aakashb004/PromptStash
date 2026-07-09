export interface Version {
  version: number;
  text: string;
  createdAt: number;
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
}
