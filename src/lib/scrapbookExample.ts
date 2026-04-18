/**
 * Example usage + static sample output shape for the local scrapbook generator.
 * Run in devtools: import { logScrapbookExample } from './lib/scrapbookExample'; logScrapbookExample();
 */
import type { ArchiveEntry } from "../types/archive";
import { generateScrapbookPages } from "./scrapbookGenerator";

/** Short excerpt — full seed stories live in `LivingArchive.jsx` SEED. */
export const EXAMPLE_DUMPLING_STORY: ArchiveEntry = {
  title: "The Fold That Seals the Love",
  person: "Mei-Ling Zhao",
  place: "Chengdu → Vancouver",
  culture: "Sichuan Chinese",
  story: `My grandmother made dumplings every Sunday of my childhood, and the smell of sesame oil and ginger would pull me from sleep better than any alarm. She learned from her mother in Chengdu, who learned from hers — a chain of hands stretching back through time like linked fingers.

When she emigrated to Vancouver in 1974 with two suitcases and a worn recipe card, she brought the recipe as seriously as she brought anything else. In a new country where nobody knew our name or our food, those dumplings became how we recognized ourselves.

I learned by watching. There were no measurements — a palm of flour, enough water until it talks to you, pork and cabbage mixed until it smells right. The knowledge lived in her hands, not on any page. I am still learning to translate it into mine.`,
};

/** Five pages derived only from `EXAMPLE_DUMPLING_STORY.story` + metadata. */
export const EXAMPLE_SCRAPBOOK_PAGES = generateScrapbookPages(EXAMPLE_DUMPLING_STORY);

export function logScrapbookExample(): void {
  console.log("[Living Archive] Example scrapbook pages:", EXAMPLE_SCRAPBOOK_PAGES);
}
