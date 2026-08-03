import { ArrowUpRight, Hash, Layers3 } from "lucide-react";

import {
  groupMissionsByStage,
  MISSION_STAGES,
  type MissionProjectLike,
} from "@/features/mission-control/model";
import type { Channel } from "@/shared/api/types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export function MissionControlMissions({
  channels,
  projects,
  onOpenChannel,
  onOpenMission,
  onOpenProjects,
}: {
  channels: readonly Channel[];
  projects: readonly MissionProjectLike[];
  onOpenChannel: (channelId: string) => void;
  onOpenMission: (projectId: string) => void;
  onOpenProjects: () => void;
}) {
  const grouped = groupMissionsByStage(projects);
  const linkedChannelIds = new Set(
    projects
      .map((project) => project.projectChannelId)
      .filter((channelId): channelId is string => channelId !== null),
  );
  const unassignedChannels = channels.filter(
    (channel) =>
      channel.channelType !== "dm" &&
      channel.archivedAt === null &&
      !linkedChannelIds.has(channel.id),
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-border/60 bg-card px-5 py-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Layers3 className="h-5 w-5 text-primary" />
            Mission convoy board
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Projects are the mission objects. Their real status determines
            placement on this board.
          </p>
        </div>
        <Button onClick={onOpenProjects} variant="outline">
          Manage projects
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-4">
        {MISSION_STAGES.map((stage) => (
          <div className="min-w-0 space-y-3" key={stage.id}>
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="text-sm font-semibold">{stage.label}</h3>
                <p className="text-xs text-muted-foreground">
                  {stage.description}
                </p>
              </div>
              <Badge variant="secondary">{grouped[stage.id].length}</Badge>
            </div>
            <div className="space-y-3">
              {grouped[stage.id].length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border px-4 py-7 text-center text-xs text-muted-foreground">
                  No missions
                </div>
              ) : (
                grouped[stage.id].map((project) => (
                  <button
                    className="w-full rounded-2xl border border-border/60 bg-card p-4 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm"
                    key={project.id}
                    onClick={() => onOpenMission(project.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold">{project.name}</p>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                      {project.description || "No mission brief yet."}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <Badge variant="outline">
                        {project.status || "active"}
                      </Badge>
                      <span className="text-2xs uppercase tracking-wider text-muted-foreground">
                        {project.projectChannelId
                          ? "Channel linked"
                          : "No channel"}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Unassigned operating lanes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Active channels that are not yet attached to a project mission.
          </p>
        </CardHeader>
        <CardContent>
          {unassignedChannels.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Every active channel is attached to a mission.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unassignedChannels.slice(0, 9).map((channel) => (
                <button
                  className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-3 text-left hover:bg-muted/50"
                  key={channel.id}
                  onClick={() => onOpenChannel(channel.id)}
                  type="button"
                >
                  <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {channel.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {channel.description || `${channel.memberCount} members`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
