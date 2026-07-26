export type WyzorAgentRole = "argus" | "riggs" | "kitt";
export type MissionControlView = "overview" | "missions" | "decisions" | "data";
export type MissionStage = "queued" | "active" | "review" | "completed";
export type AgentConnectionState =
  | "connected"
  | "deployment-ready"
  | "not-registered";

export type AgentLike = {
  name: string;
  personaId?: string | null;
  status: "running" | "stopped" | "deployed" | "not_deployed";
  backend?: { type: "local" } | { type: "provider"; id: string };
};

export type RelayAgentLike = {
  name: string;
  status: "online" | "away" | "offline";
};

export type MissionProjectLike = {
  id: string;
  name: string;
  description: string;
  status: string;
  projectChannelId: string | null;
};

export type AgentLaneState = (typeof WYZOR_AGENT_LANES)[number] & {
  connection: AgentConnectionState;
};

export const MISSION_CONTROL_VIEWS: ReadonlyArray<{
  id: MissionControlView;
  label: string;
}> = [
  { id: "overview", label: "Overview" },
  { id: "missions", label: "Missions" },
  { id: "decisions", label: "Decisions" },
  { id: "data", label: "Business data" },
];

export const MISSION_STAGES: ReadonlyArray<{
  id: MissionStage;
  label: string;
  description: string;
}> = [
  { id: "queued", label: "Queued", description: "Planned and ready" },
  { id: "active", label: "In flight", description: "Active execution" },
  { id: "review", label: "At a gate", description: "Review, hold, or blocked" },
  { id: "completed", label: "Complete", description: "Closed and delivered" },
];

export const WYZOR_AGENT_LANES = [
  {
    role: "argus",
    name: "Argus",
    lane: "Ops + regulatory evidence",
    publishes:
      "Signed operational observations, evidence, incidents, and handoffs",
    authority: "Projection — Odoo and Wyzor services remain authoritative",
  },
  {
    role: "riggs",
    name: "Riggs",
    lane: "Approval gates",
    publishes: "Signed pass, fail, hold, promotion, and deployment verdicts",
    authority: "Decision authority within configured Wyzor gates",
  },
  {
    role: "kitt",
    name: "KITT",
    lane: "GTM + sales",
    publishes:
      "Signed campaign, pipeline, outreach, and sales activity projections",
    authority:
      "Projection — Odoo/CRM remains authoritative for records and money",
  },
] as const;

const completedStatuses = new Set([
  "closed",
  "complete",
  "completed",
  "done",
  "merged",
  "released",
  "shipped",
]);
const reviewStatuses = new Set([
  "approval",
  "blocked",
  "gate",
  "hold",
  "pending_review",
  "review",
  "waiting_approval",
]);
const queuedStatuses = new Set([
  "backlog",
  "draft",
  "new",
  "planned",
  "queued",
  "ready",
  "todo",
]);

export function missionStageForStatus(status: string): MissionStage {
  const normalized = status
    .trim()
    .toLowerCase()
    .replaceAll(/[\s-]+/g, "_");
  if (completedStatuses.has(normalized)) return "completed";
  if (reviewStatuses.has(normalized)) return "review";
  if (queuedStatuses.has(normalized)) return "queued";
  return "active";
}

export function groupMissionsByStage(
  projects: readonly MissionProjectLike[],
): Record<MissionStage, MissionProjectLike[]> {
  const grouped: Record<MissionStage, MissionProjectLike[]> = {
    queued: [],
    active: [],
    review: [],
    completed: [],
  };

  for (const project of projects) {
    grouped[missionStageForStatus(project.status)].push(project);
  }
  return grouped;
}

export const DATA_SOURCE_CATALOG = [
  {
    id: "odoo",
    name: "Odoo",
    domains: "ERP · CRM · Sales",
    authority: "System of record",
    owner: "Connector service",
    direction: "Pull + webhook",
    state: "adapter-required",
    description:
      "Accounts, contacts, opportunities, orders, invoices, and operational records.",
  },
  {
    id: "notion",
    name: "Notion",
    domains: "Knowledge · Runbooks",
    authority: "Document source",
    owner: "Connector service",
    direction: "Pull + webhook",
    state: "adapter-required",
    description:
      "Specs, operating procedures, briefs, decisions, and project context.",
  },
  {
    id: "gtm",
    name: "GTM feeds",
    domains: "Campaigns · Outreach",
    authority: "Source-specific",
    owner: "KITT",
    direction: "Normalize + publish",
    state: "agent-stream",
    description:
      "KITT turns connected GTM activity into signed Ops Mesh projections.",
  },
  {
    id: "ops",
    name: "Wyzor Ops",
    domains: "Jobs · Incidents · Evidence",
    authority: "Service-specific",
    owner: "Argus",
    direction: "Observe + publish",
    state: "agent-stream",
    description:
      "Argus publishes operational evidence without replacing the underlying service.",
  },
  {
    id: "gates",
    name: "Software factory gates",
    domains: "Review · Promote · Deploy",
    authority: "Gate ledger",
    owner: "Riggs",
    direction: "Judge + publish",
    state: "agent-stream",
    description:
      "Riggs signs verdicts; Matt signoff remains required wherever policy requires it.",
  },
] as const;

function matchesRole(name: string | null | undefined, role: WyzorAgentRole) {
  return name?.trim().toLowerCase() === role;
}

export function connectionStateForRole(
  role: WyzorAgentRole,
  managedAgents: readonly AgentLike[],
  relayAgents: readonly RelayAgentLike[],
): AgentConnectionState {
  const relay = relayAgents.find((agent) => matchesRole(agent.name, role));
  if (relay?.status === "online" || relay?.status === "away") {
    return "connected";
  }

  const managed = managedAgents.find(
    (agent) =>
      matchesRole(agent.name, role) || matchesRole(agent.personaId, role),
  );
  if (managed?.status === "running") {
    return "connected";
  }
  if (managed) {
    return "deployment-ready";
  }
  return "not-registered";
}

export function summarizeConnections(states: readonly AgentConnectionState[]) {
  return {
    connected: states.filter((state) => state === "connected").length,
    ready: states.filter((state) => state === "deployment-ready").length,
    missing: states.filter((state) => state === "not-registered").length,
  };
}
