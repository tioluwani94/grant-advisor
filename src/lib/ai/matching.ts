import { getClaudeClient } from "./claude-client";
import { supabase } from "@/lib/supabase";
import type {
  CharityProfile,
  FunderMatch,
  Organisation,
  Grant,
} from "@/types";

interface FunderWithGrants {
  funder: Organisation;
  grants: Grant[];
}

interface MatchResponseItem {
  funder_org_id: string;
  match_score: number;
  score_breakdown: {
    mission_alignment: number;
    geographic_fit: number;
    size_compatibility: number;
    activity_level: number;
    historical_precedent: number;
  };
  reasoning: string;
  similar_charities_funded?: Array<{
    charity_name: string;
    grant_amount: number;
    award_date: string;
    grant_purpose: string;
  }>;
}

/**
 * System prompt for AI funder matching
 * This instructs Claude on how to analyze and score funder matches
 */
const MATCHING_SYSTEM_PROMPT = `You are an expert grant advisor for UK charities. Your role is to analyze charity profiles and match them with the most suitable funders based on historical grant data.

When analyzing matches, consider these key factors:

1. **Mission Alignment** (0-100): How well does the funder's historical giving align with the charity's charitable purposes, activities, and beneficiaries?
2. **Geographic Fit** (0-100): Does the funder support organizations in the charity's geographic area?
3. **Size Compatibility** (0-100): Is the charity's income level within the typical range of organizations this funder supports?
4. **Activity Level** (0-100): How recently and frequently has this funder made grants? Are they actively giving?
5. **Historical Precedent** (0-100): Has the funder supported similar charities in the past?

For each funder, provide:
- Overall match score (weighted average of the 5 factors)
- Score breakdown for each factor
- Clear reasoning explaining why this funder is a good match
- Specific examples of similar charities they've funded

Be specific, evidence-based, and actionable in your recommendations.`;

/**
 * Match a charity profile with the most suitable funders from the database
 */
export async function matchFunders(
  charityProfile: CharityProfile
): Promise<FunderMatch[]> {
  try {
    // Step 1: Query funders with their grant statistics
    const { data: funders, error: fundersError } = await supabase
      .from("organisations")
      .select("*")
      .eq("is_funder", true)
      .order("funder_stats->aggregate->grants", { ascending: false })
      .limit(50);

    if (fundersError) {
      throw new Error(`Failed to fetch funders: ${fundersError.message}`);
    }

    if (!funders || funders.length === 0) {
      throw new Error("No funders found in database");
    }

    // Step 2: For each funder, fetch sample grants to analyze
    const fundersWithGrants = await Promise.all(
      funders.map(async (funder) => {
        const { data: grants, error: grantsError } = await supabase
          .from("grants")
          .select("*")
          .eq("funder_org_id", funder.org_id)
          .order("award_date", { ascending: false })
          .limit(10);

        if (grantsError) {
          console.error(
            `Error fetching grants for ${funder.org_id}:`,
            grantsError
          );
          return { funder, grants: [] };
        }

        return { funder, grants: grants || [] };
      })
    );

    // Step 3: Build the AI analysis prompt
    const userPrompt = buildMatchingPrompt(charityProfile, fundersWithGrants);

    // Step 4: Call Claude AI for analysis
    const claude = getClaudeClient();
    const response = await claude.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8000,
      temperature: 0.3,
      system: MATCHING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // Step 5: Parse the AI response
    const textContent = response.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in AI response");
    }

    const matches = parseMatchingResponse(textContent.text, fundersWithGrants);

    // Step 6: Sort by match score and return top 20
    return matches.sort((a, b) => b.match_score - a.match_score).slice(0, 20);
  } catch (error) {
    console.error("Error in matchFunders:", error);
    throw error;
  }
}

/**
 * Build the prompt for AI analysis
 */
function buildMatchingPrompt(
  charity: CharityProfile,
  fundersWithGrants: FunderWithGrants[]
): string {
  // Extract charity characteristics
  const activities =
    charity.who_what_where
      ?.filter((w) => w.classification_type === "What")
      .map((w) => w.classification_desc)
      .join(", ") || "Not specified";

  const beneficiaries =
    charity.who_what_where
      ?.filter((w) => w.classification_type === "Who")
      .map((w) => w.classification_desc)
      .join(", ") || "Not specified";

  const regions =
    charity.CharityAoORegion?.map((r) => r.region).join(", ") ||
    "Not specified";

  const localAuthorities =
    charity.CharityAoOLocalAuthority?.map((la) => la.local_authority).join(
      ", "
    ) || "Not specified";

  let prompt = `# Charity Profile to Match

**Charity Name:** ${charity.charity_name}
**Registration Number:** ${charity.reg_charity_number}
**Annual Income:** £${charity.latest_income?.toLocaleString() || "Not available"}
**Annual Expenditure:** £${charity.latest_expenditure?.toLocaleString() || "Not available"}

**Activities:** ${activities}
**Beneficiaries:** ${beneficiaries}
**Geographic Areas:**
- Regions: ${regions}
- Local Authorities: ${localAuthorities}

---

# Funders to Analyze

`;

  // Add funder information
  fundersWithGrants.forEach(({ funder, grants }, index) => {
    const funderStats = funder.funder_stats?.aggregate;
    const totalGrants = funderStats?.grants || 0;
    const avgAmount = funderStats?.currencies?.GBP?.avg || 0;
    const totalAmount = funderStats?.currencies?.GBP?.total || 0;

    prompt += `## Funder ${index + 1}: ${funder.name}
**Org ID:** ${funder.org_id}
**Total Grants Made:** ${totalGrants}
**Average Grant (GBP):** £${Math.round(avgAmount).toLocaleString()}
**Total Granted (GBP):** £${Math.round(totalAmount).toLocaleString()}
**Last Grant Date:** ${funder.last_grant_made_date || "Unknown"}

**Recent Grants (sample):**
${grants
  .slice(0, 5)
  .map(
    (grant, i) => `${i + 1}. ${grant.title || "Untitled"} - £${grant.amount_awarded?.toLocaleString() || "0"} (${grant.award_date})
   Recipient: ${grant.recipient_org_id || "Unknown"}
   ${grant.description ? `Description: ${grant.description.substring(0, 200)}...` : ""}`
  )
  .join("\n")}

---

`;
  });

  prompt += `
# Task

Analyze each funder above and score them for this charity. Return your response as a JSON array with this structure:

\`\`\`json
[
  {
    "funder_org_id": "GB-CHC-123456",
    "match_score": 85,
    "score_breakdown": {
      "mission_alignment": 90,
      "geographic_fit": 85,
      "size_compatibility": 80,
      "activity_level": 95,
      "historical_precedent": 75
    },
    "reasoning": "This funder has a strong track record of supporting [specific activities] in [specific regions]. Their average grant size of £X aligns well with this charity's income level. Recent grants to similar organizations include...",
    "similar_charities_funded": [
      {
        "charity_name": "Example Charity",
        "grant_amount": 50000,
        "award_date": "2023-06-15",
        "grant_purpose": "Core support for youth services"
      }
    ]
  }
]
\`\`\`

Focus on the top 15-20 most relevant funders. Be specific and evidence-based in your reasoning.`;

  return prompt;
}

/**
 * Parse the AI response into structured FunderMatch objects
 */
function parseMatchingResponse(
  responseText: string,
  fundersWithGrants: FunderWithGrants[]
): FunderMatch[] {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    const jsonText = jsonMatch ? jsonMatch[1] : responseText;

    const parsedMatches: MatchResponseItem[] = JSON.parse(jsonText);

    // Map the parsed data to our FunderMatch type
    return parsedMatches.map((match) => {
      // Find the corresponding funder
      const funderData = fundersWithGrants.find(
        (f) => f.funder.org_id === match.funder_org_id
      );

      if (!funderData) {
        throw new Error(`Funder ${match.funder_org_id} not found`);
      }

      return {
        funder: {
          org_id: funderData.funder.org_id,
          name: funderData.funder.name,
          is_funder: true,
          is_recipient: funderData.funder.is_recipient || false,
          funder_stats: funderData.funder.funder_stats,
          recipient_stats: funderData.funder.recipient_stats,
        } as Organisation,
        match_score: match.match_score,
        score_breakdown: match.score_breakdown,
        reasoning: match.reasoning,
        similar_charities_funded: match.similar_charities_funded || [],
      } as FunderMatch;
    });
  } catch (error) {
    console.error("Error parsing AI response:", error);
    console.error("Response text:", responseText);
    throw new Error("Failed to parse AI matching response");
  }
}

/**
 * Get detailed funder information with grant history
 */
export async function getFunderDetails(
  funderOrgId: string
): Promise<{
  funder: Organisation;
  grants: Grant[];
  stats: {
    total_grants: number;
    avg_amount: number;
    date_range: { earliest: string; latest: string };
  };
}> {
  // Fetch funder info
  const { data: funder, error: funderError } = await supabase
    .from("organisations")
    .select("*")
    .eq("org_id", funderOrgId)
    .single();

  if (funderError || !funder) {
    throw new Error(`Funder not found: ${funderOrgId}`);
  }

  // Fetch grants
  const { data: grants, error: grantsError } = await supabase
    .from("grants")
    .select("*")
    .eq("funder_org_id", funderOrgId)
    .order("award_date", { ascending: false })
    .limit(100);

  if (grantsError) {
    throw new Error(`Failed to fetch grants: ${grantsError.message}`);
  }

  // Calculate stats
  const validGrants = (grants || []).filter(
    (g) => g.award_date && g.amount_awarded
  );
  const dates = validGrants.map((g) => g.award_date).sort();

  const stats = {
    total_grants: validGrants.length,
    avg_amount:
      validGrants.reduce((sum, g) => sum + g.amount_awarded, 0) /
        validGrants.length || 0,
    date_range: {
      earliest: dates[0] || "",
      latest: dates[dates.length - 1] || "",
    },
  };

  return {
    funder: funder as Organisation,
    grants: (grants || []) as Grant[],
    stats,
  };
}
