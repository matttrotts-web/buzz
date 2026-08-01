import {
  ArrowDownUp,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Database,
  FileText,
  Megaphone,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import {
  DATA_SOURCE_CATALOG,
  type CrmSnapshot,
  type CrmSnapshotState,
} from "@/features/mission-control/model";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

import { MissionControlCrmSnapshot } from "./MissionControlCrmSnapshot";

const businessViews = [
  {
    title: "CRM + sales",
    icon: BriefcaseBusiness,
    authority: "Odoo",
    agent: "KITT",
    records: "Accounts, contacts, opportunities, orders, invoices",
  },
  {
    title: "GTM",
    icon: Megaphone,
    authority: "Connected campaign systems",
    agent: "KITT",
    records: "Campaigns, outreach, attribution, pipeline movement",
  },
  {
    title: "Operations",
    icon: Wrench,
    authority: "Wyzor services + Odoo",
    agent: "Argus",
    records: "Jobs, incidents, evidence, service health, handoffs",
  },
  {
    title: "Knowledge",
    icon: BookOpen,
    authority: "Notion",
    agent: "All agents, read by policy",
    records: "Specs, runbooks, briefs, decisions, operating context",
  },
] as const;

export function MissionControlData({
  crmSnapshot,
  crmState,
  isCrmLoading,
  onOpenCrmChannel,
}: {
  crmSnapshot: CrmSnapshot | null;
  crmState: CrmSnapshotState;
  isCrmLoading: boolean;
  onOpenCrmChannel: () => void;
}) {
  return (
    <div className="space-y-6">
      <MissionControlCrmSnapshot
        isLoading={isCrmLoading}
        onOpenCrmChannel={onOpenCrmChannel}
        snapshot={crmSnapshot}
        state={crmState}
      />

      <section>
        <div className="mb-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Boxes className="h-5 w-5 text-primary" />
            Business views
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The command-center UI projects authoritative records into the right
            operating view. Agents contribute signed work; they do not own the
            underlying books.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {businessViews.map((view) => (
            <Card key={view.title}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <view.icon className="h-5 w-5" />
                  </span>
                  <Badge variant="outline">Projection</Badge>
                </div>
                <p className="mt-4 font-semibold">{view.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {view.records}
                </p>
                <dl className="mt-4 grid gap-2 border-t border-border/60 pt-4 text-xs">
                  <DataRow label="Authority" value={view.authority} />
                  <DataRow label="Agent lane" value={view.agent} />
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Database className="h-5 w-5 text-primary" />
            Connector plane
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Current truth about every source—connected agent streams are
            distinct from external service adapters.
          </p>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {DATA_SOURCE_CATALOG.map((source) => {
                const isOdoo = source.id === "odoo";
                const connectorState = isOdoo ? crmState : source.state;
                const connectorLabel = isOdoo
                  ? crmState === "connected"
                    ? "Connected"
                    : crmState === "stale"
                      ? "Stale"
                      : "Snapshot required"
                  : source.state === "adapter-required"
                    ? "Adapter required"
                    : "Agent stream";
                return (
                  <div
                    className="grid gap-3 px-5 py-4 md:grid-cols-[1.05fr_0.8fr_0.8fr_1.35fr] md:items-center"
                    key={source.id}
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                        {source.id === "notion" ? (
                          <FileText className="h-4 w-4" />
                        ) : source.id === "gates" ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <Database className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{source.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {source.domains}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Flow owner
                      </p>
                      <p className="text-sm">{source.owner}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowDownUp className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-sm">{source.direction}</p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs leading-5 text-muted-foreground">
                        {source.description}
                      </p>
                      <Badge
                        className="shrink-0"
                        variant={
                          connectorState === "connected"
                            ? "success"
                            : connectorState === "adapter-required" ||
                                connectorState === "stale" ||
                                connectorState === "missing"
                              ? "warning"
                              : "info"
                        }
                      >
                        {connectorLabel}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="border-amber-500/25 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-base">Credential boundary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          Odoo API keys and Notion tokens belong in server-side connector
          services. Mission Control receives normalized records and signed
          events; it never stores those service secrets in the desktop app.
        </CardContent>
      </Card>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
