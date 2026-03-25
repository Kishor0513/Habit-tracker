import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Text, TextInput, View } from "react-native";
import { useApp } from "../state/AppState";
import { useToast } from "../state/ToastState";
import { HabitType } from "../lib/habits";
import { completionRateLastNDays, currentStreak } from "../lib/stats";
import { Btn, Card, Field, Screen } from "../ui/components";

const COLORS = ["#7c5cff", "#22c55e", "#06b6d4", "#f59e0b", "#ef4444", "#a855f7", "#f43f5e"];

function HabitEditor({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? HabitType.binary);
  const [target, setTarget] = useState(String(initial?.target ?? 10));
  const [unit, setUnit] = useState(initial?.unit ?? "min");
  const [schedule, setSchedule] = useState(initial?.schedule?.kind ?? "daily");
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <ScrollView contentContainerStyle={{ gap: 12 }}>
      <Card>
        <Field label="Name" value={name} onChangeText={setName} placeholder="e.g., Deep work" />

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <Btn label={type === HabitType.binary ? "Binary ✓" : "Binary"} onPress={() => setType(HabitType.binary)} kind={type === HabitType.binary ? "primary" : "default"} />
          <Btn label={type === HabitType.quantity ? "Quantity ✓" : "Quantity"} onPress={() => setType(HabitType.quantity)} kind={type === HabitType.quantity ? "primary" : "default"} />
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <Btn label={schedule === "daily" ? "Daily ✓" : "Daily"} onPress={() => setSchedule("daily")} kind={schedule === "daily" ? "primary" : "default"} />
          <Btn label={schedule === "weekdays" ? "Weekdays ✓" : "Weekdays"} onPress={() => setSchedule("weekdays")} kind={schedule === "weekdays" ? "primary" : "default"} />
        </View>
      </Card>

      <Card>
        <Text style={{ fontWeight: "700" }}>Target (quantity)</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <TextInput
            value={target}
            onChangeText={setTarget}
            keyboardType="numeric"
            editable={type === HabitType.quantity}
            style={{
              flex: 1,
              backgroundColor: "rgba(10,10,20,0.04)",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              opacity: type === HabitType.quantity ? 1 : 0.5
            }}
            placeholder="10"
          />
          <TextInput
            value={unit}
            onChangeText={setUnit}
            editable={type === HabitType.quantity}
            style={{
              flex: 1,
              backgroundColor: "rgba(10,10,20,0.04)",
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              opacity: type === HabitType.quantity ? 1 : 0.5
            }}
            placeholder="min / pages"
          />
        </View>
        <Text style={{ opacity: 0.7, marginTop: 8 }}>Binary habits ignore target.</Text>
      </Card>

      <Card>
        <Text style={{ fontWeight: "700" }}>Color</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          {COLORS.map((c) => (
            <Btn key={c} label={c === color ? "✓" : " "} onPress={() => setColor(c)} kind={c === color ? "primary" : "default"} />
          ))}
        </View>
        <Text style={{ opacity: 0.7, marginTop: 8 }}>Selected: {color}</Text>
      </Card>

      <Card>
        <Text style={{ fontWeight: "700" }}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Cues, friction reducers, rules…"
          multiline
          style={{
            marginTop: 10,
            backgroundColor: "rgba(10,10,20,0.04)",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            minHeight: 90,
            textAlignVertical: "top"
          }}
        />
      </Card>

      <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
        <Btn label="Cancel" onPress={onCancel} />
        <Btn
          kind="primary"
          label="Save"
          onPress={() => {
            const cleanName = name.trim();
            if (!cleanName) return onSave({ ok: false, error: "Name is required." });
            const qtyTarget = Number.parseInt(target, 10);
            if (type === HabitType.quantity && (!Number.isFinite(qtyTarget) || qtyTarget <= 0)) {
              return onSave({ ok: false, error: "Quantity target must be a positive number." });
            }
            onSave({
              ok: true,
              value: {
                ...initial,
                name: cleanName,
                type,
                target: type === HabitType.quantity ? qtyTarget : 1,
                unit: type === HabitType.quantity ? unit.trim() : "",
                schedule: schedule === "weekdays" ? { kind: "weekdays", days: [1, 2, 3, 4, 5] } : { kind: "daily" },
                color,
                notes: notes.trim()
              }
            });
          }}
        />
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

export default function HabitsScreen() {
  const { api, isReady, dataVersion, refresh } = useApp();
  const toast = useToast();
  const [habits, setHabits] = useState([]);
  const [entriesByKey, setEntriesByKey] = useState(new Map());
  const [editing, setEditing] = useState(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    if (!api) return;
    let alive = true;
    Promise.all([api.listHabits(), api.listEntries()])
      .then(([h, e]) => {
        if (!alive) return;
        setHabits((h ?? []).filter((x) => !x.archivedAt));
        setEntriesByKey(new Map((e ?? []).map((x) => [x.id, x])));
      })
      .catch((err) => console.error(err));
    return () => {
      alive = false;
    };
  }, [api, dataVersion]);

  const cards = useMemo(() => {
    return habits.map((habit) => {
      const stats = completionRateLastNDays([habit], entriesByKey, 14);
      const streak = currentStreak(habit, entriesByKey);
      return { habit, stats, streak };
    });
  }, [habits, entriesByKey]);

  if (!isReady) return null;

  return (
    <Screen
      title="Habits"
      subtitle="Build systems, not just streaks."
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
        {habits.length === 0 ? (
          <Card>
            <Text style={{ fontWeight: "700" }}>No habits yet</Text>
            <Text style={{ opacity: 0.7, marginTop: 6 }}>Create your first habit, or load templates in Settings.</Text>
          </Card>
        ) : (
          cards.map(({ habit, stats, streak }) => (
            <Card key={habit.id} style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: habit.color ?? "#7c5cff" }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700" }}>{habit.name}</Text>
                  <Text style={{ opacity: 0.7, marginTop: 2 }}>
                    14-day completion: {Math.round(stats.rate * 100)}% • Current streak: {streak}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                <Btn
                  label="Edit"
                  onPress={() => {
                    setEditing(habit);
                    setShowEditor(true);
                  }}
                />
                <Btn
                  kind="danger"
                  label="Archive"
                  onPress={async () => {
                    await api.archiveHabit(habit.id);
                    toast.push("Archived.");
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
        <Screen title={editing ? "Edit habit" : "New habit"} right={<Btn label="Close" onPress={() => setShowEditor(false)} />}>
          <HabitEditor
            initial={editing}
            onCancel={() => setShowEditor(false)}
            onSave={async (result) => {
              if (!result.ok) return toast.push(result.error);
              await api.upsertHabit(result.value);
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

