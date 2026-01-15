import { getCharityProfile, searchCharities } from "@/lib/charity-commission";
import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// GET: Search charities by name
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const charityNumberParam = searchParams.get("number");
  const charitySuffixParam = searchParams.get("suffix");

  // Check if both params are provided (suffix can be 0, which is falsy)
  if (charityNumberParam !== null && charitySuffixParam !== null) {
    const charityNumber = Number(charityNumberParam);
    const charitySuffix = Number(charitySuffixParam);

    try {
      const charity = await getCharityProfile(charityNumber, charitySuffix);

      if (!charity) {
        return NextResponse.json(
          { error: "Charity not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        charity,
      });
    } catch (error) {
      console.error("Error fetching charity:", error);
      return NextResponse.json(
        { error: "Failed to fetch charity details" },
        { status: 500 }
      );
    }
  }

  // Otherwise, search by name
  if (!query || query.length < 3) {
    console.log("hewre");
    return NextResponse.json(
      { error: "Search query must be at least 3 characters" },
      { status: 400 }
    );
  }

  try {
    const results = await searchCharities(query);

    return NextResponse.json({
      results,
    });
  } catch (error) {
    console.error("Error searching charities:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
