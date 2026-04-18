/**
 * Minimal archive shape for local scrapbook generation.
 * Matches seed / user entries in Living Archive.
 */
export type ArchiveEntry = {
  title: string;
  story: string;
  person?: string;
  place?: string;
  culture?: string;
};

export type SceneVisualDetails = {
  characters: string[];
  setting: string;
  importantObjects: string[];
  emotion: string;
  lighting: string;
  colorPalette: string;
};

/** Inferred narrative / visual category for styling */
export type ScrapbookSceneType =
  | "home"
  | "journey"
  | "cooking"
  | "celebration"
  | "ritual"
  | "childhood"
  | "loss"
  | "nature"
  | "memory";

export type ScrapbookPage = {
  sceneTitle: string;
  caption: string;
  sceneType: ScrapbookSceneType;
  visualDetails: SceneVisualDetails;
};

/** Summary extracted from full story — useful for UI chips */
export type StorySignals = {
  people: string[];
  places: string[];
  objects: string[];
  emotions: string[];
  moments: string[];
};
