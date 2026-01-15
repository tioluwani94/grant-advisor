import {
  CharitySearchResult,
  CharityProfile,
  CharityGeographicData,
} from "@/types";
import { LOCAL_AUTHORITY_TO_REGION } from "./data";

const CHARITY_COMMISSION_API_URL =
  process.env.NEXT_PUBLIC_CHARITY_COMMISSION_API_URL!;

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

async function fetchFromApi<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.NEXT_PUBLIC_CHARITY_COMMISSION_API_KEY;

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (apiKey) {
    headers["Ocp-Apim-Subscription-Key"] = apiKey;
  }

  const response = await fetch(`${CHARITY_COMMISSION_API_URL}${endpoint}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `Charity Commission API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Search for charities by name or registration number
 * @param query - Search query (charity name or registration number)
 * @returns Array of matching charities
 */
export async function searchCharities(
  query: string
): Promise<CharitySearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = getCached<CharitySearchResult[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const data = await fetchFromApi<Array<CharitySearchResult>>(
      `/searchCharityName/${encodeURIComponent(query)}`
    );

    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error searching charities:", error);
    throw new Error("Failed to search charities. Please try again.");
  }
}

/**
 * Get detailed charity profile by registration number
 * @param registrationNumber - Charity registration number
 * @returns Detailed charity profile
 */
export async function getCharityProfile(
  registrationNumber: number,
  suffix: number
): Promise<CharityProfile> {
  if (!registrationNumber) {
    throw new Error("Registration number is required");
  }

  const cacheKey = `charity:${registrationNumber}`;
  const cached = getCached<CharityProfile>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const data = await fetchFromApi<CharityProfile>(
      `/allcharitydetailsV2/${encodeURIComponent(registrationNumber)}/${encodeURIComponent(suffix)}`
    );

    setCache(cacheKey, data);
    return data;
  } catch (error) {
    console.error("Error fetching charity profile:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch charity profile. Please try again.");
  }
}

// Mapping from Charity Commission classification codes to standardized cause areas
const CLASSIFICATION_CODE_MAP: Record<string, string> = {
  // "What" classifications (100 series)
  "101": "Education and training",
  "102": "Arts and culture",
  "103": "Health and wellbeing",
  "104": "Disability",
  "105": "Poverty and social exclusion",
  "106": "Housing and homelessness",
  "107": "Criminal justice",
  "108": "Environment and conservation",
  "109": "Animal welfare",
  "110": "Faith and religion",
  "111": "Community development",
  "112": "International development",
  "113": "Sport and recreation",
  "114": "Science and research",
  "115": "Human rights",
};

// Fallback keyword mapping for classification descriptions
const CLASSIFICATION_DESC_KEYWORDS: Record<string, string[]> = {
  "Arts and culture": [
    "art",
    "culture",
    "museum",
    "theatre",
    "music",
    "heritage",
  ],
  "Education and training": [
    "education",
    "school",
    "training",
    "learning",
    "student",
    "academic",
  ],
  "Health and wellbeing": [
    "health",
    "medical",
    "saving of lives",
    "wellness",
    "care",
  ],
  "Environment and conservation": [
    "environment",
    "conservation",
    "wildlife",
    "nature",
    "climate",
  ],
  "Community development": ["community", "recreation", "facilities", "civic"],
  "Housing and homelessness": [
    "housing",
    "homeless",
    "shelter",
    "accommodation",
  ],
  "Poverty and social exclusion": [
    "poverty",
    "relief of poverty",
    "disadvantaged",
    "deprived",
  ],
  "Children and young people": ["children", "young people", "youth", "child"],
  "Older people": ["elderly", "older people", "senior", "pensioner", "aged"],
  Disability: ["disability", "disabled", "disabilities"],
  "Mental health": ["mental health", "counselling", "therapy", "psychological"],
  "Criminal justice": ["offender", "prison", "rehabilitation", "criminal"],
  "Employment and skills": [
    "employment",
    "job",
    "career",
    "skill",
    "workforce",
  ],
  "Sport and recreation": [
    "sport",
    "recreation",
    "fitness",
    "physical activity",
  ],
  "Faith and religion": [
    "faith",
    "religion",
    "religious",
    "church",
    "mosque",
    "temple",
    "spiritual",
  ],
  "Human rights": ["human rights", "equality", "justice", "advocacy"],
  "International development": [
    "international",
    "overseas",
    "global",
    "developing countries",
  ],
  "Animal welfare": ["animal", "pet", "wildlife rescue"],
  "Science and research": ["science", "research", "scientific"],
  "Infrastructure and capacity building": [
    "capacity",
    "infrastructure",
    "sector support",
  ],
};

interface WhoWhatWhereEntry {
  classification_code: string;
  classification_type: string;
  classification_desc: string;
}

/**
 * Extract cause areas from Charity Commission who_what_where data
 * Filters for "What" classification types and maps them to standardized cause areas
 */
export function extractCauseAreas(
  whoWhatWhere: WhoWhatWhereEntry[] | null | undefined
): string[] {
  if (!whoWhatWhere || whoWhatWhere.length === 0) return [];

  const matchedAreas = new Set<string>();

  // Filter for "What" classification type entries
  const whatClassifications = whoWhatWhere.filter(
    (entry) => entry.classification_type === "What"
  );

  for (const entry of whatClassifications) {
    // First try to map by classification code
    const mappedByCode = CLASSIFICATION_CODE_MAP[entry.classification_code];
    if (mappedByCode) {
      matchedAreas.add(mappedByCode);
      continue;
    }

    // Fallback: match by keywords in the description
    const descLower = entry.classification_desc.toLowerCase();
    for (const [causeArea, keywords] of Object.entries(
      CLASSIFICATION_DESC_KEYWORDS
    )) {
      if (keywords.some((keyword) => descLower.includes(keyword))) {
        matchedAreas.add(causeArea);
        break;
      }
    }
  }

  return Array.from(matchedAreas);
}

/**
 * Extract geographic focus from Charity Commission data
 * Maps local authorities to standardized UK regions
 */
export function extractGeographicFocus(
  charityData: CharityGeographicData | null | undefined
): string[] {
  if (!charityData) return [];

  const regions = new Set<string>();

  // Process local authorities
  if (charityData.CharityAoOLocalAuthority?.length) {
    for (const area of charityData.CharityAoOLocalAuthority) {
      // Check if Welsh
      if (area.welsh_ind) {
        regions.add("Wales");
        continue;
      }

      // Try to map local authority to region
      const mappedRegion = LOCAL_AUTHORITY_TO_REGION[area.local_authority];
      if (mappedRegion) {
        regions.add(mappedRegion);
      } else if (area.metropolitan_county) {
        // Try metropolitan county
        const metroRegion = LOCAL_AUTHORITY_TO_REGION[area.metropolitan_county];
        if (metroRegion) {
          regions.add(metroRegion);
        }
      }
    }
  }

  // Process regions directly if available
  if (charityData.CharityAoORegion?.length) {
    for (const area of charityData.CharityAoORegion) {
      const regionName = area.region;
      // Map to standardized region names
      if (regionName.toLowerCase().includes("scotland")) {
        regions.add("Scotland");
      } else if (regionName.toLowerCase().includes("wales")) {
        regions.add("Wales");
      } else if (regionName.toLowerCase().includes("northern ireland")) {
        regions.add("Northern Ireland");
      } else if (regionName.toLowerCase().includes("east midlands")) {
        regions.add("England - East Midlands");
      } else if (
        regionName.toLowerCase().includes("east of england") ||
        regionName.toLowerCase().includes("eastern")
      ) {
        regions.add("England - East of England");
      } else if (regionName.toLowerCase().includes("london")) {
        regions.add("England - London");
      } else if (regionName.toLowerCase().includes("north east")) {
        regions.add("England - North East");
      } else if (regionName.toLowerCase().includes("north west")) {
        regions.add("England - North West");
      } else if (regionName.toLowerCase().includes("south east")) {
        regions.add("England - South East");
      } else if (regionName.toLowerCase().includes("south west")) {
        regions.add("England - South West");
      } else if (regionName.toLowerCase().includes("west midlands")) {
        regions.add("England - West Midlands");
      } else if (regionName.toLowerCase().includes("yorkshire")) {
        regions.add("England - Yorkshire and The Humber");
      }
    }
  }

  // Process country/continent if available (indicates international or UK-wide)
  if (charityData.CharityAoOCountryContinent?.length) {
    // If operating at country/continent level, likely UK-wide or international
    regions.add("UK-wide");
  }

  return Array.from(regions);
}
