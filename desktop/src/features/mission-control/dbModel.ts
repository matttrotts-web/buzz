export const DB_SNAPSHOT_SENTINEL = "WYZOR_DB_SNAPSHOT_V1";

export type DbSnapshotState = "connected" | "stale" | "missing";

export type DbFeedItemLike = {
  id: string;
  pubkey: string;
  content: string;
  createdAt: number;
  channelId: string | null;
  channelName: string;
};

export type DbTrustedIdentity = {
  pubkey: string;
  role: "argus" | "riggs" | "kitt";
};

export type DbSnapshot = {
  id: string;
  source: "wyzor-postgres";
  authority: "projection";
  generatedAt: number;
  metrics: {
    agentJobs: { unarchived: number; active: number; failed: number };
    crawlRuns24h: { total: number; failed: number };
    gates: { total: number; blockedOrFailed: number };
    integrations: { total: number; unhealthy: number };
    metrcErp: {
      inventoryItems: number;
      metrcMismatches: number;
      inventoryOnHold: number;
      activePlants: number;
      openTransfers: number;
      openSalesOrders: number;
    };
  };
  eventCreatedAt: number;
  channelId: string | null;
  channelName: string;
  pubkey: string;
};

const MAX_SNAPSHOT_AGE_MS = 60 * 60 * 1_000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1_000;

function normalizePubkey(pubkey: string | null | undefined) {
  return pubkey?.trim().toLowerCase() ?? "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonnegativeInteger(value: unknown) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
    ? value
    : null;
}

function integerGroup(
  value: unknown,
  fields: readonly string[],
): Record<string, number> | null {
  const raw = record(value);
  if (!raw) return null;
  const result: Record<string, number> = {};
  for (const field of fields) {
    const parsed = nonnegativeInteger(raw[field]);
    if (parsed === null) return null;
    result[field] = parsed;
  }
  return result;
}

function parseDbPayload(content: string) {
  const markerIndex = content.indexOf(DB_SNAPSHOT_SENTINEL);
  if (markerIndex < 0) return null;
  const encoded = content
    .slice(markerIndex + DB_SNAPSHOT_SENTINEL.length)
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
    raw.source !== "wyzor-postgres" ||
    raw.authority !== "projection"
  ) {
    return null;
  }

  const generatedAt =
    typeof raw.generated_at === "string"
      ? Date.parse(raw.generated_at)
      : Number.NaN;
  const metrics = record(raw.metrics);
  const agentJobs = integerGroup(metrics?.agent_jobs, [
    "unarchived",
    "active",
    "failed",
  ]);
  const crawlRuns24h = integerGroup(metrics?.crawl_runs_24h, [
    "total",
    "failed",
  ]);
  const gates = integerGroup(metrics?.gates, ["total", "blocked_or_failed"]);
  const integrations = integerGroup(metrics?.integrations, [
    "total",
    "unhealthy",
  ]);
  const metrcErp = integerGroup(metrics?.metrc_erp, [
    "inventory_items",
    "metrc_mismatches",
    "inventory_on_hold",
    "active_plants",
    "open_transfers",
    "open_sales_orders",
  ]);
  if (
    !Number.isFinite(generatedAt) ||
    !metrics ||
    !agentJobs ||
    !crawlRuns24h ||
    !gates ||
    !integrations ||
    !metrcErp
  ) {
    return null;
  }

  return {
    generatedAt,
    metrics: {
      agentJobs: {
        unarchived: agentJobs.unarchived,
        active: agentJobs.active,
        failed: agentJobs.failed,
      },
      crawlRuns24h: {
        total: crawlRuns24h.total,
        failed: crawlRuns24h.failed,
      },
      gates: {
        total: gates.total,
        blockedOrFailed: gates.blocked_or_failed,
      },
      integrations: {
        total: integrations.total,
        unhealthy: integrations.unhealthy,
      },
      metrcErp: {
        inventoryItems: metrcErp.inventory_items,
        metrcMismatches: metrcErp.metrc_mismatches,
        inventoryOnHold: metrcErp.inventory_on_hold,
        activePlants: metrcErp.active_plants,
        openTransfers: metrcErp.open_transfers,
        openSalesOrders: metrcErp.open_sales_orders,
      },
    },
  };
}

export function buildDbSnapshots(
  feedItems: readonly DbFeedItemLike[],
  trustedIdentities: readonly DbTrustedIdentity[],
): DbSnapshot[] {
  const trustedArgusPubkeys = new Set(
    trustedIdentities
      .filter((identity) => identity.role === "argus")
      .map((identity) => normalizePubkey(identity.pubkey)),
  );
  const seen = new Set<string>();
  const snapshots: DbSnapshot[] = [];

  for (const item of feedItems) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const pubkey = normalizePubkey(item.pubkey);
    if (!trustedArgusPubkeys.has(pubkey)) continue;
    const payload = parseDbPayload(item.content);
    if (!payload) continue;
    snapshots.push({
      id: item.id,
      source: "wyzor-postgres",
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

export function dbSnapshotState(
  snapshot: DbSnapshot | null | undefined,
  now = Date.now(),
): DbSnapshotState {
  if (!snapshot) return "missing";
  const age = now - snapshot.generatedAt;
  return age >= -MAX_CLOCK_SKEW_MS && age <= MAX_SNAPSHOT_AGE_MS
    ? "connected"
    : "stale";
}
