export const CRM_SNAPSHOT_SENTINEL = "WYZOR_CRM_SNAPSHOT_V1";

export type CrmSnapshotState = "connected" | "stale" | "missing";

export type CrmFeedItemLike = {
  id: string;
  pubkey: string;
  content: string;
  createdAt: number;
  channelId: string | null;
  channelName: string;
};

export type CrmTrustedIdentity = {
  pubkey: string;
  role: "argus" | "riggs" | "kitt";
};

export type CrmStage = {
  name: string;
  count: number;
  value: number;
};

export type CrmOpportunity = {
  recordId: string;
  name: string;
  stage: string;
  expectedRevenue: number;
  probability: number;
  nextActivityDue: string | null;
  sourceUrl: string | null;
};

export type CrmSnapshot = {
  id: string;
  source: "odoo";
  authority: "projection";
  generatedAt: number;
  currency: string;
  metrics: {
    leadCount: number;
    openOpportunityCount: number;
    pipelineValue: number;
    overdueActivityCount: number;
  };
  stages: CrmStage[];
  topOpportunities: CrmOpportunity[];
  eventCreatedAt: number;
  channelId: string | null;
  channelName: string;
  pubkey: string;
};

const MAX_SNAPSHOT_AGE_MS = 24 * 60 * 60 * 1_000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;

function normalizePubkey(pubkey: string | null | undefined) {
  return pubkey?.trim().toLowerCase() ?? "";
}

function boundedString(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
}

function nonnegativeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function nonnegativeInteger(value: unknown) {
  const number = nonnegativeNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

function safeSourceUrl(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function optionalIsoDate(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === false ||
    value === ""
  ) {
    return null;
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  return Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ? value : undefined;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseStages(value: unknown): CrmStage[] | null {
  if (!Array.isArray(value) || value.length > 20) return null;
  const stages: CrmStage[] = [];
  for (const item of value) {
    const raw = record(item);
    const name = boundedString(raw?.name, 80);
    const count = nonnegativeInteger(raw?.count);
    const stageValue = nonnegativeNumber(raw?.value);
    if (!raw || !name || count === null || stageValue === null) return null;
    stages.push({ name, count, value: stageValue });
  }
  return stages;
}

function parseOpportunities(value: unknown): CrmOpportunity[] | null {
  if (!Array.isArray(value) || value.length > 8) return null;
  const opportunities: CrmOpportunity[] = [];
  for (const item of value) {
    const raw = record(item);
    const recordId = boundedString(raw?.record_id, 80);
    const name = boundedString(raw?.name, 160);
    const stage = boundedString(raw?.stage, 80);
    const expectedRevenue = nonnegativeNumber(raw?.expected_revenue);
    const probability = nonnegativeNumber(raw?.probability);
    const nextActivityDue = optionalIsoDate(raw?.next_activity_due);
    const sourceUrl = safeSourceUrl(raw?.source_url);
    if (
      !raw ||
      !recordId ||
      !name ||
      !stage ||
      expectedRevenue === null ||
      probability === null ||
      probability > 100 ||
      nextActivityDue === undefined ||
      sourceUrl === undefined
    ) {
      return null;
    }
    opportunities.push({
      recordId,
      name,
      stage,
      expectedRevenue,
      probability,
      nextActivityDue,
      sourceUrl,
    });
  }
  return opportunities;
}

function parseCrmPayload(content: string) {
  const markerIndex = content.indexOf(CRM_SNAPSHOT_SENTINEL);
  if (markerIndex < 0) return null;
  const encoded = content
    .slice(markerIndex + CRM_SNAPSHOT_SENTINEL.length)
    .trim();
  if (!encoded.startsWith("{")) return null;

  let raw: Record<string, unknown>;
  try {
    const parsed = record(JSON.parse(encoded));
    if (!parsed) return null;
    raw = parsed;
  } catch {
    return null;
  }

  if (
    raw.schema_version !== 1 ||
    raw.source !== "odoo" ||
    raw.authority !== "projection"
  ) {
    return null;
  }
  const generatedAtText = boundedString(raw.generated_at, 64);
  const generatedAt = generatedAtText
    ? Date.parse(generatedAtText)
    : Number.NaN;
  const currency = boundedString(raw.currency, 3);
  const metrics = record(raw.metrics);
  const leadCount = nonnegativeInteger(metrics?.lead_count);
  const openOpportunityCount = nonnegativeInteger(
    metrics?.open_opportunity_count,
  );
  const pipelineValue = nonnegativeNumber(metrics?.pipeline_value);
  const overdueActivityCount = nonnegativeInteger(
    metrics?.overdue_activity_count,
  );
  const stages = parseStages(raw.stages);
  const topOpportunities = parseOpportunities(raw.top_opportunities);
  if (
    !Number.isFinite(generatedAt) ||
    !currency ||
    !/^[A-Z]{3}$/.test(currency) ||
    !metrics ||
    leadCount === null ||
    openOpportunityCount === null ||
    pipelineValue === null ||
    overdueActivityCount === null ||
    !stages ||
    !topOpportunities
  ) {
    return null;
  }

  return {
    generatedAt,
    currency,
    metrics: {
      leadCount,
      openOpportunityCount,
      pipelineValue,
      overdueActivityCount,
    },
    stages,
    topOpportunities,
  };
}

export function buildCrmSnapshots(
  feedItems: readonly CrmFeedItemLike[],
  trustedIdentities: readonly CrmTrustedIdentity[],
): CrmSnapshot[] {
  const trustedKittPubkeys = new Set(
    trustedIdentities
      .filter((identity) => identity.role === "kitt")
      .map((identity) => normalizePubkey(identity.pubkey)),
  );
  const seen = new Set<string>();
  const snapshots: CrmSnapshot[] = [];

  for (const item of feedItems) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const pubkey = normalizePubkey(item.pubkey);
    if (!trustedKittPubkeys.has(pubkey)) continue;
    const payload = parseCrmPayload(item.content);
    if (!payload) continue;
    snapshots.push({
      id: item.id,
      source: "odoo",
      authority: "projection",
      ...payload,
      eventCreatedAt: item.createdAt,
      channelId: item.channelId,
      channelName: item.channelName,
      pubkey,
    });
  }

  return snapshots.sort((left, right) => right.generatedAt - left.generatedAt);
}

export function crmSnapshotState(
  snapshot: CrmSnapshot | null | undefined,
  now = Date.now(),
): CrmSnapshotState {
  if (!snapshot) return "missing";
  const age = now - snapshot.generatedAt;
  return age >= -MAX_CLOCK_SKEW_MS && age <= MAX_SNAPSHOT_AGE_MS
    ? "connected"
    : "stale";
}
