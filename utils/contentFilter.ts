/**
 * Advanced Content Filtering Logic for Pixent
 * Focused on catching misleading titles and deep-scanning metadata.
 */

export const ADULT_KEYWORDS = [
  // --- Explicit Adult ---
  "porn", "sexy", "naked", "nude", "hentai", "sex", "xxx", "erotic", "vulgar", "nsfw",
  "adult content", "racy", "explicit", "uncensored", "taboo",
  "جنس", "اباحي", "سكس", "نيك", "منيوك", "شرموطة", "قحبة", "عرص", "ديوث",
  "بورن", "مضاجعة", "جماع", "سحاق", "شاذ", "مثليين", "لواط", "قذف", "شهوة",
  "امتاع", "استمناء", "عادة سرية", "افلام للكبار", "مساج حار", "أفلام ممنوعة",

  // --- Body Parts & Suggestive ---
  "ass", "boobs", "breast", "penis", "vagina", "butt", "cleavage", "thong", "abs",
  "ثدي", "مؤخرة", "عورة", "عارية", "عاري", "قضيب", "كس", "طيز", "نهد", "حلمة", "خصية",
  "قبلة", "بوس", "شفايف", "مص", "لحس", "تفعيص",

  // --- Misleading / Gray Area (Clothing & Scenarios) ---
  "bikini", "lingerie", "underwear", "bra", "panties", "swimsuit", "topless",
  "pantyhose", "stockings", "glamour", "boudoir", "beachwear", "mini skirt",
  "ملابس داخلية", "بيكيني", "لانجري", "مايوه", "تنورة قصيرة", "فستان قصير",
  "شفاف", "ملابس نوم", "قميص نوم", "استعراض ملابس", "عارضة ازياء مثيرة",

  // --- High Risk "Normal" Keywords (Must be checked in tags too) ---
  "fashion show", "lingerie show", "catwalk", "lingerie model", "bikini model",
  "sensual", "seductive", "hot girl", "hot man", "fetish", "kink", "romance", "couple",
  "اغراء", "مثير", "فاتنة", "رومانسي", "حب", "غرام"
];

export const SAFE_DEFAULT_QUERIES = [
  "cars",
  "cityscape",
  "nature",
  "forest",
  "mountains",
  "luxury cars",
  "modern architecture",
  "street food",
  "coffee",
  "technology",
  "space",
  "abstract background",
  "supercars",
  "travel",
  "ocean",
  "wildlife",
];

export function getRandomSafeQuery(): string {
  return SAFE_DEFAULT_QUERIES[Math.floor(Math.random() * SAFE_DEFAULT_QUERIES.length)];
}

/**
 * Checks if a piece of content is potentially unsafe based on multiple metadata fields.
 * This is the "Advanced" scan that looks beyond just the title.
 */
export function isUnsafeContent(data: {
  title?: string;
  tags?: string[];
  description?: string;
  creatorName?: string;
}): boolean {
  const fieldsToScan = [
    data.title,
    data.description,
    data.creatorName,
    ...(data.tags || []),
  ].filter(Boolean) as string[];

  for (const field of fieldsToScan) {
    const lowerField = field.toLowerCase();

    // Check for direct matches
    if (ADULT_KEYWORDS.some(keyword => lowerField.includes(keyword.toLowerCase()))) {
      return true;
    }

    // Advanced: Check for combinations that imply adult content in "gray area" titles
    // e.g., "Summer" + "Bikini" or "Fashion" + "Lingerie"
    if (
      (lowerField.includes("fashion") && (lowerField.includes("lingerie") || lowerField.includes("bikini"))) ||
      (lowerField.includes("summer") && lowerField.includes("bikini")) ||
      (lowerField.includes("girl") && lowerField.includes("hot"))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Basic check for user search queries to prevent searching for banned terms.
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return "";
  const lowerQuery = query.toLowerCase();
  if (ADULT_KEYWORDS.some((keyword) => lowerQuery.includes(keyword.toLowerCase()))) {
    return "";
  }
  return query;
}

/**
 * Legacy support for older code - checks if text contains adult content.
 */
export function containsAdultContent(text: string): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return ADULT_KEYWORDS.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}
