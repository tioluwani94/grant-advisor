"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  DollarSign,
  Target,
  TrendingUp,
} from "lucide-react";
import type { Organisation, Grant } from "@/types";
import { getFunderDetails } from "@/lib/ai/matching";

interface FunderDetailsData {
  funder: Organisation;
  grants: Grant[];
  stats: {
    total_grants: number;
    avg_amount: number;
    date_range: { earliest: string; latest: string };
  };
}

export default function FunderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [funderData, setFunderData] = useState<FunderDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFunderDetails() {
      try {
        setLoading(true);
        setError(null);

        const orgId = params.orgId as string;
        const data = await getFunderDetails(orgId);
        setFunderData(data);
      } catch (err) {
        console.error("Error fetching funder details:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchFunderDetails();
  }, [params.orgId]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <Skeleton className="mb-8 h-12 w-3/4" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="mt-8 h-96 w-full" />
      </div>
    );
  }

  if (error || !funderData) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Funder</AlertTitle>
          <AlertDescription>{error || "Funder not found"}</AlertDescription>
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

  const { funder, grants, stats } = funderData;

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
        <h1 className="mb-2 text-3xl font-bold text-zinc-900">{funder.name}</h1>
        <p className="text-sm text-zinc-500">
          Organisation ID: {funder.org_id}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="Total Grants"
          value={stats.total_grants.toLocaleString()}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Average Grant"
          value={`£${Math.round(stats.avg_amount).toLocaleString()}`}
        />
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="First Grant"
          value={
            stats.date_range.earliest
              ? new Date(stats.date_range.earliest).toLocaleDateString(
                  "en-GB",
                  { year: "numeric", month: "short" }
                )
              : "N/A"
          }
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Latest Grant"
          value={
            stats.date_range.latest
              ? new Date(stats.date_range.latest).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "short",
                })
              : "N/A"
          }
        />
      </div>

      {/* Grant History Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Grant History</CardTitle>
        </CardHeader>
        <CardContent>
          {grants.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Grants Found</AlertTitle>
              <AlertDescription>
                No grant data available for this funder.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Description
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grants.slice(0, 20).map((grant) => (
                    <TableRow key={grant.grant_id}>
                      <TableCell className="font-medium">
                        {grant.title || "Untitled Grant"}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600">
                        {grant.recipient_org_id || "Unknown"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-semibold">
                        £{grant.amount_awarded?.toLocaleString() || "0"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {grant.award_date
                          ? new Date(grant.award_date).toLocaleDateString(
                              "en-GB",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell className="hidden max-w-xs truncate text-sm text-zinc-600 md:table-cell">
                        {grant.description
                          ? grant.description.substring(0, 100) + "..."
                          : "No description"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Similar Charities Funded Section */}
      <SimilarCharitiesSection grants={grants} />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-zinc-100 p-2 text-zinc-600">{icon}</div>
          <div>
            <p className="text-sm text-zinc-600">{label}</p>
            <p className="text-xl font-bold text-zinc-900">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SimilarCharitiesSection({ grants }: { grants: Grant[] }) {
  // Group grants by recipient to find patterns
  const recipientGrants = grants.reduce(
    (acc, grant) => {
      if (grant.recipient_org_id) {
        if (!acc[grant.recipient_org_id]) {
          acc[grant.recipient_org_id] = [];
        }
        acc[grant.recipient_org_id].push(grant);
      }
      return acc;
    },
    {} as Record<string, Grant[]>
  );

  // Get top recipients (those who received multiple grants)
  const topRecipients = Object.entries(recipientGrants)
    .filter(([, recipientGrants]) => recipientGrants.length > 0)
    .map(([orgId, grants]) => ({
      orgId,
      grants,
      totalAmount: grants.reduce((sum, g) => sum + (g.amount_awarded || 0), 0),
      grantCount: grants.length,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 10);

  if (topRecipients.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Similar Charities Funded</CardTitle>
        <p className="text-sm text-zinc-600">
          Organizations that have received grants from this funder
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topRecipients.map(({ orgId, grants, totalAmount, grantCount }) => {
            const latestGrant = grants.sort(
              (a, b) =>
                new Date(b.award_date).getTime() -
                new Date(a.award_date).getTime()
            )[0];

            return (
              <Card key={orgId} className="bg-zinc-50">
                <CardContent className="pt-6">
                  <div className="mb-3">
                    <h4 className="font-semibold text-zinc-900">
                      {latestGrant.title || "Organization"}
                    </h4>
                    <p className="text-xs text-zinc-500">{orgId}</p>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600">Total Granted:</span>
                      <span className="font-semibold text-zinc-900">
                        £{totalAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600">Number of Grants:</span>
                      <Badge variant="secondary">{grantCount}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-600">Latest Grant:</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(latestGrant.award_date).toLocaleDateString(
                          "en-GB",
                          { year: "numeric", month: "short" }
                        )}
                      </span>
                    </div>
                  </div>

                  {latestGrant.description && (
                    <div className="mt-3 border-t border-zinc-200 pt-3">
                      <p className="text-xs text-zinc-600">
                        {latestGrant.description.substring(0, 120)}...
                      </p>
                    </div>
                  )}

                  {latestGrant.classifications &&
                    latestGrant.classifications.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {latestGrant.classifications
                          .slice(0, 3)
                          .map((classification, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs"
                            >
                              {classification.title}
                            </Badge>
                          ))}
                      </div>
                    )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
