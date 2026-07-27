import {
  Activity,
  ArrowRight,
  Database,
  RadioTower,
  Waypoints,
} from "lucide-react";

import type {
  AgentLaneState,
  MissionProjectLike,
} from "@/features/mission-control/model";
import { missionStageForStatus } from "@/features/mission-control/model";
import type { Channel } from "@/shared/api/types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

import { MissionControlAgentGrid } from "./MissionControlAgentGrid";

export function MissionControlOverview({
  agents,
  channels,
  managedAgentCount,
  activeManagedAgentCount,
  projects,
  onOpenMission,
  onShowData,
  onShowFleet,
  onShowMissions,
}: {
  agents: readonly AgentLaneState[];
  channels: readonly Channel[];
  managedAgentCount: number;
  activeManagedAgentCount: number;
  projects: readonly MissionProjectLike[];
  onOpenMission: (projectId: string) => void;
  onShowData: () => void;
  onShowFleet: () => void;
  onShowMissions: () => void;
}) {
  const activeMissions = projects.filter(
    (project) => missionStageForStatus(project.status) === "active",
  );
  const operationalChannels = channels.filter(
    (channel) => channel.channelType !== "dm" && channel.archivedAt === null,
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          detail="Open the fleet for runtime, provider, and model"
          icon={<RadioTower className="h-4 w-4" />}
          label="Agents active"
          onClick={onShowFleet}
          value={`${activeManagedAgentCount} / ${managedAgentCount}`}
        />
        <MetricCard
          detail="Projects executing now"
          icon={<Activity className="h-4 w-4" />}
          label="Missions in flight"
          value={String(activeMissions.length)}
        />
        <MetricCard
          detail="Live collaboration lanes"
          icon={<Waypoints className="h-4 w-4" />}
          label="Ops channels"
          value={String(operationalChannels.length)}
        />
        <MetricCard
          detail="Odoo and Notion pending"
          icon={<Database className="h-4 w-4" />}
          label="External adapters"
          value="0 / 2"
        />
      </section>

      <section className="space-y-3">
        <SectionHeading
          description="Each worker has its own signed identity and a bounded operating lane."
          title="Agent command board"
        />
        <MissionControlAgentGrid agents={agents} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Missions in flight</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Live Buzz projects, projected as Wyzor missions.
              </p>
            </div>
            <Button onClick={onShowMissions} size="sm" variant="ghost">
              Open board
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeMissions.length === 0 ? (
              <EmptyLine text="No projects currently report an active status." />
            ) : (
              activeMissions.slice(0, 5).map((project) => (
                <button
                  className="flex w-full items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  key={project.id}
                  onClick={() => onOpenMission(project.id)}
                  type="button"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {project.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {project.description || "No mission brief yet"}
                    </p>
                  </div>
                  <Badge variant="info">{project.status || "active"}</Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Authority boundary</CardTitle>
            <p className="text-sm text-muted-foreground">
              Mission Control coordinates work; it does not silently replace
              source systems.
            </p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <AuthorityLine label="Work + discussion" value="Buzz / Ops Mesh" />
            <AuthorityLine label="ERP + CRM records" value="Odoo" />
            <AuthorityLine label="Knowledge + runbooks" value="Notion" />
            <AuthorityLine label="Promotion verdicts" value="Riggs ledger" />
            <Button
              className="mt-2 w-full"
              onClick={onShowData}
              variant="outline"
            >
              Inspect business data plane
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  detail,
  icon,
  label,
  onClick,
  value,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  value: string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        className="rounded-xl border border-border bg-card px-5 py-4 text-left text-card-foreground shadow-xs transition-colors hover:bg-muted/40"
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return <Card className="px-5 py-4">{content}</Card>;
}

function SectionHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function AuthorityLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
