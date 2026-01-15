import { NextRequest, NextResponse } from "next/server";

/**
 * Cron endpoint for scheduled 360Giving data sync
 * Triggered automatically by Vercel Cron (Sundays at 2 AM UTC)
 * Can also be manually triggered with authorization
 * 
 * Query params:
 * - force=true: Force a full sync instead of incremental
 * - maxOrgs: Override max organisations to sync (default: 50)
 * - maxGrants: Override max grants per org (default: 100)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Allow Vercel cron (no auth header but valid Vercel-Cron header) or valid bearer token
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const hasValidToken = cronSecret && authHeader === `Bearer ${cronSecret}`;
  
  if (cronSecret && !isVercelCron && !hasValidToken) {
    console.warn("[Cron] Unauthorized access attempt", {
      timestamp: new Date().toISOString(),
      hasAuth: !!authHeader,
      isVercelCron,
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse query parameters
  const forceFullSync = searchParams.get("force") === "true";
  const maxOrgs = parseInt(searchParams.get("maxOrgs") || "50", 10);
  const maxGrants = parseInt(searchParams.get("maxGrants") || "100", 10);

  console.log("[Cron] Starting scheduled sync", {
    timestamp: new Date().toISOString(),
    forceFullSync,
    maxOrgs,
    maxGrants,
    isVercelCron,
    isManual: hasValidToken,
  });

  try {
    // Call the main sync endpoint
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const syncUrl = new URL(`${baseUrl}/api/sync`);
    
    // Pass through configuration
    if (forceFullSync) {
      syncUrl.searchParams.set("force", "true");
    }
    syncUrl.searchParams.set("maxOrgs", maxOrgs.toString());
    syncUrl.searchParams.set("maxGrants", maxGrants.toString());

    const syncResponse = await fetch(syncUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await syncResponse.json();
    const duration = Date.now() - startTime;

    if (!syncResponse.ok) {
      console.error("[Cron] Sync failed", {
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        error: result.error,
        status: syncResponse.status,
      });
      throw new Error(result.error || "Sync failed");
    }

    console.log("[Cron] Sync completed successfully", {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      syncType: result.sync_type,
      organisationsProcessed: result.organisations_processed,
      grantsSynced: result.grants_synced,
      grantsSkipped: result.grants_skipped,
    });

    return NextResponse.json({
      success: true,
      message: `Scheduled ${result.sync_type || "incremental"} sync completed`,
      duration_ms: duration,
      ...result,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[Cron] Sync error", {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration_ms: duration,
      },
      { status: 500 }
    );
  }
}
