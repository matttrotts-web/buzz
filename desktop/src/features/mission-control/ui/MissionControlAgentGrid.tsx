import { Bot, ShieldCheck } from "lucide-react";

import type {
  AgentConnectionState,
  AgentLaneState,
} from "@/features/mission-control/model";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const statePresentation: Record<
  AgentConnectionState,
  { label: string; variant: "success" | "warning" | "secondary" }
> = {
  connected: { label: "Connected", variant: "success" },
  "deployment-ready": { label: "Ready to install", variant: "warning" },
  "not-registered": { label: "Not registered", variant: "secondary" },
};

export function MissionControlAgentGrid({
  agents,
}: {
  agents: readonly AgentLaneState[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {agents.map((agent) => {
        const presentation = statePresentation[agent.connection];
        return (
          <Card className="overflow-hidden" key={agent.role}>
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  {agent.role === "riggs" ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                </div>
                <Badge variant={presentation.variant}>
                  {presentation.label}
                </Badge>
              </div>
              <div>
                <CardTitle className="text-xl">{agent.name}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {agent.lane}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Publishes
                </p>
                <p className="mt-1 text-sm leading-5">{agent.publishes}</p>
              </div>
              <div className="rounded-xl bg-muted/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                {agent.authority}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
