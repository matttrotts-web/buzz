import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDashed,
  Database,
  FileText,
  Radar,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import * as React from "react";

import { useAppNavigation } from "@/app/navigation/useAppNavigation";
import {
  useManagedAgentsQuery,
  useRelayAgentsQuery,
} from "@/features/agents/hooks";
import {
  connectionStateForRole,
  DATA_SOURCE_CATALOG,
  summarizeConnections,
  WYZOR_AGENT_LANES,
  type AgentConnectionState,
} from "@/features/mission-control/model";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

const statePresentation: Record<
  AgentConnectionState,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  connected: { label: "Connected", variant: "success" },
  "deployment-ready": { label: "Ready to install", variant: "warning" },
  "not-registered": { label: "Not registered", variant: "secondary" },
};

export function MissionControlScreen() {
  const managedAgentsQuery = useManagedAgentsQuery();
  const relayAgentsQuery = useRelayAgentsQuery();
  const { goAgents } = useAppNavigation();
  const agentStates = React.useMemo(
    () =>
      WYZOR_AGENT_LANES.map((agent) => ({
        ...agent,
        connection: connectionStateForRole(
          agent.role,
          managedAgentsQuery.data ?? [],
          relayAgentsQuery.data ?? [],
        ),
      })),
    [managedAgentsQuery.data, relayAgentsQuery.data],
  );
  const totals = summarizeConnections(
    agentStates.map((agent) => agent.connection),
  );

  return (
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-7 lg:px-9">
        <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 px-6 py-7 shadow-xs">
          <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-3xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <Radar className="h-4 w-4 text-primary" />
                Wyzor command layer
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Mission Control
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                One signed operating view across people, Hermes agents, and
                business systems. The board is a projection; Odoo, Notion, and
                Wyzor services keep their own authority.
              </p>
            </div>
            <Button onClick={() => void goAgents()} type="button">
              <Bot className="h-4 w-4" />
              Register agents
            </Button>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Hermes online"
            value={`${totals.connected} / 3`}
            detail="Signed relay identities"
          />
          <MetricCard
            label="Ready to install"
            value={String(totals.ready)}
            detail="Deployment bundles generated"
          />
          <MetricCard
            label="Adapter slots"
            value={String(DATA_SOURCE_CATALOG.length)}
            detail="No browser-stored service secrets"
          />
        </section>

        <section className="space-y-3">
          <SectionHeading
            icon={<Waypoints className="h-4 w-4" />}
            title="Agent lanes"
            description="Argus, Riggs, and KITT publish different signed projections into the same audit trail."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {agentStates.map((agent) => {
              const presentation = statePresentation[agent.connection];
              return (
                <Card className="overflow-hidden" key={agent.role}>
                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                        {agent.role === "riggs" ? (
                          <ShieldCheck className="h-5 w-5" />
                        ) : (
                          <Bot className="h-5 w-5" />
                        )}
                      </div>
                      <Badge variant={presentation.variant}>
                        {presentation.label}
                      </Badge>
                    </div>
                    <div>
                      <CardTitle className="text-xl">{agent.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {agent.lane}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Publishes
                      </p>
                      <p className="mt-1 text-sm leading-5">
                        {agent.publishes}
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                      {agent.authority}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeading
            icon={<Database className="h-4 w-4" />}
            title="Data plane"
            description="Adapters normalize source records; agents add work, reasoning, and signed decisions."
          />
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {DATA_SOURCE_CATALOG.map((source) => (
                  <div
                    className="grid gap-3 px-5 py-4 md:grid-cols-[1.1fr_1fr_1fr_1.6fr] md:items-center"
                    key={source.id}
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                        {source.id === "notion" ? (
                          <FileText className="h-4 w-4" />
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
                      <p className="text-xs text-muted-foreground">Authority</p>
                      <p className="text-sm">{source.authority}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Flow owner
                      </p>
                      <p className="text-sm">{source.owner}</p>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs leading-5 text-muted-foreground">
                        {source.description}
                      </p>
                      <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground md:block" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                What is wired now
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>Remote registration through the Wyzor Hermes provider.</p>
              <p>One Nostr identity and audit trail per Hermes agent.</p>
              <p>
                Live connection state from managed agents and relay presence.
              </p>
              <p>A shared ownership map for Ops, gates, GTM, CRM, and ERP.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CircleDashed className="h-5 w-5 text-amber-500" />
                Plug-in step after bot build
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p>
                Create Argus, Riggs, or KITT under Agents and select{" "}
                <strong className="text-foreground">
                  Run on → wyzor-hermes
                </strong>
                .
              </p>
              <p>
                Transfer the generated bundle to that bot&apos;s host and run
                its installer after the Hermes ACP command exists.
              </p>
              <p>
                Odoo and Notion credentials belong in server-side connector
                services, never in this desktop projection.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </Card>
  );
}

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
