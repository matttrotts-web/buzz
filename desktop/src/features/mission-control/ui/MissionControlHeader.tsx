import { Bot, Radar } from "lucide-react";

import type { MissionControlView } from "@/features/mission-control/model";
import { MISSION_CONTROL_VIEWS } from "@/features/mission-control/model";
import { Button } from "@/shared/ui/button";
import { TabsList, TabsTrigger } from "@/shared/ui/tabs";

export function MissionControlHeader({
  activeView,
  onRegisterAgents,
}: {
  activeView: MissionControlView;
  onRegisterAgents: () => void;
}) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 px-6 py-7 shadow-xs">
      <div className="absolute -right-10 -top-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative space-y-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <Radar className="h-4 w-4 text-primary" />
              Wyzor operating system
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Autopilot Mission Control
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                A live command layer across missions, Hermes workers, business
                systems, and signed gate decisions.
              </p>
            </div>
          </div>
          <Button onClick={onRegisterAgents} type="button">
            <Bot className="h-4 w-4" />
            Register agents
          </Button>
        </div>

        <TabsList
          aria-label="Mission Control views"
          className="h-auto w-full justify-start overflow-x-auto bg-muted/70 p-1"
        >
          {MISSION_CONTROL_VIEWS.map((view) => (
            <TabsTrigger
              className="min-w-fit px-4 py-2"
              key={view.id}
              value={view.id}
            >
              {view.label}
              {activeView === view.id ? (
                <span className="sr-only"> selected</span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </header>
  );
}
