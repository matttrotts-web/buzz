import * as React from "react";

import { useAppNavigation } from "@/app/navigation/useAppNavigation";
import {
  useAcpRuntimesQuery,
  useManagedAgentsQuery,
  useRelayAgentsQuery,
} from "@/features/agents/hooks";
import { useChannelsQuery } from "@/features/channels/hooks";
import { channelNamesMatch } from "@/features/channels/lib/canonicalChannelName";
import {
  useChannelMessagesQuery,
  useChannelSubscription,
} from "@/features/messages/hooks";
import {
  buildCrmSnapshots,
  buildDbSnapshots,
  buildExecutiveUpdates,
  connectionStateForRole,
  crmSnapshotState,
  dbSnapshotState,
  type MissionControlView,
  trustedExecutiveIdentities,
  WYZOR_AGENT_LANES,
} from "@/features/mission-control/model";
import { useHomeFeedQuery } from "@/features/home/hooks";
import { useProjectsQuery } from "@/features/projects/hooks";
import { Tabs, TabsContent } from "@/shared/ui/tabs";

import { MissionControlData } from "./MissionControlData";
import { MissionControlDecisions } from "./MissionControlDecisions";
import { MissionControlFleet } from "./MissionControlFleet";
import { MissionControlHeader } from "./MissionControlHeader";
import { MissionControlMissions } from "./MissionControlMissions";
import { MissionControlOverview } from "./MissionControlOverview";

export function MissionControlScreen() {
  const [activeView, setActiveView] =
    React.useState<MissionControlView>("overview");
  const managedAgentsQuery = useManagedAgentsQuery();
  const relayAgentsQuery = useRelayAgentsQuery();
  const runtimesQuery = useAcpRuntimesQuery();
  const projectsQuery = useProjectsQuery();
  const channelsQuery = useChannelsQuery();
  const homeFeedQuery = useHomeFeedQuery();
  const { goAgents, goChannel, goProject, goProjects, goWorkflows } =
    useAppNavigation();

  const agentStates = React.useMemo(
    () =>
      WYZOR_AGENT_LANES.map((agent) => ({
        ...agent,
        connection: connectionStateForRole(
          agent.role,
          managedAgentsQuery.data ?? [],
          relayAgentsQuery.data ?? [],
        ),
      })),
    [managedAgentsQuery.data, relayAgentsQuery.data],
  );
  const projects = projectsQuery.data ?? [];
  const channels = channelsQuery.data ?? [];
  const managedAgents = managedAgentsQuery.data ?? [];
  const relayAgents = relayAgentsQuery.data ?? [];
  const trustedIdentities = React.useMemo(
    () => trustedExecutiveIdentities(managedAgents, relayAgents),
    [managedAgents, relayAgents],
  );
  const crmChannel = React.useMemo(
    () =>
      channels.find((channel) => channelNamesMatch(channel.name, "crm-ops")) ??
      null,
    [channels],
  );
  const dbChannel = React.useMemo(
    () =>
      channels.find((channel) => channelNamesMatch(channel.name, "data-ops")) ??
      null,
    [channels],
  );
  const crmMessagesQuery = useChannelMessagesQuery(crmChannel);
  const dbMessagesQuery = useChannelMessagesQuery(dbChannel);
  useChannelSubscription(crmChannel);
  useChannelSubscription(dbChannel);
  const executiveUpdates = React.useMemo(() => {
    const feed = homeFeedQuery.data?.feed;
    const items = feed
      ? [
          ...feed.mentions,
          ...feed.needsAction,
          ...feed.activity,
          ...feed.agentActivity,
        ]
      : [];
    return buildExecutiveUpdates(items, trustedIdentities);
  }, [homeFeedQuery.data, trustedIdentities]);
  const crmSnapshot = React.useMemo(() => {
    if (!crmChannel) return null;
    const items = (crmMessagesQuery.data ?? []).map((event) => ({
      id: event.id,
      pubkey: event.pubkey,
      content: event.content,
      createdAt: event.created_at,
      channelId: crmChannel.id,
      channelName: crmChannel.name,
    }));
    return buildCrmSnapshots(items, trustedIdentities)[0] ?? null;
  }, [crmChannel, crmMessagesQuery.data, trustedIdentities]);
  const crmState = crmSnapshotState(crmSnapshot);
  const dbSnapshot = React.useMemo(() => {
    if (!dbChannel) return null;
    const items = (dbMessagesQuery.data ?? []).map((event) => ({
      id: event.id,
      pubkey: event.pubkey,
      content: event.content,
      createdAt: event.created_at,
      channelId: dbChannel.id,
      channelName: dbChannel.name,
    }));
    return buildDbSnapshots(items, trustedIdentities)[0] ?? null;
  }, [dbChannel, dbMessagesQuery.data, trustedIdentities]);
  const dbState = dbSnapshotState(dbSnapshot);
  const activeManagedAgentCount = managedAgents.filter(
    (agent) => agent.status === "running" || agent.status === "deployed",
  ).length;
  const riggsState =
    agentStates.find((agent) => agent.role === "riggs")?.connection ??
    "not-registered";

  return (
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background">
      <Tabs
        onValueChange={(value) => setActiveView(value as MissionControlView)}
        value={activeView}
      >
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-6 py-7 lg:px-9">
          <MissionControlHeader
            activeView={activeView}
            onRegisterAgents={() => void goAgents()}
          />

          <TabsContent className="mt-0" value="overview">
            <MissionControlOverview
              agents={agentStates}
              activeManagedAgentCount={activeManagedAgentCount}
              channels={channels}
              crmSnapshot={crmSnapshot}
              crmState={crmState}
              dbState={dbState}
              executiveUpdates={executiveUpdates}
              isCrmLoading={crmMessagesQuery.isLoading}
              isExecutiveFeedLoading={homeFeedQuery.isLoading}
              managedAgentCount={managedAgents.length}
              onOpenChannel={(channelId) => void goChannel(channelId)}
              onOpenMission={(projectId) => void goProject(projectId)}
              onShowData={() => setActiveView("data")}
              onShowFleet={() => setActiveView("fleet")}
              onShowMissions={() => setActiveView("missions")}
              projects={projects}
            />
          </TabsContent>

          <TabsContent className="mt-0" value="fleet">
            <MissionControlFleet
              agents={managedAgents}
              onManageAgents={() => void goAgents()}
              relayAgents={relayAgentsQuery.data ?? []}
              runtimes={runtimesQuery.data ?? []}
            />
          </TabsContent>

          <TabsContent className="mt-0" value="missions">
            <MissionControlMissions
              channels={channels}
              onOpenChannel={(channelId) => void goChannel(channelId)}
              onOpenMission={(projectId) => void goProject(projectId)}
              onOpenProjects={() => void goProjects()}
              projects={projects}
            />
          </TabsContent>

          <TabsContent className="mt-0" value="decisions">
            <MissionControlDecisions
              onOpenWorkflows={() => void goWorkflows()}
              riggsState={riggsState}
            />
          </TabsContent>

          <TabsContent className="mt-0" value="data">
            <MissionControlData
              crmSnapshot={crmSnapshot}
              crmState={crmState}
              dbSnapshot={dbSnapshot}
              dbState={dbState}
              isCrmLoading={crmMessagesQuery.isLoading}
              isDbLoading={dbMessagesQuery.isLoading}
              onOpenCrmChannel={() =>
                crmChannel ? void goChannel(crmChannel.id) : undefined
              }
              onOpenDbChannel={() =>
                dbChannel ? void goChannel(dbChannel.id) : undefined
              }
            />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}
