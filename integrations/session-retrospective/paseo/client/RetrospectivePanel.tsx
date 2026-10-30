/**
 * Passive, inert retrospective panel.
 *
 * Contract kept by this component:
 * - it never opens itself, plays sound, steals focus, sends an agent message, or
 *   starts work;
 * - the only call it makes is `retrospective.status`, which returns a static
 *   capability statement plus an in-memory identity observation — no path, no
 *   artifact id, no report text, and no filesystem or store access;
 * - it states that the capability is unavailable in this build and points at the
 *   supported manual route (the local CLI on the owning host) without claiming
 *   that CLI is packaged or installed;
 * - no data-collecting RPC is offered here, so the panel has no Prepare, read,
 *   transmit, paging or cancellation control to mislead anyone;
 * - every visible string is a fixed product string or a bounded identifier; raw
 *   host error text is never rendered.
 *
 * Cross-platform rules: React Native primitives only, styles from the host theme,
 * no DOM globals.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useAgent, useRpc } from "@getpaseo/plugin/client";
import type { PluginAgentPanelProps } from "@getpaseo/plugin/client";
import { statusContract, type StatusOutput } from "../shared/contracts";

export function RetrospectivePanel(props: PluginAgentPanelProps) {
  const { agentId } = props.params;
  const { theme, layout, host } = props;
  // A primitive selector keeps the hook result stable and drops the unused
  // `status` field; `null` means this client has no agent record yet.
  const relationship = useAgent(agentId, (value) =>
    value.parentAgentId === null ? ("main" as const) : ("child" as const),
  );

  const statusRpc = useRpc(statusContract);
  const [snapshot, setSnapshot] = useState<StatusOutput | null>(null);
  const [statusError, setStatusError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const next = await statusRpc({ agentId });
      setSnapshot(next);
      setStatusError(false);
    } catch {
      setStatusError(true);
    }
  }, [agentId, statusRpc]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      body: { padding: layout.compact ? 16 : 24, gap: 12 },
      card: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
        borderRadius: 8,
        padding: 12,
        gap: 6,
      },
      title: {
        color: theme.colors.foreground,
        fontSize: 16,
        fontWeight: "600" as const,
      },
      heading: {
        color: theme.colors.foreground,
        fontSize: 13,
        fontWeight: "600" as const,
      },
      text: { color: theme.colors.foreground, fontSize: 13, lineHeight: 19 },
      muted: {
        color: theme.colors.foregroundMuted,
        fontSize: 12,
        lineHeight: 18,
      },
      danger: {
        color: theme.colors.statusDanger,
        fontSize: 12,
        lineHeight: 18,
      },
      warning: {
        color: theme.colors.statusWarning,
        fontSize: 12,
        lineHeight: 18,
      },
    }),
    [theme, layout.compact],
  );

  const isMain = relationship === null ? null : relationship === "main";
  const identityState = snapshot?.identity.state ?? "unknown";
  const hostLabel = host.label.length > 0 ? host.label : host.id;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <Text style={styles.title}>Session retrospective</Text>
      <Text style={styles.muted} selectable>
        Session {agentId} · owning host {hostLabel}
      </Text>

      {statusError ? (
        <Text style={styles.danger}>
          The plugin backend did not answer. Nothing is read, prepared or sent.
        </Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.heading}>Capability unavailable</Text>
        <Text style={styles.text}>
          This build cannot prepare a retrospective or show report text. A Paseo
          plugin RPC handler receives no verifiable caller or human-action proof,
          so collecting local transcripts or returning report text over these RPCs
          would rest on an unverified admission boundary. That capability is
          therefore not offered.
        </Text>
        <Text style={styles.muted}>
          Only status answers. prepare, consent, view and disposition refuse with
          UNSUPPORTED before reading any transcript, manifest, store entry or
          artifact, and no setting enables them.
        </Text>
        <Text style={styles.muted}>
          This panel makes no model calls, reads no report text, lists no
          artifacts and opens nothing automatically.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Manual route on this host</Text>
        <Text style={styles.text}>
          Run the local retrospective CLI on the owning host against the same
          store root, then read the artifacts on that host. The CLI is the
          supported manual path while plugin support is unavailable.
        </Text>
        <Text style={styles.muted}>
          That CLI is not installed or packaged by this repository's setup yet, so
          treat it as pending. This panel does not run it, does not read
          transcripts and does not fetch report text.
        </Text>
      </View>

      {isMain === false ? (
        <Text style={styles.warning}>
          The app shows this session as a subagent. If the capability existed,
          retrospectives would be limited to main sessions.
        </Text>
      ) : null}
      {identityState === "unknown" ? (
        <Text style={styles.warning}>
          This host has not reported this session's parentage in this plugin
          lifetime. That only affects the identity note here, not any capability,
          because none is offered.
        </Text>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.heading}>Automatic invitations</Text>
        <Text style={styles.muted}>
          {snapshot === null
            ? "unknown"
            : snapshot.automatic.state === "supported"
              ? "supported on this host"
              : `unsupported (${snapshot.automatic.reason})`}
          .
        </Text>
        <Text style={styles.muted}>
          Structured checkpoint tool:{" "}
          {snapshot === null
            ? "unknown"
            : snapshot.checkpointTool
              ? "registered; acknowledgements only, no report or path content"
              : "not registered"}
          .
        </Text>
      </View>
    </ScrollView>
  );
}
