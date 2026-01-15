import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  getOrganisations,
  getOrganisationDetail,
  getGrantsMade,
} from "@/lib/threesixty-giving";

interface SyncResult {
  success: boolean;
  organisations_synced: number;
  grants_synced: number;
  grants_skipped: number;
  sync_type: "full" | "incremental";
  last_sync_date?: string;
  error?: string;
}

interface SyncOptions {
  maxOrgs: number;
  maxGrants: number;
  offset: number;
  incremental: boolean;
  lastSyncDate: string | null;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SyncResult>> {
  const startTime = new Date().toISOString();

  // Get query parameters for configurable sync
  const { searchParams } = new URL(request.url);
  const maxOrgs = parseInt(searchParams.get("maxOrgs") || "50", 10);
  const maxGrants = parseInt(searchParams.get("maxGrants") || "500", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const forceFullSync = searchParams.get("force") === "true" || searchParams.get("full") === "true";

  // Determine if this should be an incremental sync
  let lastSyncDate: string | null = null;
  let syncType: "full" | "incremental" = "full";

  if (!forceFullSync) {
    // Get the last successful sync date
    const { data: lastSync } = await supabase
      .from("sync_logs")
      .select("completed_at")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    if (lastSync?.completed_at) {
      lastSyncDate = lastSync.completed_at;
      syncType = "incremental";
      console.log(`📊 Incremental sync from: ${lastSyncDate}`);
    } else {
      console.log(`📊 Full sync (no previous sync found)`);
    }
  } else {
    console.log(`📊 Full sync (forced)`);
  }

  const syncOptions: SyncOptions = {
    maxOrgs,
    maxGrants,
    offset,
    incremental: syncType === "incremental",
    lastSyncDate,
  };

  try {
    // Log sync start
    const { data: logEntry } = await supabase
      .from("sync_logs")
      .insert({
        sync_type: syncType,
        status: "running",
        orgs_synced: 0,
        grants_synced: 0,
        started_at: startTime,
      })
      .select()
      .single();

    const logId = logEntry?.id;

    try {
      // Sync organisations (skip for incremental unless offset specified)
      let orgsSynced = 0;
      if (!syncOptions.incremental || offset > 0) {
        console.log(
          `Starting organisation sync (max: ${maxOrgs}, offset: ${offset})...`
        );
        orgsSynced = await syncOrganisations(maxOrgs, offset);
        console.log(`✓ Synced ${orgsSynced} organisations`);
      } else {
        console.log(`⏭️ Skipping org sync for incremental update`);
      }

      // Sync grants from funders (incremental aware)
      console.log(`Starting ${syncType} grants sync (max: ${maxGrants})...`);
      const { synced: grantsSynced, skipped: grantsSkipped } =
        await syncGrantsForFunders(syncOptions);
      console.log(
        `✓ Synced ${grantsSynced} grants, skipped ${grantsSkipped} existing`
      );

      // Update log
      if (logId) {
        await supabase
          .from("sync_logs")
          .update({
            status: "completed",
            orgs_synced: orgsSynced,
            grants_synced: grantsSynced,
            completed_at: new Date().toISOString(),
          })
          .eq("id", logId);
      }

      return NextResponse.json({
        success: true,
        organisations_synced: orgsSynced,
        grants_synced: grantsSynced,
        grants_skipped: grantsSkipped,
        sync_type: syncType,
        last_sync_date: lastSyncDate || undefined,
      });
    } catch (error) {
      // Update log with error
      if (logId) {
        await supabase
          .from("sync_logs")
          .update({
            status: "failed",
            error_message:
              error instanceof Error ? error.message : "Unknown error",
            completed_at: new Date().toISOString(),
          })
          .eq("id", logId);
      }
      throw error;
    }
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      {
        success: false,
        organisations_synced: 0,
        grants_synced: 0,
        grants_skipped: 0,
        sync_type: syncType,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

async function syncOrganisations(maxOrgs: number, offset: number = 0): Promise<number> {
  let orgsSynced = 0;

  // Fetch batch with offset
  const response = await getOrganisations(maxOrgs, offset);
  const orgsToProcess = response.results.slice(0, maxOrgs);

  for (const org of orgsToProcess) {
    try {
      // Fetch detailed info
      const detail = await getOrganisationDetail(org.org_id);

      // Insert/update organisation
      const { error } = await supabase.from("organisations").upsert(
        {
          org_id: org.org_id,
          name: org.name,
          is_funder: detail.funder !== null,
          is_recipient: detail.recipient !== null,
          funder_stats: detail.funder,
          recipient_stats: detail.recipient,
        },
        { onConflict: "org_id" }
      );

      if (error) {
        console.error(`Error upserting org ${org.org_id}:`, error);
      } else {
        orgsSynced++;
        console.log(
          `Synced organisation ${orgsSynced}/${maxOrgs}: ${org.name}`
        );
      }
    } catch (error) {
      console.error(`Failed to sync org ${org.org_id}:`, error);
    }
  }

  return orgsSynced;
}

async function syncGrantsForFunders(
  options: SyncOptions
): Promise<{ synced: number; skipped: number }> {
  // Get funders from database
  const { data: funders, error: fundersError } = await supabase
    .from("organisations")
    .select("org_id, name, last_grant_made_date")
    .eq("is_funder", true)
    .limit(50);

  if (fundersError) {
    throw new Error(`Failed to fetch funders: ${fundersError.message}`);
  }

  if (!funders || funders.length === 0) {
    console.log("No funders found in database");
    return { synced: 0, skipped: 0 };
  }

  let synced = 0;
  let skipped = 0;

  for (const funder of funders) {
    if (synced >= options.maxGrants) break;

    try {
      console.log(`Fetching grants for funder: ${funder.name}`);
      const grantsResponse = await getGrantsMade(funder.org_id, 100, 0);

      for (const grantData of grantsResponse.results) {
        if (synced >= options.maxGrants) break;

        const grant = grantData.data;
        const awardDate = grant.awardDate;

        // INCREMENTAL: Skip grants older than last sync date
        if (options.incremental && options.lastSyncDate && awardDate) {
          const grantDate = new Date(awardDate);
          const lastSync = new Date(options.lastSyncDate);
          if (grantDate < lastSync) {
            skipped++;
            continue;
          }
        }

        // Check if grant already exists (avoid unnecessary upserts)
        if (options.incremental) {
          const { data: existing } = await supabase
            .from("grants")
            .select("grant_id")
            .eq("grant_id", grantData.grant_id)
            .single();

          if (existing) {
            skipped++;
            continue;
          }
        }

        const funderOrgId = grantData.funders?.[0]?.org_id || funder.org_id;
        const recipientOrgId = grantData.recipients?.[0]?.org_id || null;

        // Insert grant
        const { error: grantError } = await supabase.from("grants").upsert(
          {
            grant_id: grantData.grant_id,
            title: grant.title,
            description: grant.description,
            amount_awarded: grant.amountAwarded,
            currency: grant.currency || "GBP",
            award_date: awardDate,
            funder_org_id: funderOrgId,
            recipient_org_id: recipientOrgId,
            grant_programme: grant.grantProgramme,
            classifications: grant.classifications,
            beneficiary_location: grant.beneficiaryLocation,
            raw_data: grant,
          },
          { onConflict: "grant_id" }
        );

        if (grantError) {
          console.error(
            `Error inserting grant ${grantData.grant_id}:`,
            grantError
          );
        } else {
          synced++;
          console.log(
            `Synced grant ${synced}/${options.maxGrants}: ${grant.title || "Untitled"}`
          );
        }
      }

      // Update last_grant_made_date for funder
      if (grantsResponse.results.length > 0) {
        const latestGrant = grantsResponse.results[0].data;
        await supabase
          .from("organisations")
          .update({ last_grant_made_date: latestGrant.awardDate })
          .eq("org_id", funder.org_id);
      }
    } catch (error) {
      console.error(`Failed to sync grants for ${funder.name}:`, error);
    }
  }

  return { synced, skipped };
}
