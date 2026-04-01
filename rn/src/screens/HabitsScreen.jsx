import React, { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Text, View } from "react-native";
import { useApp } from "../state/AppState";
import { useToast } from "../state/ToastState";
import { HabitType } from "../lib/habits";
import { completionRateLastNDays, currentStreak } from "../lib/stats";
import {
  Btn,
  Card,
  Dot,
  EmptyCard,
  Field,
  Pill,
  Screen,
  SectionTitle,
  StatCard,
  colors,
  radius,
} from "../ui/components";

const COLORS = ["#c65d2e", "#1f6b5c", "#db7c28", "#5278c1", "#b53f32", "#a35d8f", "#8c7a3d"];

function HabitEditor({ initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? HabitType.binary);
  const [target, setTarget] = useState(String(initial?.target ?? 10));
  const [unit, setUnit] = useState(initial?.unit ?? "min");
  const [schedule, setSchedule] = useState(initial?.schedule?.kind ?? "daily");
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <ScrollView contentContainerStyle={{ gap: 14 }} showsVerticalScrollIndicator={false}>
      <Card>
        <SectionTitle eyebrow="Basics" title="Core setup" subtitle="Keep names short and the rule easy to understand." />
        <Field label="Name" value={name} onChangeText={setName} placeholder="Deep work" autoCapitalize="sentences" />
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Pill label="Binary" active={type === HabitType.binary} onPress={() => setType(HabitType.binary)} />
          <Pill label="Quantity" active={type === HabitType.quantity} onPress={() => setType(HabitType.quantity)} />
        </View>
      </Card>

      <Card>
        <SectionTitle eyebrow="Cadence" title="Schedule" subtitle="Start conservative. Reliability matters more than ambition." />
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Pill label="Every day" active={schedule === "daily"} onPress={() => setSchedule("daily")} />
          <Pill label="Weekdays" active={schedule === "weekdays"} onPress={() => setSchedule("weekdays")} />
        </View>
      </Card>

      <Card>
        <SectionTitle eyebrow="Target" title="Quantity rule" subtitle="Binary habits ignore this section." />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field
            label="Target"
            value={target}
            onChangeText={setTarget}
            keyboardType="numeric"
            placeholder="10"
            editable={type === HabitType.quantity}
            style={{ flex: 1 }}
          />
          <Field
            label="Unit"
            value={unit}
            onChangeText={setUnit}
            placeholder="min"
            editable={type === HabitType.quantity}
            autoCapitalize="none"
            style={{ flex: 1 }}
          />
        </View>
      </Card>

      <Card>
        <SectionTitle eyebrow="Style" title="Color" subtitle="Use color to scan quickly, not to decorate randomly." />
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          {COLORS.map((swatch) => (
            <Pill
              key={swatch}
              label={swatch === color ? "Selected" : "Pick"}
              active={swatch === color}
              onPress={() => setColor(swatch)}
              style={{ backgroundColor: swatch === color ? `${swatch}22` : colors.panelMuted }}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Dot color={color} size={14} />
          <Text style={{ color: colors.muted }}>Current accent: {color}</Text>
        </View>
      </Card>

      <Card>
        <SectionTitle eyebrow="Notes" title="Context" subtitle="Add cues, boundaries, or a rule for what counts as done." />
        <Field
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Cues, friction reducers, rules..."
          multiline
          autoCapitalize="sentences"
        />
      </Card>

      <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
        <Btn label="Cancel" onPress={onCancel} />
        <Btn
          kind="primary"
          label="Save habit"
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
                notes: notes.trim(),
              },
            });
          }}
        />
      </View>
      <View style={{ height: 20 }} />
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
      title="Design repeatable routines."
      subtitle="Keep habits specific, visible, and easy to maintain."
      eyebrow="Habit architecture"
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
        { label: "Active", value: habits.length },
        { label: "Focus", value: "Consistency" },
        { label: "Window", value: "14 days" },
      ]}
    >
      <Card tone="accent">
        <SectionTitle eyebrow="Overview" title="Your operating system" subtitle="Good habits should be obvious to start and boring to repeat." />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard label="Active habits" value={habits.length} accent />
          <StatCard label="Tracked window" value="14d" />
        </View>
      </Card>

      {habits.length === 0 ? (
        <EmptyCard title="No habits yet" body="Create the first habit here or load templates from Settings." />
      ) : (
        cards.map(({ habit, stats, streak }) => (
          <Card key={habit.id}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: `${habit.color ?? colors.brand}22`,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Dot color={habit.color ?? colors.brand} />
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>{habit.name}</Text>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: radius.pill,
                      backgroundColor: "rgba(33,23,15,0.06)",
                    }}
                  >
                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
                      {habit.type === HabitType.binary ? "Binary" : "Quantity"}
                    </Text>
                  </View>
                </View>
                <Text style={{ color: colors.muted, lineHeight: 20 }}>
                  14-day completion: {Math.round(stats.rate * 100)}%   Current streak: {streak}
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

      <Modal visible={showEditor} animationType="slide" onRequestClose={() => setShowEditor(false)}>
        <Screen
          title={editing ? "Refine the habit." : "Create a new habit."}
          subtitle="Tighten the rule before you scale the target."
          eyebrow="Habit editor"
          scroll
          right={<Btn label="Close" onPress={() => setShowEditor(false)} />}
        >
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
