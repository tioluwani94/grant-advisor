import { NextRequest, NextResponse } from "next/server";
import { matchFunders } from "@/lib/ai/matching";
import type { CharityProfile, FunderMatch } from "@/types";

interface MatchRequest {
  charityProfile: CharityProfile;
}

interface MatchResponse {
  success: boolean;
  matches?: FunderMatch[];
  error?: string;
  message?: string;
}

/**
 * POST /api/match
 * Trigger AI-powered funder matching for a charity profile
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<MatchResponse>> {
  try {
    // Parse request body
    const body: MatchRequest = await request.json();

    if (!body.charityProfile) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing charity profile in request body",
        },
        { status: 400 }
      );
    }

    const { charityProfile } = body;

    // Validate required fields
    if (!charityProfile.charity_name || !charityProfile.reg_charity_number) {
      return NextResponse.json(
        {
          success: false,
          error: "Charity profile must include name and registration number",
        },
        { status: 400 }
      );
    }

    // Log the matching request
    console.log(
      `Starting AI matching for charity: ${charityProfile.charity_name} (${charityProfile.reg_charity_number})`
    );

    // Call AI matching function
    const matches = await matchFunders(charityProfile);

    // Log results
    console.log(
      `Found ${matches.length} matching funders for ${charityProfile.charity_name}`
    );

    // Return successful response
    return NextResponse.json({
      success: true,
      matches,
      message: `Successfully matched ${matches.length} funders`,
    });
  } catch (error) {
    console.error("Error in /api/match:", error);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/match
 * Returns API information (not used for matching)
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "/api/match",
    method: "POST",
    description: "AI-powered funder matching for UK charities",
    usage: {
      method: "POST",
      body: {
        charityProfile: {
          charity_name: "string",
          reg_charity_number: "number",
          latest_income: "number",
          latest_expenditure: "number",
          who_what_where: "array",
          CharityAoORegion: "array (optional)",
          CharityAoOLocalAuthority: "array (optional)",
        },
      },
      response: {
        success: "boolean",
        matches: "FunderMatch[] (array of matched funders with scores)",
        message: "string",
      },
    },
    example_request: {
      charityProfile: {
        charity_name: "Example Charity",
        reg_charity_number: 123456,
        latest_income: 50000,
        latest_expenditure: 45000,
        who_what_where: [
          {
            classification_type: "What",
            classification_desc: "Youth services",
          },
          {
            classification_type: "Who",
            classification_desc: "Children and young people",
          },
        ],
      },
    },
  });
}
