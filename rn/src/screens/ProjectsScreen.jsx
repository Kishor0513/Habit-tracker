import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { useApp } from "../state/AppState";
import { useToast } from "../state/ToastState";
import { Btn, Card, Field, Screen } from "../ui/components";
import { isoToday } from "../lib/date";

function ProjectEditor({ initial, habits, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [goal, setGoal] = useState(initial?.goal ?? "");
  const [why, setWhy] = useState(initial?.why ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? isoToday());
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [habitIds, setHabitIds] = useState(initial?.habitIds ?? []);

  const toggleHabit = (id) => {
    setHabitIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <ScrollView contentContainerStyle={{ gap: 12 }}>
      <Card>
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g., Run a 5K" />
        <Field label="Goal" value={goal} onChangeText={setGoal} placeholder="Outcome you want" />
        <Field label="Why" value={why} onChangeText={setWhy} placeholder="Reason it matters" />
      </Card>

      <Card>
        <Text style={{ fontWeight: "700" }}>Dates</Text>
        <Field label="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-03-25" />
        <Field label="Target date (YYYY-MM-DD)" value={targetDate} onChangeText={setTargetDate} placeholder="Optional" />
      </Card>

      <Card>
        <Text style={{ fontWeight: "700" }}>Linked habits</Text>
        <Text style={{ opacity: 0.7, marginTop: 6 }}>Select habits that drive this project.</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          {(habits ?? []).map((h) => (
            <Btn
              key={h.id}
              label={habitIds.includes(h.id) ? `✓ ${h.name}` : h.name}
              kind={habitIds.includes(h.id) ? "primary" : "default"}
              onPress={() => toggleHabit(h.id)}
            />
          ))}
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
        <Btn label="Cancel" onPress={onCancel} />
        <Btn
          kind="primary"
          label="Save"
          onPress={() => {
            const cleanName = name.trim();
            if (!cleanName) return onSave({ ok: false, error: "Name is required." });
            onSave({
              ok: true,
              value: { ...initial, name: cleanName, goal: goal.trim(), why: why.trim(), startDate: startDate.trim(), targetDate: targetDate.trim(), habitIds }
            });
          }}
        />
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

export default function ProjectsScreen() {
  const { api, isReady, dataVersion, refresh } = useApp();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [habits, setHabits] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    if (!api) return;
    let alive = true;
    Promise.all([api.listProjects(), api.listHabits()])
      .then(([p, h]) => {
        if (!alive) return;
        setProjects((p ?? []).filter((x) => !x.archivedAt));
        setHabits((h ?? []).filter((x) => !x.archivedAt));
      })
      .catch((err) => console.error(err));
    return () => {
      alive = false;
    };
  }, [api, dataVersion]);

  const cards = useMemo(() => {
    const byId = new Map(habits.map((h) => [h.id, h]));
    return projects.map((p) => ({ project: p, linked: (p.habitIds ?? []).map((id) => byId.get(id)).filter(Boolean) }));
  }, [projects, habits]);

  if (!isReady) return null;

  return (
    <Screen
      title="Projects"
      subtitle="Goals with structure."
      right={
        <Btn
          kind="primary"
          label="+ New"
          onPress={() => {
            setEditing(null);
            setShowEditor(true);
          }}
        />
      }
    >
      <ScrollView contentContainerStyle={{ gap: 12 }}>
        {projects.length === 0 ? (
          <Card>
            <Text style={{ fontWeight: "700" }}>No projects yet</Text>
            <Text style={{ opacity: 0.7, marginTop: 6 }}>Create a project and link 1–3 habits to it.</Text>
          </Card>
        ) : (
          cards.map(({ project, linked }) => (
            <Card key={project.id} style={{ gap: 10 }}>
              <Text style={{ fontWeight: "700" }}>{project.name}</Text>
              {project.goal ? <Text style={{ opacity: 0.8 }}>{project.goal}</Text> : null}
              {linked.length ? (
                <Text style={{ opacity: 0.7, marginTop: 4 }}>Habits: {linked.map((h) => h.name).join(", ")}</Text>
              ) : (
                <Text style={{ opacity: 0.7, marginTop: 4 }}>No linked habits yet.</Text>
              )}
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Btn
                  label="Edit"
                  onPress={() => {
                    setEditing(project);
                    setShowEditor(true);
                  }}
                />
                <Btn
                  kind="danger"
                  label="Delete"
                  onPress={async () => {
                    await api.deleteProject(project.id);
                    toast.push("Deleted.");
                    refresh();
                  }}
                />
              </View>
            </Card>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={showEditor} animationType="slide" onRequestClose={() => setShowEditor(false)}>
        <Screen title={editing ? "Edit project" : "New project"} right={<Btn label="Close" onPress={() => setShowEditor(false)} />}>
          <ProjectEditor
            initial={editing}
            habits={habits}
            onCancel={() => setShowEditor(false)}
            onSave={async (result) => {
              if (!result.ok) return toast.push(result.error);
              await api.upsertProject(result.value);
              toast.push("Saved.");
              setShowEditor(false);
              refresh();
            }}
          />
        </Screen>
      </Modal>
    </Screen>
  );
}

