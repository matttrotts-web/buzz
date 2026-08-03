import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCrmSnapshots,
  buildDbSnapshots,
  buildExecutiveUpdates,
  connectionStateForRole,
  CRM_SNAPSHOT_SENTINEL,
  crmSnapshotState,
  DB_SNAPSHOT_SENTINEL,
  dbSnapshotState,
  EXECUTIVE_UPDATE_SENTINEL,
  groupMissionsByStage,
  missionStageForStatus,
  summarizeConnections,
  trustedExecutiveIdentities,
} from "./model.ts";

function crmSnapshotContent(overrides = {}) {
  return `${CRM_SNAPSHOT_SENTINEL}\n${JSON.stringify({
    schema_version: 1,
    source: "odoo",
    authority: "projection",
    generated_at: "2026-08-01T16:00:00Z",
    currency: "USD",
    metrics: {
      lead_count: 41,
      open_opportunity_count: 7,
      pipeline_value: 125000,
      overdue_activity_count: 2,
    },
    stages: [
      { name: "Qualified", count: 3, value: 80000 },
      { name: "New", count: 4, value: 45000 },
    ],
    top_opportunities: [
      {
        record_id: "42",
        name: "Garden State Labs",
        stage: "Qualified",
        expected_revenue: 50000,
        probability: 60,
        next_activity_due: "2026-08-02",
        source_url: "https://crm.example.test/web#id=42&model=crm.lead",
      },
    ],
    ...overrides,
  })}`;
}

function dbSnapshotContent(overrides = {}) {
  return `${DB_SNAPSHOT_SENTINEL}\n${JSON.stringify({
    schema_version: 1,
    source: "wyzor-postgres",
    authority: "projection",
    generated_at: "2026-08-03T16:00:00Z",
    metrics: {
      agent_jobs: { unarchived: 10, active: 4, failed: 1 },
      crawl_runs_24h: { total: 20, failed: 2 },
      gates: { total: 50, blocked_or_failed: 3 },
      integrations: { total: 5, unhealthy: 1 },
      metrc_erp: {
        inventory_items: 100,
        metrc_mismatches: 2,
        inventory_on_hold: 3,
        active_plants: 40,
        open_transfers: 6,
        open_sales_orders: 7,
      },
    },
    ...overrides,
  })}`;
}

test("relay presence takes precedence over local deployment state", () => {
  const result = connectionStateForRole(
    "argus",
    [{ name: "Argus", status: "stopped" }],
    [{ name: "Argus", status: "online" }],
  );
  assert.equal(result, "connected");
});

test("registered remote bot is deployment-ready before it comes online", () => {
  const result = connectionStateForRole(
    "kitt",
    [
      {
        name: "KITT",
        personaId: "kitt",
        status: "deployed",
        backend: { type: "provider", id: "wyzor-hermes" },
      },
    ],
    [],
  );
  assert.equal(result, "deployment-ready");
});

test("summary separates connected, ready, and missing roles", () => {
  assert.deepEqual(
    summarizeConnections(["connected", "deployment-ready", "not-registered"]),
    { connected: 1, ready: 1, missing: 1 },
  );
});

test("mission statuses map to the operating board without inventing progress", () => {
  assert.equal(missionStageForStatus("planned"), "queued");
  assert.equal(missionStageForStatus("in-progress"), "active");
  assert.equal(missionStageForStatus("waiting approval"), "review");
  assert.equal(missionStageForStatus("shipped"), "completed");
});

test("missions group into stable command-center columns", () => {
  const projects = [
    {
      id: "one",
      name: "One",
      description: "",
      status: "todo",
      projectChannelId: null,
    },
    {
      id: "two",
      name: "Two",
      description: "",
      status: "blocked",
      projectChannelId: "channel-two",
    },
  ];

  const grouped = groupMissionsByStage(projects);
  assert.deepEqual(
    grouped.queued.map((project) => project.id),
    ["one"],
  );
  assert.deepEqual(
    grouped.review.map((project) => project.id),
    ["two"],
  );
  assert.equal(grouped.active.length, 0);
  assert.equal(grouped.completed.length, 0);
});

test("executive identities are derived only from named Wyzor agents", () => {
  assert.deepEqual(
    trustedExecutiveIdentities(
      [
        {
          pubkey: "KITT-PUBKEY",
          name: "worker-01",
          personaId: "kitt",
          status: "running",
        },
        {
          pubkey: "OTHER",
          name: "Researcher",
          status: "running",
        },
      ],
      [
        {
          pubkey: "ARGUS-PUBKEY",
          name: "Argus",
          status: "online",
        },
      ],
    ),
    [
      { pubkey: "argus-pubkey", role: "argus" },
      { pubkey: "kitt-pubkey", role: "kitt" },
    ],
  );
});

test("signed executive envelopes project into the matching trusted lane", () => {
  const content = `${EXECUTIVE_UPDATE_SENTINEL}
${JSON.stringify({
  schema_version: 1,
  lane: "gtm",
  type: "standup",
  period: "morning",
  health: "at-risk",
  title: "Revenue opening",
  summary: "Two qualified accounts need Matt decisions.",
  highlights: ["One account moved to discovery"],
  risks: ["Pricing answer is waiting"],
  asks: ["Approve the discovery call"],
})}`;

  const updates = buildExecutiveUpdates(
    [
      {
        id: "event-1",
        pubkey: "KITT-PUBKEY",
        content,
        createdAt: 100,
        channelId: "leadership",
        channelName: "leadership",
      },
    ],
    [{ pubkey: "kitt-pubkey", role: "kitt" }],
  );

  assert.equal(updates.length, 1);
  assert.equal(updates[0].lane, "gtm");
  assert.equal(updates[0].period, "morning");
  assert.equal(updates[0].health, "at-risk");
  assert.deepEqual(updates[0].asks, ["Approve the discovery call"]);
});

test("untrusted signers and role-lane impersonation are ignored", () => {
  const payload = (lane) => `${EXECUTIVE_UPDATE_SENTINEL}
${JSON.stringify({
  schema_version: 1,
  lane,
  type: "news",
  title: "Signal",
  summary: "A public market signal.",
})}`;

  const updates = buildExecutiveUpdates(
    [
      {
        id: "unknown",
        pubkey: "unknown",
        content: payload("gtm"),
        createdAt: 200,
        channelId: null,
        channelName: "",
      },
      {
        id: "wrong-lane",
        pubkey: "kitt",
        content: payload("ops"),
        createdAt: 100,
        channelId: null,
        channelName: "",
      },
    ],
    [{ pubkey: "kitt", role: "kitt" }],
  );

  assert.deepEqual(updates, []);
});

test("malformed or incomplete executive envelopes fail closed", () => {
  const feed = (content) => [
    {
      id: content,
      pubkey: "riggs",
      content,
      createdAt: 100,
      channelId: null,
      channelName: "",
    },
  ];
  const trusted = [{ pubkey: "riggs", role: "riggs" }];

  assert.deepEqual(buildExecutiveUpdates(feed("ordinary chat"), trusted), []);
  assert.deepEqual(
    buildExecutiveUpdates(
      feed(`${EXECUTIVE_UPDATE_SENTINEL}\n{"schema_version":1}`),
      trusted,
    ),
    [],
  );
  assert.deepEqual(
    buildExecutiveUpdates(
      feed(
        `${EXECUTIVE_UPDATE_SENTINEL}\n${JSON.stringify({
          schema_version: 1,
          lane: "riggs",
          type: "standup",
          title: "Missing period",
          summary: "This must not project.",
        })}`,
      ),
      trusted,
    ),
    [],
  );
});

test("KITT signed Odoo snapshots become CRM projections", () => {
  const snapshots = buildCrmSnapshots(
    [
      {
        id: "crm-event-1",
        pubkey: "KITT-PUBKEY",
        content: crmSnapshotContent(),
        createdAt: 1_754_067_600,
        channelId: "crm-ops",
        channelName: "crm-ops",
      },
    ],
    [{ pubkey: "kitt-pubkey", role: "kitt" }],
  );

  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].metrics.openOpportunityCount, 7);
  assert.equal(snapshots[0].metrics.pipelineValue, 125000);
  assert.equal(snapshots[0].topOpportunities[0].recordId, "42");
  assert.equal(snapshots[0].topOpportunities[0].stage, "Qualified");
});

test("CRM snapshots fail closed for non-KITT signers or false authority", () => {
  const item = {
    id: "crm-event-1",
    pubkey: "argus-pubkey",
    content: crmSnapshotContent(),
    createdAt: 1_754_067_600,
    channelId: "crm-ops",
    channelName: "crm-ops",
  };

  assert.deepEqual(
    buildCrmSnapshots([item], [{ pubkey: "argus-pubkey", role: "argus" }]),
    [],
  );
  assert.deepEqual(
    buildCrmSnapshots(
      [
        {
          ...item,
          pubkey: "kitt-pubkey",
          content: crmSnapshotContent({ authority: "system_of_record" }),
        },
      ],
      [{ pubkey: "kitt-pubkey", role: "kitt" }],
    ),
    [],
  );
});

test("malformed CRM values and unsafe deep links are rejected", () => {
  const feed = (content) => [
    {
      id: content,
      pubkey: "kitt",
      content,
      createdAt: 100,
      channelId: "crm-ops",
      channelName: "crm-ops",
    },
  ];
  const trusted = [{ pubkey: "kitt", role: "kitt" }];

  assert.deepEqual(
    buildCrmSnapshots(
      feed(
        crmSnapshotContent({
          metrics: {
            lead_count: -1,
            open_opportunity_count: 7,
            pipeline_value: 1,
            overdue_activity_count: 0,
          },
        }),
      ),
      trusted,
    ),
    [],
  );
  assert.deepEqual(
    buildCrmSnapshots(
      feed(
        crmSnapshotContent({
          top_opportunities: [
            {
              record_id: "42",
              name: "Unsafe",
              stage: "New",
              expected_revenue: 1,
              probability: 10,
              source_url: "javascript:alert(1)",
            },
          ],
        }),
      ),
      trusted,
    ),
    [],
  );
});

test("CRM snapshot freshness is explicit", () => {
  const snapshot = buildCrmSnapshots(
    [
      {
        id: "fresh",
        pubkey: "kitt",
        content: crmSnapshotContent(),
        createdAt: 1_754_067_600,
        channelId: "crm-ops",
        channelName: "crm-ops",
      },
    ],
    [{ pubkey: "kitt", role: "kitt" }],
  )[0];

  assert.equal(
    crmSnapshotState(snapshot, Date.parse("2026-08-01T20:00:00Z")),
    "connected",
  );
  assert.equal(
    crmSnapshotState(snapshot, Date.parse("2026-08-03T20:00:00Z")),
    "stale",
  );
  assert.equal(crmSnapshotState(null, Date.now()), "missing");
});

test("Argus signed database snapshots become Ops projections", () => {
  const snapshots = buildDbSnapshots(
    [
      {
        id: "db-event-1",
        pubkey: "ARGUS-PUBKEY",
        content: dbSnapshotContent(),
        createdAt: 1_754_238_000,
        channelId: "data-ops",
        channelName: "data-ops",
      },
    ],
    [{ pubkey: "argus-pubkey", role: "argus" }],
  );

  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].metrics.metrcErp.inventoryItems, 100);
  assert.equal(snapshots[0].metrics.metrcErp.metrcMismatches, 2);
  assert.equal(snapshots[0].metrics.agentJobs.active, 4);
});

test("database snapshots reject non-Argus signers and malformed counts", () => {
  const item = {
    id: "db-event-1",
    pubkey: "kitt-pubkey",
    content: dbSnapshotContent(),
    createdAt: 1_754_238_000,
    channelId: "data-ops",
    channelName: "data-ops",
  };
  assert.deepEqual(
    buildDbSnapshots([item], [{ pubkey: "kitt-pubkey", role: "kitt" }]),
    [],
  );
  assert.deepEqual(
    buildDbSnapshots(
      [
        {
          ...item,
          pubkey: "argus-pubkey",
          content: dbSnapshotContent({
            metrics: {
              agent_jobs: { unarchived: -1, active: 0, failed: 0 },
            },
          }),
        },
      ],
      [{ pubkey: "argus-pubkey", role: "argus" }],
    ),
    [],
  );
});

test("database snapshot freshness is explicit", () => {
  const snapshot = buildDbSnapshots(
    [
      {
        id: "fresh-db",
        pubkey: "argus",
        content: dbSnapshotContent(),
        createdAt: 1_754_238_000,
        channelId: "data-ops",
        channelName: "data-ops",
      },
    ],
    [{ pubkey: "argus", role: "argus" }],
  )[0];

  assert.equal(
    dbSnapshotState(snapshot, Date.parse("2026-08-03T16:30:00Z")),
    "connected",
  );
  assert.equal(
    dbSnapshotState(snapshot, Date.parse("2026-08-03T18:00:00Z")),
    "stale",
  );
});
