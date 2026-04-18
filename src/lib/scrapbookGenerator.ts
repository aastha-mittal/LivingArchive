import type { ArchiveEntry, ScrapbookPage, ScrapbookSceneType, StorySignals } from "../types/archive";

// ── Keyword lexicons (match real stories: food, migration, myth, festival, language, etc.) ──

const PEOPLE_KEYWORDS = [
  "grandmother",
  "grandfather",
  "grandma",
  "grandpa",
  "nana",
  "mother",
  "father",
  "parents",
  "mom",
  "dad",
  "wife",
  "husband",
  "daughter",
  "son",
  "child",
  "children",
  "uncle",
  "aunt",
  "cousin",
  "neighbor",
  "brother",
  "sister",
  "narrator",
];

const PLACE_KEYWORDS = [
  "kitchen",
  "village",
  "river",
  "train",
  "station",
  "border",
  "temple",
  "courtyard",
  "home",
  "house",
  "factory",
  "desert",
  "road",
  "sky",
  "forest",
  "mountain",
  "sea",
  "ocean",
  "city",
  "camp",
  "garden",
  "table",
  "wall",
  "window",
  "amazon",
  "london",
  "vancouver",
  "berlin",
  "paris",
  "syria",
  "serbia",
  "germany",
  "kerala",
  "manzanar",
  "california",
  "japan",
  "hokkaido",
  "accra",
  "ghana",
  "kitchen table",
];

const OBJECT_KEYWORDS = [
  "dumpling",
  "dumplings",
  "recipe",
  "card",
  "lantern",
  "suitcase",
  "suitcases",
  "photograph",
  "letter",
  "letters",
  "trunk",
  "cedar",
  "bracelet",
  "song",
  "recording",
  "phone",
  "drum",
  "drums",
  "food",
  "soup",
  "oil",
  "ginger",
  "flour",
  "water",
  "fish",
  "boat",
  "dam",
  "coffee",
  "can",
  "belt",
  "seeds",
  "paper",
  "melody",
  "language",
  "festival",
  "light",
  "golden",
];

const EMOTION_KEYWORDS: { word: string; label: string }[] = [
  { word: "love", label: "love" },
  { word: "loved", label: "love" },
  { word: "grief", label: "grief" },
  { word: "lost", label: "loss" },
  { word: "loss", label: "loss" },
  { word: "fear", label: "fear" },
  { word: "joy", label: "joy" },
  { word: "happy", label: "joy" },
  { word: "nostalgia", label: "nostalgia" },
  { word: "longing", label: "longing" },
  { word: "hope", label: "hope" },
  { word: "hopeless", label: "grief" },
  { word: "proud", label: "pride" },
  { word: "pride", label: "pride" },
  { word: "warm", label: "warmth" },
  { word: "warmth", label: "warmth" },
  { word: "cold", label: "resilience" },
  { word: "tender", label: "tenderness" },
  { word: "resilience", label: "resilience" },
  { word: "beautiful", label: "wonder" },
  { word: "wonder", label: "wonder" },
  { word: "terrified", label: "fear" },
  { word: "afraid", label: "fear" },
  { word: "bittersweet", label: "bittersweet" },
];

const MOMENT_KEYWORDS = [
  "leaving",
  "arrival",
  "arrived",
  "goodbye",
  "wedding",
  "childhood",
  "recorded",
  "cooked",
  "cooking",
  "fold",
  "folded",
  "sang",
  "singing",
  "festival",
  "burned",
  "opened",
  "emigrated",
  "journey",
  "migration",
];

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "as",
  "by",
  "with",
  "from",
  "it",
  "is",
  "was",
  "were",
  "are",
  "be",
  "been",
  "have",
  "has",
  "had",
  "that",
  "this",
  "these",
  "those",
  "i",
  "we",
  "you",
  "he",
  "she",
  "they",
  "my",
  "our",
  "your",
  "their",
  "not",
  "no",
  "so",
  "if",
  "when",
  "than",
  "then",
  "into",
  "over",
  "after",
  "before",
  "which",
  "who",
  "whom",
  "what",
]);

// ── helpers ───────────────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWord(haystack: string, word: string): boolean {
  return new RegExp(`\\b${escapeRegex(word)}\\b`, "i").test(haystack);
}

function findMatches(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const w of keywords) {
    if (hasWord(lower, w)) found.add(w);
  }
  return [...found];
}

function findEmotionLabel(sentence: string): string {
  const lower = sentence.toLowerCase();
  for (const { word, label } of EMOTION_KEYWORDS) {
    if (hasWord(lower, word)) return label;
  }
  return "nostalgia";
}

function extractCapitalizedNames(story: string): string[] {
  const re = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const skip = new Set(["The", "We", "I", "It", "In", "On", "At", "My", "He", "She", "They", "When", "But", "And", "This", "That", "There", "Here", "Every", "Some"]);
  while ((m = re.exec(story))) {
    if (!skip.has(m[0])) out.push(m[0]);
  }
  return [...new Set(out)].slice(0, 8);
}

export function extractPeople(text: string, personMeta?: string): string[] {
  const found = findMatches(text, PEOPLE_KEYWORDS);
  const names = extractCapitalizedNames(text);
  if (personMeta?.trim()) {
    const parts = personMeta.split(/\s+/).slice(0, 2);
    found.unshift(...parts);
  }
  return [...new Set([...names, ...found])].slice(0, 12);
}

export function extractPlaces(text: string, placeMeta?: string): string[] {
  const found = findMatches(text, PLACE_KEYWORDS);
  if (placeMeta?.trim()) {
    placeMeta.split(/[→,]/).forEach((p) => {
      const t = p.trim();
      if (t.length > 2) found.unshift(t);
    });
  }
  return [...new Set(found)].slice(0, 14);
}

export function extractObjects(text: string): string[] {
  return findMatches(text, OBJECT_KEYWORDS).slice(0, 16);
}

export function extractEmotions(text: string): string[] {
  const lower = text.toLowerCase();
  const labels = new Set<string>();
  for (const { word, label } of EMOTION_KEYWORDS) {
    if (hasWord(lower, word)) labels.add(label);
  }
  return [...labels].slice(0, 8);
}

export function extractMoments(text: string): string[] {
  return findMatches(text, MOMENT_KEYWORDS).slice(0, 12);
}

export function extractStorySignals(entry: ArchiveEntry): StorySignals {
  const blob = `${entry.title}\n${entry.story}\n${entry.place ?? ""}\n${entry.culture ?? ""}`;
  return {
    people: extractPeople(blob, entry.person),
    places: extractPlaces(blob, entry.place),
    objects: extractObjects(blob),
    emotions: extractEmotions(blob),
    moments: extractMoments(blob),
  };
}

/** Keyword scores for ranking sentences */
function scoreSentence(sentence: string): number {
  let score = 0;
  const lower = sentence.toLowerCase();
  for (const w of PEOPLE_KEYWORDS) if (hasWord(lower, w)) score += 3;
  for (const w of PLACE_KEYWORDS) if (hasWord(lower, w)) score += 2;
  for (const w of OBJECT_KEYWORDS) if (hasWord(lower, w)) score += 2;
  for (const { word } of EMOTION_KEYWORDS) if (hasWord(lower, word)) score += 2;
  for (const w of MOMENT_KEYWORDS) if (hasWord(lower, w)) score += 1;
  if (/\d{4}/.test(sentence)) score += 2;
  const len = sentence.length;
  if (len >= 40 && len <= 280) score += 2;
  if (len > 280) score -= 1;
  if (len < 25) score -= 2;
  return score;
}

function splitIntoSentences(story: string): string[] {
  const normalized = story.replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  const parts = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
  return parts.length ? parts : [normalized];
}

function splitClauses(s: string): string[] {
  return s
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter((x) => x.length > 15);
}

/** Map sentence text to a scene type for visuals */
export function inferSceneType(sentence: string): ScrapbookSceneType {
  const lower = sentence.toLowerCase();
  if (/cook|dumpling|recipe|kitchen|food|soup|oil|ginger|flour|eat|meal|palm of/.test(lower)) return "cooking";
  if (/festival|lantern|drum|celebrat|dance|golden|homowo|parade/.test(lower)) return "celebration";
  if (/train|journey|walk|border|suitcase|leave|left|migration|serbia|germany|aleppo|syria|factory|mile|road|night|3am|november/.test(lower))
    return "journey";
  if (/wedding|bride|trunk|altar|vow/.test(lower)) return "ritual";
  if (/die|died|death|loss|lost|gone|grief|last|burned|unsent|silence/.test(lower)) return "loss";
  if (/child|eight|young|grew|school|remember as/.test(lower)) return "childhood";
  if (/river|amazon|water|fish|sky|forest|village|legend|river at night|periyar/.test(lower)) return "nature";
  if (/record|phone|sing|song|language|words|lullaby|melody/.test(lower)) return "memory";
  if (/home|kitchen|table|grandmother|grandfather|mother's family/.test(lower)) return "home";
  return "memory";
}

type SceneStyle = {
  lighting: string;
  colorPalette: string;
  settingHint: string;
};

function visualDefaultsForSceneType(t: ScrapbookSceneType): SceneStyle {
  switch (t) {
    case "cooking":
      return {
        lighting: "Warm steam-soft light from above, golden side light on hands",
        colorPalette: "Honey, sesame brown, ginger gold, cream steam, copper pots",
        settingHint: "Kitchen or table where food and hands meet",
      };
    case "journey":
      return {
        lighting: "Low dawn or dusk rim light, long shadows",
        colorPalette: "Dusty blue-gray, amber horizon, deep brown luggage, faded map tones",
        settingHint: "Path, station, or threshold between places",
      };
    case "celebration":
      return {
        lighting: "Warm lantern glow and bounce light from crowd",
        colorPalette: "Gold, ember orange, deep plum shadows, paper-lantern cream",
        settingHint: "Festival ground or procession",
      };
    case "ritual":
      return {
        lighting: "Soft directional light on symbolic objects",
        colorPalette: "Cedar red-brown, ivory fabric, muted gold accents",
        settingHint: "Ceremony or heirloom moment",
      };
    case "loss":
      return {
        lighting: "Pale overcast or single warm lamp pool",
        colorPalette: "Ash blue, dried rose, bone paper, low-contrast grays",
        settingHint: "Quiet interior or empty chair",
      };
    case "childhood":
      return {
        lighting: "Late afternoon sun through dust",
        colorPalette: "Pastel chalk, grass green, soft denim sky",
        settingHint: "Small figure in a larger world",
      };
    case "nature":
      return {
        lighting: "Diffuse sky light with water shimmer",
        colorPalette: "River teal, monsoon gray-green, sand, pale star tone",
        settingHint: "Riverbank, village edge, or open sky",
      };
    case "home":
      return {
        lighting: "Window light with warm bounce",
        colorPalette: "Linen, oak, terracotta, quiet sage",
        settingHint: "Domestic room or porch",
      };
    default:
      return {
        lighting: "Soft memory haze, gentle vignette",
        colorPalette: "Sepia cream, muted rose, storybook teal shadow",
        settingHint: "Interior remembered space",
      };
  }
}

function pickSettingPhrase(sentence: string, places: string[], sceneType: ScrapbookSceneType): string {
  const hits = findMatches(sentence.toLowerCase(), PLACE_KEYWORDS);
  const fromSentence = hits[0];
  if (fromSentence) return `The ${fromSentence} as it appears in this passage`;
  if (places.length) return `Tied to ${places.slice(0, 2).join(" and ")} from your story`;
  const vd = visualDefaultsForSceneType(sceneType);
  return vd.settingHint;
}

function pickObjectsForSentence(sentence: string, globalObjects: string[]): string[] {
  const local = findMatches(sentence, OBJECT_KEYWORDS);
  const merged = [...new Set([...local, ...globalObjects])];
  return merged.slice(0, 5);
}

function pickPeopleForSentence(sentence: string, globalPeople: string[]): string[] {
  const local = findMatches(sentence, PEOPLE_KEYWORDS);
  const cap = extractCapitalizedNames(sentence);
  const merged = [...new Set([...cap, ...local, ...globalPeople])];
  return merged.slice(0, 4);
}

/** Short poetic title — no generic filler; uses story words */
function makeSceneTitle(sentence: string, index: number): string {
  const cleaned = sentence.replace(/["'""]/g, "").replace(/\s+/g, " ").trim();
  const words = cleaned
    .replace(/^[^(a-zA-Z)]*/, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w.replace(/[^a-zA-Z]/g, "").toLowerCase()));

  if (words.length === 0) return `Passage ${index + 1}`;

  const take = words.slice(0, Math.min(7, words.length));
  let title = take
    .join(" ")
    .replace(/[.?!,;:]+$/, "");
  if (title.length > 48) title = title.slice(0, 45).trim() + "…";
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function buildCaption(raw: string): string {
  const one = raw.replace(/\s+/g, " ").trim();
  if (one.length <= 220) return one;
  return one.slice(0, 217).trim() + "…";
}

/** Ensure we have 5 text fragments from the story */
function selectFiveFragments(story: string): string[] {
  const sentences = splitIntoSentences(story);
  const scored = sentences.map((s, i) => ({ s, score: scoreSentence(s), i }));
  scored.sort((a, b) => b.score - a.score || a.i - b.i);

  const picked: string[] = [];
  const used = new Set<number>();

  for (const { s, i } of scored) {
    if (picked.length >= 5) break;
    if (used.has(i)) continue;
    picked.push(s);
    used.add(i);
  }

  // chronological reorder for narrative flow
  const chronological = picked
    .map((p) => ({ p, idx: sentences.indexOf(p) }))
    .sort((a, b) => a.idx - b.idx)
    .map((x) => x.p);

  let fragments = chronological.slice(0, 5);

  if (fragments.length < 5 && sentences.length > 0) {
    const clauses: string[] = [];
    for (const s of sentences) clauses.push(...splitClauses(s));
    const extra = clauses.filter((c) => !fragments.some((f) => f.includes(c.slice(0, 20))));
    for (const e of extra) {
      if (fragments.length >= 5) break;
      fragments.push(e);
    }
  }

  // Sliding windows over raw story if still short on distinct beats
  const flat = story.replace(/\s+/g, " ").trim();
  let win = 0;
  while (fragments.length < 5 && flat.length > 60) {
    const span = Math.min(140, Math.max(80, Math.floor(flat.length / 5)));
    const start = (win * Math.floor(flat.length / 5)) % Math.max(1, flat.length - span);
    const chunk = flat.slice(start, start + span).trim();
    if (chunk.length > 25 && !fragments.some((f) => f.includes(chunk.slice(0, 28)))) fragments.push(chunk);
    win++;
    if (win > 12) break;
  }

  return fragments.slice(0, 5);
}

function mergeEmotion(sentenceEmotion: string, sceneType: ScrapbookSceneType): string {
  if (sentenceEmotion !== "nostalgia") return sentenceEmotion;
  if (sceneType === "loss") return "grief";
  if (sceneType === "celebration") return "joy";
  if (sceneType === "journey") return "resilience";
  return "nostalgia";
}

/**
 * Main API: 5 scrapbook pages, everything derived from `entry.story` + metadata.
 */
export function generateScrapbookPages(entry: ArchiveEntry): ScrapbookPage[] {
  const story = (entry.story || "").trim();
  const signals = extractStorySignals(entry);
  const fragments = selectFiveFragments(story || entry.title);

  return fragments.map((fragment, idx) => {
    const sceneType = inferSceneType(fragment);
    const vdBase = visualDefaultsForSceneType(sceneType);
    const emotion = mergeEmotion(findEmotionLabel(fragment), sceneType);
    const characters = pickPeopleForSentence(fragment, signals.people);
    const importantObjects = pickObjectsForSentence(fragment, signals.objects);
    const setting = pickSettingPhrase(fragment, signals.places, sceneType);

    return {
      sceneTitle: makeSceneTitle(fragment, idx),
      caption: buildCaption(fragment),
      sceneType,
      visualDetails: {
        characters: characters.length ? characters : signals.people.slice(0, 2),
        setting,
        importantObjects: importantObjects.length ? importantObjects : signals.objects.slice(0, 2),
        emotion,
        lighting: vdBase.lighting,
        colorPalette: vdBase.colorPalette,
      },
    };
  });
}

/**
 * One-line summary for UI (people · places · objects from parsed story)
 */
export function formatSignalsLine(s: StorySignals): string {
  const bits: string[] = [];
  if (s.people.length) bits.push(`People: ${s.people.slice(0, 5).join(", ")}`);
  if (s.places.length) bits.push(`Places: ${s.places.slice(0, 4).join(", ")}`);
  if (s.objects.length) bits.push(`Objects: ${s.objects.slice(0, 5).join(", ")}`);
  return bits.join(" · ");
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * EXAMPLE (same seed story as Living Archive — dumplings / Vancouver)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * import { generateScrapbookPages } from "./scrapbookGenerator";
 *
 * const entry: ArchiveEntry = {
 *   title: "The Fold That Seals the Love",
 *   person: "Mei-Ling Zhao",
 *   place: "Chengdu → Vancouver",
 *   culture: "Sichuan Chinese",
 *   story: `My grandmother made dumplings every Sunday...`,
 * };
 *
 * const pages = generateScrapbookPages(entry);
 * // pages.length === 5
 * // Each page.sceneTitle / caption / visualDetails tie to real sentences & keywords.
 *
 * Example shape of pages[0]:
 * {
 *   sceneTitle: "My grandmother made dumplings every Sunday",
 *   caption: "<first high-scoring sentence from the story>",
 *   sceneType: "cooking",
 *   visualDetails: {
 *     characters: ["grandmother", ...],
 *     setting: "The kitchen as it appears in this passage",
 *     importantObjects: ["dumpling", "recipe", ...],
 *     emotion: "warmth",
 *     lighting: "Warm steam-soft light...",
 *     colorPalette: "Honey, sesame brown..."
 *   }
 * }
 */
