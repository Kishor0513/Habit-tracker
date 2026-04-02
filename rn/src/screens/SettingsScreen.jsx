import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { useApp } from "../state/AppState";
import { useToast } from "../state/ToastState";
import { TEMPLATE_PACKS } from "../seed";
import { Btn, Card, Screen, SectionTitle, StatCard, colors, radius } from "../ui/components";

async function loadSpotify() {
  return import("../lib/spotifyMobile");
}

function JsonModal({ visible, title, initialValue, onClose, onConfirm, confirmLabel }) {
  const [text, setText] = useState(initialValue ?? "");
  useEffect(() => setText(initialValue ?? ""), [initialValue, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen title={title} subtitle="Copy, inspect, and move your data safely." eyebrow="Data tools" scroll right={<Btn label="Close" onPress={onClose} />}>
        <Card>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoCapitalize="none"
            placeholderTextColor={colors.muted}
            style={{
              minHeight: 280,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: "rgba(255,255,255,0.74)",
              color: colors.text,
              paddingHorizontal: 14,
              paddingVertical: 12,
              textAlignVertical: "top",
            }}
          />
          {onConfirm ? (
            <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
              <Btn label="Cancel" onPress={onClose} />
              <Btn kind="primary" label={confirmLabel ?? "Confirm"} onPress={() => onConfirm(text)} />
            </View>
          ) : null}
        </Card>
      </Screen>
    </Modal>
  );
}

export default function SettingsScreen() {
  const { api, isReady, supabaseConfigured, user, auth, refresh } = useApp();
  const toast = useToast();
  const [habits, setHabits] = useState([]);
  const [projects, setProjects] = useState([]);
  const [entries, setEntries] = useState([]);
  const [spotifyBusy, setSpotifyBusy] = useState(false);
  const [spotifyMe, setSpotifyMe] = useState(null);
  const spotifyClientId = process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID?.trim() || "";
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportText, setExportText] = useState("");

  useEffect(() => {
    if (!api) return;
    let alive = true;
    Promise.all([api.listHabits(), api.listProjects(), api.listEntries()])
      .then(([h, p, e]) => {
        if (!alive) return;
        setHabits(h ?? []);
        setProjects(p ?? []);
        setEntries(e ?? []);
      })
      .catch((err) => console.error(err));
    return () => {
      alive = false;
    };
  }, [api, isReady, exportOpen, importOpen]);

  useEffect(() => {
    if (!spotifyClientId) return;
    let alive = true;
    loadSpotify()
      .then(({ spotifyLoadAuth, spotifyGetMe }) =>
        spotifyLoadAuth()
          .then((authState) => {
            if (!alive) return null;
            if (!authState?.accessToken) return null;
            return spotifyGetMe({ clientId: spotifyClientId });
          })
          .then((me) => {
            if (!alive) return;
            if (me) setSpotifyMe(me);
          })
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [spotifyClientId]);

  const exportPayload = useMemo(() => ({ habits, projects, entries, settings: {} }), [habits, projects, entries]);

  if (!isReady) return null;

  return (
    <>
      <Screen
        title="Settings"
        subtitle="Templates, sync, import, export, and integrations live here."
        eyebrow="Workspace control"
        scroll
        heroStats={[
          { label: "Habits", value: habits.length },
          { label: "Projects", value: projects.length },
          { label: "Entries", value: entries.length },
        ]}
      >
        <Card tone="accent">
          <SectionTitle eyebrow="Status" title="Current setup" subtitle={supabaseConfigured ? "Cloud sync is available for this app." : "This app is currently running in local-only mode."} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="Sync" value={supabaseConfigured ? "Supabase" : "Local"} accent />
            <StatCard label="Spotify" value={spotifyMe ? "Connected" : spotifyClientId ? "Ready" : "Off"} />
          </View>
        </Card>

        <Card>
          <SectionTitle eyebrow="Account" title="Authentication" subtitle={supabaseConfigured ? (user ? `Signed in as ${user.email ?? user.id}` : "Sign in is available.") : "Set Expo public Supabase keys to enable sign-in and sync."} />
          {supabaseConfigured && user ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Btn
                kind="danger"
                label="Sign out"
                onPress={async () => {
                  try {
                    await auth.signOut();
                    toast.push("Signed out.");
                    refresh();
                  } catch (e) {
                    toast.push(e?.message ?? "Sign out failed.");
                  }
                }}
              />
            </View>
          ) : null}
        </Card>

        <Card>
          <SectionTitle eyebrow="Spotify" title="Playback account" subtitle={!spotifyClientId ? "Set EXPO_PUBLIC_SPOTIFY_CLIENT_ID to enable Spotify." : spotifyMe ? `Connected as ${spotifyMe.display_name || spotifyMe.id}` : "Connect Spotify to use playback tools."} />
          {spotifyClientId ? (
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              {spotifyMe ? (
                <Btn
                  kind="danger"
                  label="Disconnect"
                  onPress={async () => {
                    try {
                      const { spotifyClearAuth } = await loadSpotify();
                      await spotifyClearAuth();
                      setSpotifyMe(null);
                      toast.push("Spotify disconnected.");
                    } catch (e) {
                      toast.push(e?.message ?? "Spotify disconnect failed.");
                    }
                  }}
                />
              ) : (
                <Btn
                  kind="primary"
                  label={spotifyBusy ? "Connecting..." : "Connect"}
                  disabled={spotifyBusy}
                  onPress={async () => {
                    try {
                      setSpotifyBusy(true);
                      const { spotifyGetMe, spotifySignIn } = await loadSpotify();
                      await spotifySignIn({ clientId: spotifyClientId, scheme: "habit-tracker" });
                      const me = await spotifyGetMe({ clientId: spotifyClientId });
                      setSpotifyMe(me);
                      toast.push("Spotify connected.");
                    } catch (e) {
                      toast.push(e?.message ?? "Spotify connect failed.");
                    } finally {
                      setSpotifyBusy(false);
                    }
                  }}
                />
              )}
            </View>
          ) : null}
        </Card>

        <Card>
          <SectionTitle eyebrow="Templates" title="Example packs" subtitle="Load a starting set if you want structure immediately." />
          <View style={{ gap: 12 }}>
            {TEMPLATE_PACKS.map((pack) => (
              <View key={pack.id} style={{ gap: 8 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{pack.name}</Text>
                <Text style={{ color: colors.muted, lineHeight: 20 }}>{pack.description}</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Btn
                    kind="primary"
                    label="Load pack"
                    onPress={async () => {
                      for (const h of pack.habits ?? []) await api.upsertHabit(h);
                      for (const proj of pack.projects ?? []) await api.upsertProject({ ...proj, habitIds: [] });
                      toast.push("Loaded.");
                      refresh();
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <SectionTitle eyebrow="Data" title="Import and export" subtitle="Use JSON backups to move between devices or test setups safely." />
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Btn
              label="Export"
              onPress={async () => {
                try {
                  if (api.exportAll) {
                    const full = await api.exportAll();
                    setExportText(JSON.stringify(full, null, 2));
                  } else {
                    setExportText(JSON.stringify(exportPayload, null, 2));
                  }
                  setExportOpen(true);
                } catch (e) {
                  toast.push(e?.message ?? "Export failed.");
                }
              }}
            />
            <Btn kind="primary" label="Import" onPress={() => setImportOpen(true)} />
          </View>
        </Card>
      </Screen>

      <JsonModal visible={exportOpen} title="Export JSON" initialValue={exportText} onClose={() => setExportOpen(false)} />
      <JsonModal
        visible={importOpen}
        title="Import JSON"
        initialValue=""
        onClose={() => setImportOpen(false)}
        confirmLabel="Import"
        onConfirm={async (text) => {
          try {
            const parsed = JSON.parse(text);
            if (api.importAll) {
              await api.importAll(parsed);
            } else {
              for (const h of parsed?.habits ?? []) await api.upsertHabit(h);
              for (const p of parsed?.projects ?? []) await api.upsertProject(p);
              for (const e of parsed?.entries ?? []) await api.setEntry(e);
            }
            toast.push("Imported.");
            setImportOpen(false);
            refresh();
          } catch (e) {
            toast.push(e?.message ?? "Import failed.");
          }
        }}
      />
    </>
  );
}
