import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Database,
  MoonStar,
  Newspaper,
  RadioTower,
  ShieldCheck,
  Sun,
  Sunrise,
  Waypoints,
} from "lucide-react";

import type {
  AgentLaneState,
  ExecutiveHealth,
  ExecutiveLane,
  ExecutiveUpdate,
  MissionProjectLike,
  StandupPeriod,
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
  executiveUpdates,
  isExecutiveFeedLoading,
  managedAgentCount,
  activeManagedAgentCount,
  onOpenChannel,
  projects,
  onOpenMission,
  onShowData,
  onShowFleet,
  onShowMissions,
}: {
  agents: readonly AgentLaneState[];
  channels: readonly Channel[];
  executiveUpdates: readonly ExecutiveUpdate[];
  isExecutiveFeedLoading: boolean;
  managedAgentCount: number;
  activeManagedAgentCount: number;
  onOpenChannel: (channelId: string) => void;
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
  const currentStandups = executiveLaneOrder.map((lane) => ({
    lane,
    update: executiveUpdates.find(
      (update) => update.lane === lane && update.kind === "standup",
    ),
  }));
  const news = executiveUpdates
    .filter((update) => update.kind === "news")
    .slice(0, 5);
  const decisions = executiveUpdates
    .filter((update) => update.kind === "decision" || update.asks.length > 0)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionHeading
          description="Latest signed summaries from KITT, Argus, and Riggs. Missing updates stay visibly missing."
          title="Today’s operating brief"
        />
        <div className="grid gap-3 lg:grid-cols-3">
          {currentStandups.map(({ lane, update }) => (
            <ExecutivePulseCard
              isLoading={isExecutiveFeedLoading}
              key={lane}
              lane={lane}
              onOpenChannel={onOpenChannel}
              update={update}
            />
          ))}
        </div>
      </section>

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

      <section className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Standup rhythm</CardTitle>
            <p className="text-sm text-muted-foreground">
              Morning priorities, afternoon course correction, and evening
              closeout from each accountable identity.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-3">
            {standupPeriodOrder.map((period) => (
              <StandupPeriodCard
                executiveUpdates={executiveUpdates}
                key={period}
                period={period}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Needs Matt</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Decisions and explicit asks. Nothing here executes by itself.
              </p>
            </div>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="space-y-2">
            {decisions.length === 0 ? (
              <EmptyLine text="No signed decisions or asks are waiting." />
            ) : (
              decisions.map((update) => (
                <button
                  className="w-full rounded-xl border border-border/60 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  key={update.id}
                  onClick={() =>
                    update.channelId
                      ? onOpenChannel(update.channelId)
                      : undefined
                  }
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{update.title}</p>
                    <Badge variant="warning">
                      {executiveLaneMeta[update.lane].shortLabel}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {update.asks[0] ?? update.summary}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionHeading
          description="Public market signals and verified operating news remain labeled by source lane."
          title="News and market signals"
        />
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {news.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyLine text="No signed news summary has been published yet." />
              </div>
            ) : (
              news.map((update) => (
                <button
                  className="rounded-xl border border-border/60 p-4 text-left transition-colors hover:bg-muted/50"
                  key={update.id}
                  onClick={() =>
                    update.channelId
                      ? onOpenChannel(update.channelId)
                      : undefined
                  }
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Newspaper className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {formatUpdateTime(update.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold">{update.title}</p>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-foreground">
                    {update.summary}
                  </p>
                  <p className="mt-3 text-xs font-medium">
                    {executiveLaneMeta[update.lane].label}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
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

const executiveLaneOrder: readonly ExecutiveLane[] = ["gtm", "ops", "riggs"];
const standupPeriodOrder: readonly StandupPeriod[] = [
  "morning",
  "afternoon",
  "evening",
];

const executiveLaneMeta: Record<
  ExecutiveLane,
  { label: string; shortLabel: string; owner: string }
> = {
  gtm: { label: "GTM + Chief of Staff", shortLabel: "GTM", owner: "KITT" },
  ops: { label: "Operations + readiness", shortLabel: "Ops", owner: "Argus" },
  riggs: {
    label: "Verification + release risk",
    shortLabel: "Riggs",
    owner: "Riggs",
  },
};

const periodMeta: Record<
  StandupPeriod,
  { label: string; icon: React.ReactNode }
> = {
  morning: { label: "Morning", icon: <Sunrise className="h-4 w-4" /> },
  afternoon: { label: "Afternoon", icon: <Sun className="h-4 w-4" /> },
  evening: { label: "Evening", icon: <MoonStar className="h-4 w-4" /> },
};

function ExecutivePulseCard({
  isLoading,
  lane,
  onOpenChannel,
  update,
}: {
  isLoading: boolean;
  lane: ExecutiveLane;
  onOpenChannel: (channelId: string) => void;
  update: ExecutiveUpdate | undefined;
}) {
  const meta = executiveLaneMeta[lane];
  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-primary/70" />
      <CardHeader className="space-y-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {meta.owner}
            </p>
            <CardTitle className="mt-1 text-base">{meta.label}</CardTitle>
          </div>
          {update ? <HealthBadge health={update.health} /> : null}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading signed update…
          </p>
        ) : update ? (
          <button
            className="w-full text-left"
            onClick={() =>
              update.channelId ? onOpenChannel(update.channelId) : undefined
            }
            type="button"
          >
            <p className="text-sm font-semibold">{update.title}</p>
            <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted-foreground">
              {update.summary}
            </p>
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{update.period ?? update.kind}</span>
              <span>{formatUpdateTime(update.createdAt)}</span>
            </div>
          </button>
        ) : (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>No signed update yet.</p>
            <p className="text-xs">
              {meta.owner} must publish the typed executive envelope from its
              own identity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StandupPeriodCard({
  executiveUpdates,
  period,
}: {
  executiveUpdates: readonly ExecutiveUpdate[];
  period: StandupPeriod;
}) {
  const updates = executiveLaneOrder.map((lane) => ({
    lane,
    update: executiveUpdates.find(
      (item) =>
        item.kind === "standup" && item.period === period && item.lane === lane,
    ),
  }));
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="flex items-center gap-2 font-semibold">
        {periodMeta[period].icon}
        <span>{periodMeta[period].label}</span>
      </div>
      <div className="mt-4 space-y-3">
        {updates.map(({ lane, update }) => (
          <div className="space-y-1" key={lane}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {executiveLaneMeta[lane].shortLabel}
              </span>
              {update ? (
                <HealthDot health={update.health} />
              ) : (
                <span className="text-xs text-muted-foreground">missing</span>
              )}
            </div>
            <p className="line-clamp-2 text-xs leading-5">
              {update?.summary ?? "No signed report."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HealthBadge({ health }: { health: ExecutiveHealth }) {
  if (health === "blocked") {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3" />
        Blocked
      </Badge>
    );
  }
  if (health === "at-risk") {
    return (
      <Badge variant="warning">
        <Clock3 className="h-3 w-3" />
        At risk
      </Badge>
    );
  }
  return (
    <Badge variant="success">
      <CheckCircle2 className="h-3 w-3" />
      On track
    </Badge>
  );
}

function HealthDot({ health }: { health: ExecutiveHealth }) {
  const color =
    health === "blocked"
      ? "bg-destructive"
      : health === "at-risk"
        ? "bg-amber-500"
        : "bg-emerald-500";
  return <span className={`h-2 w-2 rounded-full ${color}`} title={health} />;
}

function formatUpdateTime(createdAt: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(createdAt * 1_000));
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
