export type WyzorAgentRole = "argus" | "riggs" | "kitt";
export {
  buildCrmSnapshots,
  CRM_SNAPSHOT_SENTINEL,
  crmSnapshotState,
} from "./crmModel";
export type { CrmSnapshot, CrmSnapshotState } from "./crmModel";
export {
  buildDbSnapshots,
  DB_SNAPSHOT_SENTINEL,
  dbSnapshotState,
} from "./dbModel";
export type { DbSnapshot, DbSnapshotState } from "./dbModel";
export type ExecutiveLane = "gtm" | "ops" | "riggs";
export type ExecutiveUpdateKind = "standup" | "news" | "decision";
export type StandupPeriod = "morning" | "afternoon" | "evening";
export type ExecutiveHealth = "on-track" | "at-risk" | "blocked";
export type MissionControlView =
  | "overview"
  | "fleet"
  | "missions"
  | "decisions"
  | "data";
export type MissionStage = "queued" | "active" | "review" | "completed";
export type AgentConnectionState =
  | "connected"
  | "deployment-ready"
  | "not-registered";

export type AgentLike = {
  pubkey?: string;
  name: string;
  personaId?: string | null;
  status: "running" | "stopped" | "deployed" | "not_deployed";
  backend?: { type: "local" } | { type: "provider"; id: string };
};

export type RelayAgentLike = {
  pubkey?: string;
  name: string;
  status: "online" | "away" | "offline";
};

export type ExecutiveFeedItemLike = {
  id: string;
  pubkey: string;
  content: string;
  createdAt: number;
  channelId: string | null;
  channelName: string;
};

export type TrustedExecutiveIdentity = {
  pubkey: string;
  role: WyzorAgentRole;
};

export type ExecutiveUpdate = {
  id: string;
  lane: ExecutiveLane;
  role: WyzorAgentRole;
  kind: ExecutiveUpdateKind;
  period: StandupPeriod | null;
  health: ExecutiveHealth;
  title: string;
  summary: string;
  highlights: string[];
  risks: string[];
  asks: string[];
  createdAt: number;
  channelId: string | null;
  channelName: string;
  pubkey: string;
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
  { id: "fleet", label: "Agent fleet" },
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

export const EXECUTIVE_UPDATE_SENTINEL = "WYZOR_EXEC_UPDATE_V1";

const ROLE_TO_EXECUTIVE_LANE: Record<WyzorAgentRole, ExecutiveLane> = {
  argus: "ops",
  kitt: "gtm",
  riggs: "riggs",
};

const executiveLanes = new Set<ExecutiveLane>(["gtm", "ops", "riggs"]);
const executiveKinds = new Set<ExecutiveUpdateKind>([
  "standup",
  "news",
  "decision",
]);
const standupPeriods = new Set<StandupPeriod>([
  "morning",
  "afternoon",
  "evening",
]);
const executiveHealth = new Set<ExecutiveHealth>([
  "on-track",
  "at-risk",
  "blocked",
]);

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
    id: "wyzor-db",
    name: "Wyzor PostgreSQL",
    domains: "METRC ERP · Jobs · Gates",
    authority: "System of record",
    owner: "Argus projection service",
    direction: "Read-only aggregate",
    state: "adapter-required",
    description:
      "Bounded operational and METRC ERP health counts; no customer rows or credentials.",
  },
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

function roleForName(
  name: string | null | undefined,
  personaId?: string | null,
): WyzorAgentRole | null {
  return (
    WYZOR_AGENT_LANES.find(
      (agent) =>
        matchesRole(name, agent.role) || matchesRole(personaId, agent.role),
    )?.role ?? null
  );
}

function normalizePubkey(pubkey: string | null | undefined) {
  return pubkey?.trim().toLowerCase() ?? "";
}

export function trustedExecutiveIdentities(
  managedAgents: readonly AgentLike[],
  relayAgents: readonly RelayAgentLike[],
): TrustedExecutiveIdentity[] {
  const identities = new Map<string, TrustedExecutiveIdentity>();

  for (const agent of [...relayAgents, ...managedAgents]) {
    const personaId = "personaId" in agent ? agent.personaId : null;
    const role = roleForName(agent.name, personaId);
    const pubkey = normalizePubkey(agent.pubkey);
    if (role && pubkey) {
      identities.set(pubkey, { pubkey, role });
    }
  }

  return [...identities.values()];
}

type ExecutiveUpdatePayload = {
  schema_version: number;
  lane: ExecutiveLane;
  type: ExecutiveUpdateKind;
  period?: StandupPeriod;
  health?: ExecutiveHealth;
  title: string;
  summary: string;
  highlights?: string[];
  risks?: string[];
  asks?: string[];
};

function exactString(
  value: unknown,
  options: { max: number; required?: boolean },
) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (options.required && normalized.length === 0) return null;
  return normalized.slice(0, options.max);
}

function stringList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => exactString(item, { max: 240 }))
    .filter((item): item is string => Boolean(item))
    .slice(0, 8);
}

function parseExecutivePayload(content: string): ExecutiveUpdatePayload | null {
  const markerIndex = content.indexOf(EXECUTIVE_UPDATE_SENTINEL);
  if (markerIndex < 0) return null;

  const encoded = content
    .slice(markerIndex + EXECUTIVE_UPDATE_SENTINEL.length)
    .trim();
  if (!encoded.startsWith("{")) return null;

  let raw: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(encoded);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    raw = parsed as Record<string, unknown>;
  } catch {
    return null;
  }

  if (raw.schema_version !== 1) return null;
  if (!executiveLanes.has(raw.lane as ExecutiveLane)) return null;
  if (!executiveKinds.has(raw.type as ExecutiveUpdateKind)) return null;

  const kind = raw.type as ExecutiveUpdateKind;
  const period = raw.period as StandupPeriod | undefined;
  if (kind === "standup" && !standupPeriods.has(period as StandupPeriod)) {
    return null;
  }
  if (period !== undefined && !standupPeriods.has(period)) return null;

  const title = exactString(raw.title, { max: 120, required: true });
  const summary = exactString(raw.summary, { max: 1_200, required: true });
  if (!title || !summary) return null;

  const health = executiveHealth.has(raw.health as ExecutiveHealth)
    ? (raw.health as ExecutiveHealth)
    : "on-track";

  return {
    schema_version: 1,
    lane: raw.lane as ExecutiveLane,
    type: kind,
    period,
    health,
    title,
    summary,
    highlights: stringList(raw.highlights),
    risks: stringList(raw.risks),
    asks: stringList(raw.asks),
  };
}

export function buildExecutiveUpdates(
  feedItems: readonly ExecutiveFeedItemLike[],
  trustedIdentities: readonly TrustedExecutiveIdentity[],
): ExecutiveUpdate[] {
  const identityByPubkey = new Map(
    trustedIdentities.map((identity) => [
      normalizePubkey(identity.pubkey),
      identity,
    ]),
  );
  const seen = new Set<string>();
  const updates: ExecutiveUpdate[] = [];

  for (const item of feedItems) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    const identity = identityByPubkey.get(normalizePubkey(item.pubkey));
    if (!identity) continue;

    const payload = parseExecutivePayload(item.content);
    if (!payload) continue;
    if (ROLE_TO_EXECUTIVE_LANE[identity.role] !== payload.lane) continue;

    updates.push({
      id: item.id,
      lane: payload.lane,
      role: identity.role,
      kind: payload.type,
      period: payload.period ?? null,
      health: payload.health ?? "on-track",
      title: payload.title,
      summary: payload.summary,
      highlights: payload.highlights ?? [],
      risks: payload.risks ?? [],
      asks: payload.asks ?? [],
      createdAt: item.createdAt,
      channelId: item.channelId,
      channelName: item.channelName,
      pubkey: normalizePubkey(item.pubkey),
    });
  }

  return updates.sort((left, right) => right.createdAt - left.createdAt);
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
