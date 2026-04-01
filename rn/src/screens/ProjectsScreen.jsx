import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { useApp } from "../state/AppState";
import { useToast } from "../state/ToastState";
import { Btn, Card, EmptyCard, Field, Pill, Screen, SectionTitle, StatCard, colors, radius } from "../ui/components";
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
    <ScrollView contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
      <Card>
        <SectionTitle eyebrow="Project" title="Outcome definition" subtitle="Name the result clearly enough that you can tell when it is done." />
        <Field label="Name" value={name} onChangeText={setName} placeholder="Run a 5K" autoCapitalize="sentences" />
        <Field label="Goal" value={goal} onChangeText={setGoal} placeholder="What does success look like?" autoCapitalize="sentences" />
        <Field label="Why" value={why} onChangeText={setWhy} placeholder="Why does it matter?" autoCapitalize="sentences" multiline />
      </Card>

      <Card>
        <SectionTitle eyebrow="Timeline" title="Dates" subtitle="Rough dates are enough. This is for direction, not bureaucracy." />
        <Field label="Start date" value={startDate} onChangeText={setStartDate} placeholder="2026-04-01" />
        <Field label="Target date" value={targetDate} onChangeText={setTargetDate} placeholder="Optional" />
      </Card>

      <Card>
        <SectionTitle eyebrow="Linking" title="Driver habits" subtitle="Attach the few habits that directly move the project forward." />
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {(habits ?? []).map((h) => (
            <Pill key={h.id} label={h.name} active={habitIds.includes(h.id)} onPress={() => toggleHabit(h.id)} />
          ))}
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
        <Btn label="Cancel" onPress={onCancel} />
        <Btn
          kind="primary"
          label="Save project"
          onPress={() => {
            const cleanName = name.trim();
            if (!cleanName) return onSave({ ok: false, error: "Name is required." });
            onSave({
              ok: true,
              value: {
                ...initial,
                name: cleanName,
                goal: goal.trim(),
                why: why.trim(),
                startDate: startDate.trim(),
                targetDate: targetDate.trim(),
                habitIds,
              },
            });
          }}
        />
      </View>
      <View style={{ height: 20 }} />
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
      title="Connect effort to outcomes."
      subtitle="Projects stay honest when the supporting habits are visible."
      eyebrow="Longer horizon"
      scroll
      right={
        <Btn
          kind="primary"
          label="New"
          onPress={() => {
            setEditing(null);
            setShowEditor(true);
          }}
        />
      }
      heroStats={[
        { label: "Projects", value: projects.length },
        { label: "Linked habits", value: habits.length },
        { label: "Mode", value: "Practical" },
      ]}
    >
      <Card tone="accent">
        <SectionTitle eyebrow="Portfolio" title="Active outcomes" subtitle="Each project should have a clear goal and a small set of driver habits." />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard label="Open projects" value={projects.length} accent />
          <StatCard label="Habit pool" value={habits.length} />
        </View>
      </Card>

      {projects.length === 0 ? (
        <EmptyCard title="No projects yet" body="Create a project and link the habits that actually move it forward." />
      ) : (
        cards.map(({ project, linked }) => (
          <Card key={project.id}>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>{project.name}</Text>
                {project.targetDate ? (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: radius.pill,
                      backgroundColor: "rgba(33,23,15,0.06)",
                    }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
                      Target {project.targetDate}
                    </Text>
                  </View>
                ) : null}
              </View>
              {project.goal ? <Text style={{ color: colors.text, lineHeight: 21 }}>{project.goal}</Text> : null}
              <Text style={{ color: colors.muted, lineHeight: 20 }}>
                {linked.length ? `Habits: ${linked.map((h) => h.name).join(", ")}` : "No linked habits yet."}
              </Text>
            </View>
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

      <Modal visible={showEditor} animationType="slide" onRequestClose={() => setShowEditor(false)}>
        <Screen
          title={editing ? "Refine the project." : "Create a project."}
          subtitle="Use projects for real outcomes, not as another list to maintain."
          eyebrow="Project editor"
          scroll
          right={<Btn label="Close" onPress={() => setShowEditor(false)} />}
        >
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
