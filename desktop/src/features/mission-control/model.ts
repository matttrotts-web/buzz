export type WyzorAgentRole = "argus" | "riggs" | "kitt";
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

export const DATA_SOURCE_CATALOG = [
  {
    id: "odoo",
    name: "Odoo",
    domains: "ERP · CRM · Sales",
    authority: "System of record",
    owner: "Connector service",
    direction: "Pull + webhook",
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
