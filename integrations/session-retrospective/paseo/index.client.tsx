/**
 * App-side entry for the manual package.
 *
 * Three passive entry points, all opening the same panel:
 * - a Command Center status item in agent context;
 * - `/retrospective` in the composer, whose text is never sent to the agent;
 * - the panel itself, registered for agent tabs.
 *
 * Nothing here starts work and nothing here offers preparation: the panel makes
 * one `status` call on mount and offers no action. The labels name the status
 * view, not a preparation action this build does not provide. Unloading the
 * plugin removes all three registrations.
 */
import type { PluginClientContext } from "@getpaseo/plugin/client";
import { RetrospectivePanel } from "./client/RetrospectivePanel";

const PANEL_ID = "retrospective";

export default function contribute(client: PluginClientContext) {
  const removePanel = client.addAgentPanel({
    id: PANEL_ID,
    title: "Retrospective",
    icon: "History",
    Component: RetrospectivePanel,
  });

  const removeCommandCenterItem = client.addCommandCenterItem({
    id: "open-retrospective",
    title: "Session retrospective status",
    icon: "History",
    keywords: ["retrospective", "session", "review", "learning", "status"],
    context: "agent",
    onSelect({ openPanel }) {
      openPanel(PANEL_ID);
    },
  });

  const removeSlashCommand = client.addSlashCommand({
    name: "retrospective",
    description:
      "Show why local retrospectives are unavailable here and the manual CLI route",
    argumentHint: "",
    context: "agent",
    onSubmit({ openPanel }) {
      openPanel(PANEL_ID);
    },
  });

  return () => {
    removeSlashCommand();
    removeCommandCenterItem();
    removePanel();
  };
}
