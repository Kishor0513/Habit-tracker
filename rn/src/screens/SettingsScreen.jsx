import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { useApp } from "../state/AppState";
import { useToast } from "../state/ToastState";
import { TEMPLATE_PACKS } from "../seed";
import { Btn, Card, Screen } from "../ui/components";

async function loadSpotify() {
  return import("../lib/spotifyMobile");
}

function JsonModal({ visible, title, initialValue, onClose, onConfirm, confirmLabel }) {
  const [text, setText] = useState(initialValue ?? "");
  useEffect(() => setText(initialValue ?? ""), [initialValue, visible]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Screen title={title} right={<Btn label="Close" onPress={onClose} />}>
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          <Card>
            <TextInput
              value={text}
              onChangeText={setText}
              multiline
              autoCapitalize="none"
              style={{
                minHeight: 260,
                backgroundColor: "rgba(10,10,20,0.04)",
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                textAlignVertical: "top"
              }}
            />
            {onConfirm ? (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12, justifyContent: "flex-end" }}>
                <Btn label="Cancel" onPress={onClose} />
                <Btn kind="primary" label={confirmLabel ?? "Confirm"} onPress={() => onConfirm(text)} />
              </View>
            ) : null}
          </Card>
        </ScrollView>
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
      .catch(() => {
        // If Spotify deps are not available in a given build, keep the app usable.
      });
    return () => {
      alive = false;
    };
  }, [spotifyClientId]);

  const exportPayload = useMemo(() => ({ habits, projects, entries, settings: {} }), [habits, projects, entries]);

  if (!isReady) return null;

  return (
    <Screen title="Settings" subtitle={supabaseConfigured ? "Supabase sync enabled." : "Local-only mode."}>
      <ScrollView contentContainerStyle={{ gap: 12 }}>
        <Card>
          <Text style={{ fontWeight: "700" }}>Account</Text>
          {supabaseConfigured ? (
            <Text style={{ opacity: 0.7, marginTop: 6 }}>{user ? `Signed in as ${user.email ?? user.id}` : "Not signed in"}</Text>
          ) : (
            <Text style={{ opacity: 0.7, marginTop: 6 }}>Set `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` to enable cloud sync.</Text>
          )}

          {supabaseConfigured && user ? (
            <View style={{ marginTop: 10, flexDirection: "row", gap: 10 }}>
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
          <Text style={{ fontWeight: "700" }}>Spotify</Text>
          {!spotifyClientId ? (
            <Text style={{ opacity: 0.7, marginTop: 6 }}>Set `EXPO_PUBLIC_SPOTIFY_CLIENT_ID` to enable Spotify.</Text>
          ) : spotifyMe ? (
            <Text style={{ opacity: 0.7, marginTop: 6 }}>{`Connected as ${spotifyMe.display_name || spotifyMe.id}`}</Text>
          ) : (
            <Text style={{ opacity: 0.7, marginTop: 6 }}>Not connected.</Text>
          )}

          {spotifyClientId ? (
            <View style={{ marginTop: 10, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
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
                  label={spotifyBusy ? "Connecting…" : "Connect"}
                  disabled={spotifyBusy}
                  onPress={async () => {
                    try {
                      setSpotifyBusy(true);
                      const { spotifyGetMe, spotifySignIn } = await loadSpotify();
                      // Standalone builds use the scheme set in app.json (habit-tracker://)
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
          <Text style={{ fontWeight: "700" }}>Templates</Text>
          <Text style={{ opacity: 0.7, marginTop: 6 }}>Load example habits and projects.</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            {TEMPLATE_PACKS.map((p) => (
              <View key={p.id} style={{ gap: 6 }}>
                <Text style={{ fontWeight: "700" }}>{p.name}</Text>
                <Text style={{ opacity: 0.7 }}>{p.description}</Text>
                <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                  <Btn
                    kind="primary"
                    label="Load pack"
                    onPress={async () => {
                      for (const h of p.habits ?? []) await api.upsertHabit(h);
                      for (const proj of p.projects ?? []) await api.upsertProject({ ...proj, habitIds: [] });
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
          <Text style={{ fontWeight: "700" }}>Import / Export</Text>
          <Text style={{ opacity: 0.7, marginTop: 6 }}>Copy/paste JSON to back up or migrate data.</Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
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
            <Btn label="Import" kind="primary" onPress={() => setImportOpen(true)} />
          </View>
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>

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
    </Screen>
  );
}
