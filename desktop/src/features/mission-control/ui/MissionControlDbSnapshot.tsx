import { AlertTriangle, CheckCircle2, Database, RefreshCw } from "lucide-react";

import type {
  DbSnapshot,
  DbSnapshotState,
} from "@/features/mission-control/model";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function MissionControlDbSnapshot({
  isLoading,
  onOpenChannel,
  snapshot,
  state,
}: {
  isLoading: boolean;
  onOpenChannel: () => void;
  snapshot: DbSnapshot | null;
  state: DbSnapshotState;
}) {
  if (isLoading && !snapshot) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading the signed Wyzor database projection from data-ops…
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card className="border-amber-500/25">
        <CardContent className="flex items-start justify-between gap-4 p-5">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
            <div>
              <p className="font-semibold">Database projection missing</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Waiting for an Argus-signed WYZOR_DB_SNAPSHOT_V1 event.
              </p>
            </div>
          </div>
          <Button onClick={onOpenChannel} size="sm" variant="outline">
            Open data-ops
          </Button>
        </CardContent>
      </Card>
    );
  }

  const metrics = snapshot.metrics;
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-primary" />
            Wyzor database
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only aggregates signed by Argus. PostgreSQL remains
            authoritative.
          </p>
        </div>
        <Badge variant={state === "connected" ? "success" : "warning"}>
          {state === "connected" ? (
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="mr-1 h-3.5 w-3.5" />
          )}
          {state === "connected" ? "Connected" : "Stale"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Inventory items"
            value={metrics.metrcErp.inventoryItems}
          />
          <Metric
            label="METRC mismatches"
            value={metrics.metrcErp.metrcMismatches}
          />
          <Metric label="Active plants" value={metrics.metrcErp.activePlants} />
          <Metric
            label="Open transfers"
            value={metrics.metrcErp.openTransfers}
          />
          <Metric
            label="Open sales orders"
            value={metrics.metrcErp.openSalesOrders}
          />
          <Metric label="Active agent jobs" value={metrics.agentJobs.active} />
          <Metric
            label="Failed crawls · 24h"
            value={metrics.crawlRuns24h.failed}
          />
          <Metric
            label="Unhealthy integrations"
            value={metrics.integrations.unhealthy}
          />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span>Updated {new Date(snapshot.generatedAt).toLocaleString()}</span>
          <Button onClick={onOpenChannel} size="sm" variant="ghost">
            Open data-ops
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}
