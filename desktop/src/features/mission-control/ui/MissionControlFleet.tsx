import {
  Bot,
  Boxes,
  Cable,
  CircleDot,
  Cpu,
  RadioTower,
  RefreshCw,
} from "lucide-react";

import type {
  AcpRuntimeCatalogEntry,
  ManagedAgent,
  RelayAgent,
} from "@/shared/api/types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function MissionControlFleet({
  agents,
  relayAgents,
  runtimes,
  onManageAgents,
}: {
  agents: readonly ManagedAgent[];
  relayAgents: readonly RelayAgent[];
  runtimes: readonly AcpRuntimeCatalogEntry[];
  onManageAgents: () => void;
}) {
  const runningCount = agents.filter(
    (agent) => agent.status === "running" || agent.status === "deployed",
  ).length;
  const relayOnlyAgents = relayAgents.filter(
    (relayAgent) => !agents.some((agent) => agent.pubkey === relayAgent.pubkey),
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <FleetMetric
          detail="Local and remote instances"
          label="Registered agents"
          value={String(agents.length)}
        />
        <FleetMetric
          detail="Running locally or deployed remotely"
          label="Active workers"
          value={String(runningCount)}
        />
        <FleetMetric
          detail="Installed, missing, and login state"
          label="Runtime accounts"
          value={String(runtimes.length)}
        />
      </section>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              Every managed agent
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Full inventory from the local agent manager—not limited to Argus,
              Riggs, and KITT.
            </p>
          </div>
          <Button onClick={onManageAgents} variant="outline">
            Manage fleet
          </Button>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <EmptyState text="No managed agents are registered in this app identity." />
          ) : (
            <div className="divide-y divide-border/60 rounded-2xl border border-border/60">
              {agents.map((agent) => (
                <AgentRow
                  agent={agent}
                  key={agent.pubkey}
                  runtimes={runtimes}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cpu className="h-5 w-5 text-primary" />
              Coding runtimes and accounts
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Claude, Codex, Goose, Hermes, and other discovered ACP harnesses.
              Login state belongs to the runtime account; models belong to agent
              configurations.
            </p>
          </CardHeader>
          <CardContent>
            {runtimes.length === 0 ? (
              <EmptyState text="No ACP runtimes were discovered." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {runtimes.map((runtime) => (
                  <RuntimeCard key={runtime.id} runtime={runtime} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RadioTower className="h-5 w-5 text-primary" />
              Relay-only agents
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Agents visible in the community that this Mac does not manage.
            </p>
          </CardHeader>
          <CardContent>
            {relayOnlyAgents.length === 0 ? (
              <EmptyState text="No additional relay agents are currently visible." />
            ) : (
              <div className="space-y-2">
                {relayOnlyAgents.map((agent) => (
                  <div
                    className="flex items-center justify-between gap-4 rounded-xl border border-border/60 px-3 py-3"
                    key={agent.pubkey}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {agent.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {agent.agentType || "Agent"} · {agent.channels.length}{" "}
                        channels
                      </p>
                    </div>
                    <StatusBadge status={agent.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function AgentRow({
  agent,
  runtimes,
}: {
  agent: ManagedAgent;
  runtimes: readonly AcpRuntimeCatalogEntry[];
}) {
  const runtime = runtimes.find(
    (candidate) =>
      candidate.command === agent.agentCommand ||
      candidate.id === agent.agentCommand,
  );
  const runtimeLabel = runtime?.label ?? commandLabel(agent.agentCommand);
  const isActive = agent.status === "running" || agent.status === "deployed";

  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[1.1fr_0.85fr_1fr_0.8fr] md:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{agent.name}</p>
            {agent.needsRestart ? (
              <RefreshCw
                aria-label="Restart required"
                className="h-3.5 w-3.5 text-amber-500"
              />
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {agent.backend.type === "local"
              ? agent.pid
                ? `Local · PID ${agent.pid}`
                : "Local"
              : `Remote · ${agent.backend.id}`}
          </p>
        </div>
      </div>
      <InventoryValue icon={<Boxes className="h-3.5 w-3.5" />}>
        {runtimeLabel}
      </InventoryValue>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {agent.model || "Runtime default"}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {agent.provider || "Provider inherited by runtime"}
        </p>
      </div>
      <div className="flex md:justify-end">
        <Badge variant={isActive ? "success" : "secondary"}>
          {agent.status.replaceAll("_", " ")}
        </Badge>
      </div>
    </div>
  );
}

function RuntimeCard({ runtime }: { runtime: AcpRuntimeCatalogEntry }) {
  const auth = runtime.authStatus.status.replaceAll("_", " ");
  const available = runtime.availability === "available";

  return (
    <div className="rounded-xl border border-border/60 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{runtime.label}</p>
          <p className="truncate text-xs text-muted-foreground">{runtime.id}</p>
        </div>
        <Badge variant={available ? "success" : "secondary"}>
          {runtime.availability.replaceAll("_", " ")}
        </Badge>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Cable className="h-3.5 w-3.5" />
        <span className="capitalize">{auth}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RelayAgent["status"] }) {
  return (
    <Badge
      variant={
        status === "online"
          ? "success"
          : status === "away"
            ? "warning"
            : "secondary"
      }
    >
      {status}
    </Badge>
  );
}

function InventoryValue({
  children,
  icon,
}: {
  children: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{icon}</span>
      <span className="truncate">{children}</span>
    </div>
  );
}

function FleetMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <CircleDot className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function commandLabel(command: string) {
  const executable = command.trim().split(/\s+/)[0] ?? command;
  return executable.split(/[\\/]/).at(-1) || "Default runtime";
}
