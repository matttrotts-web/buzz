import assert from "node:assert/strict";
import test from "node:test";

import { connectionStateForRole, summarizeConnections } from "./model.ts";

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
