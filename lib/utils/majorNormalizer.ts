/**
 * Major Normalization Utility (Improved)
 * Normalizes major variations by:
 * 1. Accepting pre-fetched major strings (no Firestore call)
 * 2. Detecting user-typed abbreviations ("CS", "BME") separately from full names
 * 3. Using length-guarded Levenshtein fuzzy matching
 * 4. Preferring formal multi-word names as canonical
 * 5. Caching results for 30 minutes
 */

import { ServerCache } from "@/lib/server-cache";

// ─── Levenshtein Distance ──────────────────────────────────────────────────
// Calculate similarity between two strings (0-1, where 1 is identical)
function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1,
        matrix[i - 1][j] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(aLen, bLen);
  return maxLen === 0 ? 1 : 1 - matrix[bLen][aLen] / maxLen;
}

// ─── Abbreviation Detection ────────────────────────────────────────────────
// Check if a string looks like a user-typed abbreviation (e.g., "CS", "BME", "EE")
function looksLikeAbbreviation(s: string): boolean {
  if (!s || s.length > 5) return false;
  // Must be a single token (no spaces), all uppercase, all letters
  return /^[A-Z]+$/.test(s) && !s.includes(" ");
}

// Generate canonical abbreviation from a major name
// "Computer Science" → "CS", "Biomedical Engineering" → "BE"
function generateAbbreviation(major: string): string {
  return major
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase())
    .join("")
    .slice(0, 4);
}

// ─── Formality Scoring ─────────────────────────────────────────────────────
// Prefer multi-word, title-cased names over abbreviations/contractions
function formalityScore(s: string): number {
  let score = 0;
  // Multi-word names (contains space) are more formal
  if (s.includes(" ")) score += 2;
  // Title-cased names are more formal than all-lowercase or all-uppercase
  if (s !== s.toLowerCase() && s !== s.toUpperCase()) score += 1;
  return score;
}

// ─── Fuzzy Matching Threshold ─────────────────────────────────────────────
// Length-aware threshold to avoid false positives on short strings
function getSimilarityThreshold(len: number): number | null {
  if (len < 6) return null; // Don't fuzzy-match very short strings
  if (len <= 10) return 0.82; // Higher threshold for medium strings
  return 0.75; // Standard threshold for longer strings
}

// ─── Cache Instance ────────────────────────────────────────────────────────
// 30 minutes in milliseconds
const CACHE_TTL = 30 * 60 * 1000;
const majorCache = new ServerCache<Record<string, string>>(CACHE_TTL);

// ─── Core Algorithm: Build Canonical Mapping ──────────────────────────────
/**
 * Groups similar majors and assigns a canonical (preferred) name to each group.
 * Pure data function — no Firestore calls.
 */
function buildCanonicalMapping(majors: (string | undefined | null)[]): Record<string, string> {
  // Collect all unique majors (normalized)
  const allMajors = majors
    .filter((major): major is string => !!major && major.trim().length > 0)
    .map((m) => m.trim());

  if (allMajors.length === 0) {
    return {};
  }

  // Count occurrences of each major string
  const majorCounts: Record<string, number> = {};
  for (const major of allMajors) {
    majorCounts[major] = (majorCounts[major] ?? 0) + 1;
  }

  // Group majors by similarity
  const groups: string[][] = [];
  const assigned = new Set<string>();

  for (const major of Object.keys(majorCounts)) {
    if (assigned.has(major)) continue;

    const group: string[] = [major];
    assigned.add(major);

    const majorLower = major.toLowerCase();
    const looksLikeAbbr = looksLikeAbbreviation(major);
    const majorAbbrev = generateAbbreviation(major);

    for (const other of Object.keys(majorCounts)) {
      if (assigned.has(other)) continue;

      const otherLower = other.toLowerCase();
      const otherLooksLikeAbbr = looksLikeAbbreviation(other);
      const otherAbbrev = generateAbbreviation(other);

      // 1. Exact match (case-insensitive)
      if (majorLower === otherLower) {
        group.push(other);
        assigned.add(other);
        continue;
      }

      // 2. Abbreviation match (only if seed looks like an abbreviation)
      // "CS" (seed) vs "Computer Science" (other) → does CS == generateAbbreviation("Computer Science")?
      if (looksLikeAbbr && !otherLooksLikeAbbr) {
        if (majorAbbrev.length > 0 && major.toUpperCase() === otherAbbrev) {
          group.push(other);
          assigned.add(other);
          continue;
        }
      }
      // Also handle: "Computer Science" (seed) vs "CS" (other typed as abbreviation)
      if (!looksLikeAbbr && otherLooksLikeAbbr) {
        if (otherAbbrev.length > 0 && other.toUpperCase() === majorAbbrev) {
          group.push(other);
          assigned.add(other);
          continue;
        }
      }

      // 3. Fuzzy match (length-guarded)
      const threshold = getSimilarityThreshold(Math.max(majorLower.length, otherLower.length));
      if (threshold !== null) {
        const similarity = levenshteinDistance(majorLower, otherLower);
        if (similarity >= threshold) {
          group.push(other);
          assigned.add(other);
          continue;
        }
      }
    }

    groups.push(group);
  }

  // For each group, pick canonical by formality, then frequency, then length
  const mapping: Record<string, string> = {};

  for (const group of groups) {
    const canonical = group.sort(
      (a, b) =>
        // Primary: formality score (multi-word, title-cased preferred)
        formalityScore(b) - formalityScore(a) ||
        // Secondary: frequency (more common preferred)
        (majorCounts[b] ?? 0) - (majorCounts[a] ?? 0) ||
        // Tertiary: length (longer preferred)
        b.length - a.length
    )[0];

    // Map all variations to the canonical form
    for (const variation of group) {
      mapping[variation] = canonical;
    }
  }

  return mapping;
}

// ─── Main Normalization Function ──────────────────────────────────────────
/**
 * Normalizes an array of major strings and returns aggregated counts.
 * Pure synchronous function — no async, no Firestore calls.
 * @param majors - Array of major strings from members
 * @returns Record mapping canonical major names to their counts
 */
export function normalizeMajors(majors: (string | undefined | null)[]): Record<string, number> {
  // Create a cache key from the sorted unique majors (fingerprint)
  const uniqueSorted = Array.from(
    new Set(majors.filter((m) => m?.trim()).map((m) => m?.toLowerCase()))
  ).sort();
  const cacheKey = `majors:${uniqueSorted.join("|")}`;

  // Get or build the canonical mapping (cached for 30 min)
  const canonicalMapping = majorCache.get(cacheKey, () =>
    Promise.resolve(buildCanonicalMapping(majors))
  ) as unknown as Record<string, string>;

  // Aggregate using the canonical mapping
  const aggregated: Record<string, number> = {};

  for (const major of majors) {
    if (!major || !major.trim()) continue;
    const trimmed = major.trim();
    const normalized = canonicalMapping[trimmed] ?? trimmed;
    aggregated[normalized] = (aggregated[normalized] ?? 0) + 1;
  }

  return aggregated;
}

// ─── Cache Invalidation ───────────────────────────────────────────────────
/**
 * Manually invalidate all major normalization caches
 * (e.g., after a batch member import)
 */
export function invalidateMajorCache(): void {
  majorCache.clear();
}
