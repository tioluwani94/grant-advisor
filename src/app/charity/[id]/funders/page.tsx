"use client";

import { DataFreshnessIndicator } from "@/components/data-freshness-indicator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CharityProfile, FunderMatch } from "@/types";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
  Target,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function FundersPage() {
  const params = useParams();
  const router = useRouter();
  const [matches, setMatches] = useState<FunderMatch[]>([]);
  const [charity, setCharity] = useState<CharityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMatches() {
      try {
        setLoading(true);
        setError(null);

        // Parse charity ID
        const id = params.id as string;
        const [registrationNumber, suffix] = id.split("-");

        // Fetch charity profile
        const charityProfile = await fetch(
          `/api/charities/search?number=${Number(registrationNumber)}&suffix=${Number(suffix)}`
        );
        const charityData = await charityProfile.json();
        if (charityData.error) {
          throw new Error(charityData.error);
        }
        setCharity(charityData.charity);

        // Call matching API
        const response = await fetch("/api/match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ charityProfile: charityData.charity }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch matches");
        }

        const data = await response.json();
        setMatches(data.matches || []);
      } catch (err) {
        console.error("Error fetching matches:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchMatches();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Skeleton className="mb-8 h-12 w-3/4" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Matches</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          onClick={() => router.back()}
          variant="ghost"
          className="mb-4"
          size="sm"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="mb-2 text-3xl font-bold text-zinc-900">
          Recommended Funders
        </h1>
        {charity && (
          <p className="text-lg text-zinc-600">
            For {charity.charity_name} - Found {matches.length} potential
            matches
          </p>
        )}
      </div>

      {/* Data Freshness Indicator */}
      <DataFreshnessIndicator />

      {/* Empty State */}
      {matches.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Matches Found</AlertTitle>
          <AlertDescription>
            We couldn&apos;t find any funders matching your charity&apos;s
            profile. This could be because:
            <ul className="mt-2 list-disc pl-6">
              <li>The database needs more grant data</li>
              <li>Your charity works in a very specialized area</li>
              <li>Try updating your charity profile information</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Funder Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {matches.map((match, index) => (
          <FunderCard
            key={match.funder.org_id}
            match={match}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
}

function FunderCard({ match, rank }: { match: FunderMatch; rank: number }) {
  const router = useRouter();
  const {
    funder,
    match_score,
    score_breakdown,
    reasoning,
    similar_charities_funded,
  } = match;

  // Calculate stats
  const totalGrants = funder.funder_stats?.aggregate?.grants || 0;
  const avgAmount = funder.funder_stats?.aggregate?.currencies?.GBP?.avg || 0;
  const lastGrantDate = funder.last_grant_made_date
    ? new Date(funder.last_grant_made_date).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
      })
    : "Unknown";

  const getScoreBadgeVariant = (
    score: number
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "outline";
  };

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="mb-2 flex items-start justify-between">
          <Badge variant="outline" className="text-xs">
            #{rank}
          </Badge>
          <Badge
            variant={getScoreBadgeVariant(match_score)}
            className="text-lg font-bold"
          >
            {match_score}%
          </Badge>
        </div>
        <CardTitle className="text-xl leading-tight">{funder.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center gap-1 text-zinc-500">
              <Target className="h-3 w-3" />
              <span>Total Grants</span>
            </div>
            <p className="font-semibold text-zinc-900">{totalGrants}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-zinc-500">
              <DollarSign className="h-3 w-3" />
              <span>Avg Grant</span>
            </div>
            <p className="font-semibold text-zinc-900">
              £{Math.round(avgAmount).toLocaleString()}
            </p>
          </div>
          <div className="col-span-2">
            <div className="flex items-center gap-1 text-zinc-500">
              <Calendar className="h-3 w-3" />
              <span>Last Grant</span>
            </div>
            <p className="font-semibold text-zinc-900">{lastGrantDate}</p>
          </div>
        </div>

        {/* Score Breakdown Accordion */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="breakdown" className="border-none">
            <AccordionTrigger className="text-sm font-medium hover:no-underline">
              View Score Breakdown
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {/* Each score factor */}
                <ScoreFactor
                  label="Mission Alignment"
                  score={score_breakdown.mission_alignment}
                />
                <ScoreFactor
                  label="Geographic Fit"
                  score={score_breakdown.geographic_fit}
                />
                <ScoreFactor
                  label="Size Compatibility"
                  score={score_breakdown.size_compatibility}
                />
                <ScoreFactor
                  label="Activity Level"
                  score={score_breakdown.activity_level}
                />
                <ScoreFactor
                  label="Historical Precedent"
                  score={score_breakdown.historical_precedent}
                />

                {/* AI Reasoning */}
                <div className="mt-4 rounded-md bg-zinc-50 p-3">
                  <p className="text-xs font-medium text-zinc-700">
                    AI Analysis:
                  </p>
                  <p className="mt-1 text-xs text-zinc-600">{reasoning}</p>
                </div>

                {/* Similar Charities */}
                {similar_charities_funded.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-zinc-700">
                      Similar Charities Funded:
                    </p>
                    <div className="space-y-2">
                      {similar_charities_funded
                        .slice(0, 3)
                        .map((example, i) => (
                          <div
                            key={i}
                            className="rounded border border-zinc-200 bg-white p-2 text-xs"
                          >
                            <p className="font-medium text-zinc-900">
                              {example.charity_name}
                            </p>
                            <p className="text-zinc-600">
                              £{example.grant_amount.toLocaleString()} -{" "}
                              {new Date(example.award_date).toLocaleDateString(
                                "en-GB",
                                { year: "numeric", month: "short" }
                              )}
                            </p>
                            {example.grant_purpose && (
                              <p className="mt-1 text-zinc-500">
                                {example.grant_purpose.substring(0, 80)}...
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* View Details Button */}
        <Button
          onClick={() => router.push(`/funder/${funder.org_id}`)}
          className="w-full"
          variant="outline"
        >
          View Full Profile
        </Button>
      </CardContent>
    </Card>
  );
}

function ScoreFactor({ label, score }: { label: string; score: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-gray-400";
  };

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-zinc-700">{label}</span>
        <span className="font-semibold text-zinc-900">{score}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          className={`h-full ${getColor(score)} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
