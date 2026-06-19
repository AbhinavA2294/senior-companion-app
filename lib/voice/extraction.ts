/**
 * Deterministic NLP extraction utilities for the voice booking feature.
 * Pure functions; no external API calls, no senior PII is consumed.
 * Reference date is injectable for testability.
 */

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const MONTH_NAMES: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  "twenty-one": 21, "twenty-two": 22, "twenty-three": 23,
  half: 0.5, quarter: 0.25,
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse a word-or-digit number from a string fragment. Returns null if not found. */
function parseNumber(text: string): number | null {
  const trimmed = text.trim().toLowerCase();
  if (NUMBER_WORDS[trimmed] !== undefined) return NUMBER_WORDS[trimmed];
  const n = parseFloat(trimmed);
  return isNaN(n) ? null : n;
}

/**
 * Extract a date from natural-language text.
 * Returns YYYY-MM-DD or null.
 */
export function extractDate(text: string, referenceDate: Date = new Date()): string | null {
  const lower = text.toLowerCase();
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);

  if (/\btoday\b/.test(lower)) return toISODate(ref);

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(ref);
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }

  // "next <day>" or just "<day>"
  const nextDayMatch = lower.match(/\b(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (nextDayMatch) {
    const targetDay = DAY_NAMES.indexOf(nextDayMatch[1]);
    const refDay = ref.getDay();
    let diff = targetDay - refDay;
    // "next <day>" always means at least 7 days ahead if same/earlier day
    if (nextDayMatch[0].startsWith("next") || diff <= 0) diff += 7;
    const d = new Date(ref);
    d.setDate(d.getDate() + diff);
    return toISODate(d);
  }

  // "this <day>" — nearest upcoming occurrence
  const thisDayMatch = lower.match(/\bthis\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (thisDayMatch) {
    const targetDay = DAY_NAMES.indexOf(thisDayMatch[1]);
    const refDay = ref.getDay();
    let diff = targetDay - refDay;
    if (diff <= 0) diff += 7;
    const d = new Date(ref);
    d.setDate(d.getDate() + diff);
    return toISODate(d);
  }

  // "in X days"
  const inDaysMatch = lower.match(/\bin\s+(\d+|[a-z\-]+)\s+days?\b/);
  if (inDaysMatch) {
    const n = parseNumber(inDaysMatch[1]);
    if (n !== null) {
      const d = new Date(ref);
      d.setDate(d.getDate() + n);
      return toISODate(d);
    }
  }

  // Month + day: "June 25", "June 25th", "25th June"
  const monthDayMatch = lower.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/
  );
  if (monthDayMatch) {
    const month = MONTH_NAMES[monthDayMatch[1]];
    const day = parseInt(monthDayMatch[2], 10);
    const d = new Date(ref.getFullYear(), month, day);
    if (d < ref) d.setFullYear(d.getFullYear() + 1);
    return toISODate(d);
  }

  // Numeric: MM/DD or MM-DD
  const numericMatch = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (numericMatch) {
    const month = parseInt(numericMatch[1], 10) - 1;
    const day = parseInt(numericMatch[2], 10);
    const year = numericMatch[3]
      ? parseInt(numericMatch[3].length === 2 ? `20${numericMatch[3]}` : numericMatch[3], 10)
      : ref.getFullYear();
    const d = new Date(year, month, day);
    return toISODate(d);
  }

  // "next week"
  if (/\bnext\s+week\b/.test(lower)) {
    const d = new Date(ref);
    d.setDate(d.getDate() + 7);
    return toISODate(d);
  }

  return null;
}

/**
 * Extract a 24-hour time string (HH:MM) from text. Returns null if not found.
 */
export function extractTime(text: string): string | null {
  const lower = text.toLowerCase();

  if (/\bnoon\b/.test(lower)) return "12:00";
  if (/\bmidnight\b/.test(lower)) return "00:00";

  // HH:MM AM/PM
  const hmAmPm = lower.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)\b/);
  if (hmAmPm) {
    let h = parseInt(hmAmPm[1], 10);
    const m = parseInt(hmAmPm[2], 10);
    if (hmAmPm[3] === "pm" && h !== 12) h += 12;
    if (hmAmPm[3] === "am" && h === 12) h = 0;
    return `${pad(h)}:${pad(m)}`;
  }

  // H AM/PM (no minutes)
  const hAmPm = lower.match(/\b(\d{1,2})\s*(am|pm)\b/);
  if (hAmPm) {
    let h = parseInt(hAmPm[1], 10);
    if (hAmPm[2] === "pm" && h !== 12) h += 12;
    if (hAmPm[2] === "am" && h === 12) h = 0;
    return `${pad(h)}:00`;
  }

  // "X o'clock"
  const oclockMatch = lower.match(/\b(\d{1,2}|[a-z]+)\s+o'?clock\b/);
  if (oclockMatch) {
    const n = parseNumber(oclockMatch[1]) ?? parseInt(oclockMatch[1], 10);
    if (!isNaN(n)) return `${pad(n)}:00`;
  }

  // Vague times
  if (/\bearly\s+morning\b|\bdawn\b/.test(lower)) return "07:00";
  if (/\bmorning\b/.test(lower)) return "09:00";
  if (/\bearly\s+afternoon\b/.test(lower)) return "13:00";
  if (/\blate\s+afternoon\b/.test(lower)) return "16:00";
  if (/\bafternoon\b/.test(lower)) return "14:00";
  if (/\bevening\b/.test(lower)) return "17:00";
  if (/\bnight\b/.test(lower)) return "19:00";

  return null;
}

/**
 * Extract visit duration in hours. Returns null if not found.
 */
export function extractDuration(text: string): number | null {
  const lower = text.toLowerCase();

  // "an hour and a half" / "one hour and a half"
  if (/\b(?:an?\s+|one\s+)?hour\s+and\s+(?:a\s+)?half\b/.test(lower)) return 1.5;

  // "X.Y hours" or "X hours"
  const decimalHours = lower.match(/\b(\d+\.?\d*)\s+hours?\b/);
  if (decimalHours) return parseFloat(decimalHours[1]);

  // "X and a half hours"
  const halfHours = lower.match(/\b(\d+|[a-z\-]+)\s+and\s+(?:a\s+)?half\s+hours?\b/);
  if (halfHours) {
    const n = parseNumber(halfHours[1]);
    if (n !== null) return n + 0.5;
  }

  // "three hours", "two hours"
  const wordHours = lower.match(/\b([a-z\-]+)\s+hours?\b/);
  if (wordHours) {
    const n = parseNumber(wordHours[1]);
    if (n !== null) return n;
  }

  // "an hour"
  if (/\ban\s+hour\b/.test(lower)) return 1;
  if (/\bone\s+hour\b/.test(lower)) return 1;

  // "90 minutes", "30 minutes"
  const minMatch = lower.match(/\b(\d+|[a-z\-]+)\s+min(?:utes?)?\b/);
  if (minMatch) {
    const n = parseNumber(minMatch[1]) ?? parseFloat(minMatch[1]);
    if (!isNaN(n)) return n / 60;
  }

  return null;
}

const ACTIVITY_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  {
    pattern: /\b(doctor|physician|cardio|oncol|cardiology|orthopedic|surgery|clinic|hospital|chemo|dialysis|appointment\s+chaperone|medical\s+appointment|specialist)\b/i,
    name: "Doctor Appointment Chaperone",
  },
  {
    pattern: /\b(park|walk|stroll|garden|outdoor|nature|trail|hike)\b/i,
    name: "Walk or Park Visit",
  },
  {
    pattern: /\b(café|cafe|coffee|restaurant|lunch|dinner|brunch|meal|dining|eat out)\b/i,
    name: "Café or Restaurant",
  },
  {
    pattern: /\b(grocery|groceries|shopping|supermarket|pharmacy|drug store|errand|errands)\b/i,
    name: "Grocery Shopping",
  },
  {
    pattern: /\b(church|temple|mosque|synagogue|religious|faith|cultural|worship|service)\b/i,
    name: "Religious or Cultural Program",
  },
  {
    pattern: /\b(social|event|gathering|party|celebration|community\s+center|senior\s+center)\b/i,
    name: "Social Event",
  },
  {
    pattern: /\b(conversation|talk|chat|company|companionship|visit|just\s+talk)\b/i,
    name: "Conversation and Companionship",
  },
  {
    pattern: /\b(read|reading|book|game|chess|puzzle|board\s+game|crossword|card\s+game)\b/i,
    name: "Reading or Games",
  },
  {
    pattern: /\b(tech|technology|phone|smartphone|computer|tablet|internet|email|online|video\s+call)\b/i,
    name: "Technology Assistance",
  },
];

/**
 * Extract the most likely activity type name from text.
 * Falls back to null if nothing matches.
 */
export function extractActivityType(
  text: string,
  availableActivityTypes: string[] = []
): string | null {
  // Try to match against available DB activity types first
  if (availableActivityTypes.length > 0) {
    const lower = text.toLowerCase();
    for (const name of availableActivityTypes) {
      const words = name
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 4);
      if (words.some((w) => lower.includes(w))) return name;
    }
  }

  // Fall back to built-in patterns
  for (const { pattern, name } of ACTIVITY_PATTERNS) {
    if (pattern.test(text)) return name;
  }

  // If the word "appointment" appears anywhere, default to Doctor Appointment Chaperone
  if (/\bappointment\b/i.test(text)) return "Doctor Appointment Chaperone";

  return null;
}

const SENIOR_RELATIONSHIP_WORDS: Record<string, string> = {
  father: "father", dad: "father", papa: "father",
  mother: "mother", mom: "mother", mama: "mother", mum: "mother",
  husband: "husband",
  wife: "wife",
  grandfather: "grandfather", grandpa: "grandfather", granddad: "grandfather",
  grandmother: "grandmother", grandma: "grandmother", granny: "grandmother",
  uncle: "uncle", aunt: "aunt",
  brother: "brother", sister: "sister",
  "father-in-law": "father-in-law", "mother-in-law": "mother-in-law",
};

/**
 * Extract a hint about who the senior is (e.g. "father", "mother").
 */
export function extractSeniorHint(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [word, normalized] of Object.entries(SENIOR_RELATIONSHIP_WORDS)) {
    if (new RegExp(`\\bmy\\s+${word}\\b`).test(lower)) return normalized;
  }
  // Without "my" prefix
  for (const [word, normalized] of Object.entries(SENIOR_RELATIONSHIP_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) return normalized;
  }
  return null;
}

const MEDICAL_KEYWORDS = [
  "cardiology", "oncology", "chemotherapy", "radiation", "surgery", "medication",
  "prescription", "diagnosis", "diagnosed", "treatment", "insulin", "dialysis",
  "chemo", "biopsy", "mri", "x-ray", "xray", "ct scan", "ultrasound", "blood test",
  "lab test", "anesthesia", "rehabilitation", "rehab", "physical therapy", "occupational therapy",
  "neurologist", "cardiologist", "oncologist", "dermatologist", "orthopedic",
];

/**
 * Returns true if the text contains medical keywords that warrant the
 * non-medical-care disclaimer to be highlighted.
 */
export function detectMedicalKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return MEDICAL_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Extract a destination (place being traveled to) from text.
 */
export function extractDestination(text: string): string | null {
  // "to <DestinationName>" where destination is capitalized
  const toMatch = text.match(/\bto\s+([A-Z][A-Za-z\s,]+?)(?:\s+(?:on|at|for|next|this|in)\b|[,.]|$)/);
  if (toMatch) {
    const candidate = toMatch[1].trim();
    if (candidate.split(/\s+/).length <= 6 && candidate.length > 2) return candidate;
  }
  // "at <DestinationName>"
  const atMatch = text.match(/\bat\s+([A-Z][A-Za-z\s,]+?)(?:\s+(?:on|for|next|this|in)\b|[,.]|$)/);
  if (atMatch) {
    const candidate = atMatch[1].trim();
    if (candidate.split(/\s+/).length <= 6 && candidate.length > 2) return candidate;
  }
  return null;
}

/**
 * Extract any leftover context as notes (after removing matched entities).
 * Strips personal relationship words and returns remaining context.
 */
export function extractNotes(text: string): string | null {
  // Remove common structural phrases and keep remaining context
  const stripped = text
    .replace(/\b(?:please|i need|i'd like|we need|could you|can you|find|someone to|accompany|next|this|my (?:mother|father|mom|dad|wife|husband|grandmother|grandfather|grandma|grandpa|aunt|uncle|sister|brother)['\s]?s?)\b/gi, " ")
    .replace(/\b(?:at|to|from|for|on|in|about|around|approximately|roughly)\b/gi, " ")
    .replace(/\d+[:]\d+/g, " ")
    .replace(/\b(?:am|pm|monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next week|morning|afternoon|evening|noon|midnight)\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s+hours?\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return stripped.length > 3 ? stripped : null;
}
