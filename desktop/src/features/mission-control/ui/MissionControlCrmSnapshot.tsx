import { openUrl } from "@tauri-apps/plugin-opener";
import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CircleDollarSign,
  ContactRound,
  RefreshCw,
} from "lucide-react";

import type {
  CrmSnapshot,
  CrmSnapshotState,
} from "@/features/mission-control/model";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function MissionControlCrmSnapshot({
  isLoading,
  onOpenCrmChannel,
  snapshot,
  state,
}: {
  isLoading: boolean;
  onOpenCrmChannel: () => void;
  snapshot: CrmSnapshot | null;
  state: CrmSnapshotState;
}) {
  if (isLoading && !snapshot) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading the signed Odoo projection from crm-ops…
        </CardContent>
      </Card>
    );
  }

  if (!snapshot) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold">Odoo snapshot not published yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Mission Control will connect only after KITT publishes the typed
              CRM envelope from its own signed identity.
            </p>
          </div>
          <Button onClick={onOpenCrmChannel} variant="outline">
            Open crm-ops
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusVariant = state === "connected" ? "success" : "warning";
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-border/60">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BriefcaseBusiness className="h-5 w-5 text-primary" />
            CRM pipeline
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Read-only Odoo projection, signed and published by KITT.
          </p>
        </div>
        <Badge variant={statusVariant}>
          {state === "connected" ? "Live" : "Stale"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <CrmMetric
            icon={<ContactRound className="h-4 w-4" />}
            label="Lead pool"
            value={formatCount(snapshot.metrics.leadCount)}
          />
          <CrmMetric
            icon={<BriefcaseBusiness className="h-4 w-4" />}
            label="Open opportunities"
            value={formatCount(snapshot.metrics.openOpportunityCount)}
          />
          <CrmMetric
            icon={<CircleDollarSign className="h-4 w-4" />}
            label="Pipeline"
            value={formatMoney(
              snapshot.metrics.pipelineValue,
              snapshot.currency,
            )}
          />
          <CrmMetric
            danger={snapshot.metrics.overdueActivityCount > 0}
            icon={<CalendarClock className="h-4 w-4" />}
            label="Overdue activities"
            value={formatCount(snapshot.metrics.overdueActivityCount)}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.8fr_1.4fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Stage mix
            </p>
            <div className="mt-3 space-y-2">
              {snapshot.stages.length === 0 ? (
                <EmptyLine text="No open opportunity stages." />
              ) : (
                snapshot.stages.slice(0, 6).map((stage) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 px-3 py-2"
                    key={stage.name}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {stage.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stage.count} record{stage.count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatMoney(stage.value, snapshot.currency)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Top opportunities
              </p>
              <Button onClick={onOpenCrmChannel} size="sm" variant="ghost">
                Open crm-ops
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {snapshot.topOpportunities.length === 0 ? (
                <EmptyLine text="No open opportunities." />
              ) : (
                snapshot.topOpportunities.map((opportunity) => (
                  <button
                    className="flex w-full items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:cursor-default"
                    disabled={!opportunity.sourceUrl}
                    key={opportunity.recordId}
                    onClick={() =>
                      opportunity.sourceUrl
                        ? void openUrl(opportunity.sourceUrl)
                        : undefined
                    }
                    type="button"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {opportunity.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {opportunity.stage} · {opportunity.probability}%
                        {opportunity.nextActivityDue
                          ? ` · next ${opportunity.nextActivityDue}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold">
                        {formatMoney(
                          opportunity.expectedRevenue,
                          snapshot.currency,
                        )}
                      </span>
                      {opportunity.sourceUrl ? (
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      ) : null}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span>
            Generated {formatGeneratedAt(snapshot.generatedAt)} · Odoo remains
            the system of record
          </span>
          {state === "stale" ? (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Older than 24 hours
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function CrmMetric({
  danger = false,
  icon,
  label,
  value,
}: {
  danger?: boolean;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div
        className={
          danger
            ? "flex items-center justify-between text-amber-600 dark:text-amber-400"
            : "flex items-center justify-between text-muted-foreground"
        }
      >
        <p className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatGeneratedAt(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
