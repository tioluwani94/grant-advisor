'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [maxOrgs, setMaxOrgs] = useState('100');
  const [maxGrants, setMaxGrants] = useState('200');
  const [offset, setOffset] = useState('0');
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    organisations_synced?: number;
    grants_synced?: number;
    error?: string;
  } | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const params = new URLSearchParams({
        maxOrgs: maxOrgs,
        maxGrants: maxGrants,
        offset: offset,
      });

      const response = await fetch(`/api/sync?${params.toString()}`, {
        method: 'POST',
      });

      const result = await response.json();
      setSyncResult(result);
    } catch (error) {
      setSyncResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Admin Dashboard</h1>
          <p className="text-zinc-600">Manage grant data synchronization</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Synchronization
            </CardTitle>
            <CardDescription>
              Sync organisations and grants from 360Giving API to the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="font-semibold text-zinc-900">Sync Configuration</h3>
              
              <div className="space-y-2">
                <label htmlFor="maxOrgs" className="text-sm font-medium text-zinc-700">
                  Max Organisations
                </label>
                <Input
                  id="maxOrgs"
                  type="number"
                  min="1"
                  max="1000"
                  value={maxOrgs}
                  onChange={(e) => setMaxOrgs(e.target.value)}
                  disabled={isSyncing}
                  placeholder="100"
                />
                <p className="text-xs text-zinc-500">Number of organisations to fetch (1-1000)</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="offset" className="text-sm font-medium text-zinc-700">
                  Offset (for pagination)
                </label>
                <Input
                  id="offset"
                  type="number"
                  min="0"
                  value={offset}
                  onChange={(e) => setOffset(e.target.value)}
                  disabled={isSyncing}
                  placeholder="0"
                />
                <p className="text-xs text-zinc-500">
                  Start position (0 = first, 50 = skip first 50, etc.)
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="maxGrants" className="text-sm font-medium text-zinc-700">
                  Max Grants
                </label>
                <Input
                  id="maxGrants"
                  type="number"
                  min="1"
                  max="1000"
                  value={maxGrants}
                  onChange={(e) => setMaxGrants(e.target.value)}
                  disabled={isSyncing}
                  placeholder="200"
                />
                <p className="text-xs text-zinc-500">Number of grants to fetch from funders</p>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="mb-2 font-semibold text-zinc-900">Tips</h3>
              <ul className="space-y-1 text-sm text-zinc-600">
                <li>• Already synced 50 orgs? Use offset=50, maxOrgs=100 for next batch</li>
                <li>• Each org takes ~500ms due to rate limiting</li>
                <li>• Syncing 100 orgs + 200 grants takes ~2-3 minutes</li>
                <li>• Duplicates are handled automatically (upsert)</li>
              </ul>
            </div>

            <Button
              onClick={handleSync}
              disabled={isSyncing}
              size="lg"
              className="w-full"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Start Sync
                </>
              )}
            </Button>

            {syncResult && (
              <Alert variant={syncResult.success ? 'default' : 'destructive'}>
                {syncResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {syncResult.success ? (
                    <div className="space-y-1">
                      <div className="font-semibold">Sync completed successfully!</div>
                      <div>Organisations synced: {syncResult.organisations_synced}</div>
                      <div>Grants synced: {syncResult.grants_synced}</div>
                    </div>
                  ) : (
                    <div>
                      <div className="font-semibold">Sync failed</div>
                      <div>{syncResult.error}</div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
