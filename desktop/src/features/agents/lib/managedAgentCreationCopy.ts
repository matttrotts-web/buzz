import type { ManagedAgent } from "@/shared/api/types";

export function managedAgentCreationStatus(
  agent: Pick<ManagedAgent, "backend" | "name" | "status">,
) {
  if (agent.backend.type === "provider") {
    return `${agent.name} bundle prepared. Waiting for bridge.`;
  }

  return `${agent.name} is ready${
    agent.status === "running" ? " and running." : "."
  }`;
}
