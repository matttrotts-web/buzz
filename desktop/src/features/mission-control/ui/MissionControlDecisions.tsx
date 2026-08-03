import {
  CheckCircle2,
  CircleDashed,
  KeyRound,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import type { AgentConnectionState } from "@/features/mission-control/model";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function MissionControlDecisions({
  riggsState,
  onOpenWorkflows,
}: {
  riggsState: AgentConnectionState;
  onOpenWorkflows: () => void;
}) {
  const riggsReady = riggsState === "connected";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <GateCard
          description="A signed Riggs pass, fail, or hold event must exist before automated promotion."
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Riggs verdict"
          state={riggsReady ? "Listening" : "Awaiting agent"}
          variant={riggsReady ? "success" : "warning"}
        />
        <GateCard
          description="Human authorization remains mandatory wherever Wyzor policy requires it."
          icon={<UserCheck className="h-5 w-5" />}
          label="Matt signoff"
          state="Policy enforced"
          variant="info"
        />
        <GateCard
          description="Production deploy credentials and PINs stay outside the desktop projection."
          icon={<KeyRound className="h-5 w-5" />}
          label="Production boundary"
          state="Protected"
          variant="success"
        />
      </section>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Signed gate ledger
            </CardTitle>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              This view will list real dispatch, handoff, review, promotion, and
              deploy verdict events. It stays empty until Riggs publishes them;
              Mission Control will never manufacture approvals.
            </p>
          </div>
          <Button onClick={onOpenWorkflows} variant="outline">
            Open workflows
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center">
            <div className="max-w-md">
              <CircleDashed className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-semibold">No signed decisions yet</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {riggsReady
                  ? "Riggs is connected. Verdicts will appear here when the gate event adapter begins publishing."
                  : "Connect Riggs, then enable the signed gate event adapter to populate this ledger."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Decision sequence</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          {[
            ["1", "Dispatch", "Mission and acceptance criteria signed"],
            ["2", "Handoff", "Evidence and output submitted"],
            ["3", "Riggs verdict", "Pass, fail, or hold signed"],
            ["4", "Promote", "Human signoff applied when required"],
          ].map(([step, title, description]) => (
            <div
              className="rounded-xl border border-border/60 px-4 py-4"
              key={step}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {step}
              </span>
              <p className="mt-3 text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function GateCard({
  description,
  icon,
  label,
  state,
  variant,
}: {
  description: string;
  icon: React.ReactNode;
  label: string;
  state: string;
  variant: "success" | "warning" | "info";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-primary">{icon}</span>
          <Badge variant={variant}>{state}</Badge>
        </div>
        <p className="mt-5 font-semibold">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
