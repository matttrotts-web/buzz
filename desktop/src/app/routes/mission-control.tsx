import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ViewLoadingFallback } from "@/shared/ui/ViewLoadingFallback";

const MissionControlScreen = React.lazy(async () => {
  const module = await import(
    "@/features/mission-control/ui/MissionControlScreen"
  );
  return { default: module.MissionControlScreen };
});

export const Route = createFileRoute("/mission-control")({
  component: MissionControlRouteComponent,
});

function MissionControlRouteComponent() {
  return (
    <React.Suspense fallback={<ViewLoadingFallback kind="agents" />}>
      <MissionControlScreen />
    </React.Suspense>
  );
}
