import assert from "node:assert/strict";
import test from "node:test";

import {
  buildExecutiveUpdates,
  connectionStateForRole,
  EXECUTIVE_UPDATE_SENTINEL,
  groupMissionsByStage,
  missionStageForStatus,
  summarizeConnections,
  trustedExecutiveIdentities,
} from "./model.ts";

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
