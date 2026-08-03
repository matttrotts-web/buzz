import assert from "node:assert/strict";
import test from "node:test";

import { managedAgentCreationStatus } from "./managedAgentCreationCopy.ts";

test("a provider bundle is described as waiting for its bridge", () => {
  assert.equal(
    managedAgentCreationStatus({
      backend: { type: "provider", id: "wyzor-hermes", config: {} },
      name: "KITT",
      status: "deployed",
    }),
    "KITT bundle prepared. Waiting for bridge.",
  );
});

test("a running local agent is described as running", () => {
  assert.equal(
    managedAgentCreationStatus({
      backend: { type: "local" },
      name: "Fizz",
      status: "running",
    }),
    "Fizz is ready and running.",
  );
});
