"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export function DataFreshnessIndicator() {
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLastSync() {
      try {
        const { data, error } = await supabase
          .from("sync_logs")
          .select("completed_at")
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error("Error fetching sync logs:", error);
          return;
        }

        if (data && data.completed_at) {
          setLastSync(data.completed_at);

          // Check if data is stale (>14 days old)
          const syncDate = new Date(data.completed_at);
          const daysSinceSync = Math.floor(
            (Date.now() - syncDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          setIsStale(daysSinceSync > 14);
        }
      } catch (err) {
        console.error("Error checking data freshness:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLastSync();
  }, []);

  if (loading || !lastSync) {
    return null;
  }

  const lastSyncDate = new Date(lastSync).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isStale) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Grant Data May Be Outdated</AlertTitle>
        <AlertDescription className="mt-2">
          The grant database was last updated on {lastSyncDate}, which is more
          than 14 days ago. The recommendations may not reflect the most recent
          funding opportunities.
          <Button
            variant="outline"
            size="sm"
            className="ml-4 mt-2"
            onClick={() => (window.location.href = "/admin")}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Update Data
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="mb-4 text-sm text-zinc-600">
      <span className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
        Data last updated: {lastSyncDate}
      </span>
    </div>
  );
}
