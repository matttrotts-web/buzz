import assert from "node:assert/strict";
import test from "node:test";

import {
  connectionStateForRole,
  groupMissionsByStage,
  missionStageForStatus,
  summarizeConnections,
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
