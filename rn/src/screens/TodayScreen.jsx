import React, { useEffect, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { useApp } from "../state/AppState";
import { useToast } from "../state/ToastState";
import { isoToday } from "../lib/date";
import { entryMeetsTarget, HabitType, isDueOn, targetLabel } from "../lib/habits";
import { computeTodaySummary, currentStreak } from "../lib/stats";
import { Btn, Card, Dot, EmptyCard, Screen, SectionTitle, StatCard, colors, radius } from "../ui/components";

function HabitRow({ habit, entry, streak, onToggle, onSetQuantity }) {
  const done = entryMeetsTarget(habit, entry);
  const [qty, setQty] = useState(entry?.value != null ? String(entry.value) : "");

  useEffect(() => {
    setQty(entry?.value != null ? String(entry.value) : "");
  }, [entry?.value]);

  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${habit.color ?? colors.brand}22`,
          }}
        >
          <Dot color={habit.color ?? colors.brand} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 16 }}>{habit.name}</Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: radius.pill,
                backgroundColor: "rgba(33,23,15,0.06)",
              }}
            >
              <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
                Streak {streak}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.muted, lineHeight: 20 }}>{targetLabel(habit)}</Text>
        </View>
      </View>

      {habit.type === HabitType.binary ? (
        <Btn kind={done ? "primary" : "default"} label={done ? "Done" : "Mark done"} onPress={onToggle} />
      ) : (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <TextInput
            value={qty}
            onChangeText={setQty}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.muted}
            style={{
              flex: 1,
              minHeight: 48,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: "rgba(255,255,255,0.74)",
              color: colors.text,
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          />
          <Btn
            kind={done ? "primary" : "default"}
            label={done ? "Saved" : "Save"}
            onPress={() => {
              const raw = qty === "" ? 0 : Number(qty);
              onSetQuantity(raw);
            }}
          />
        </View>
      )}
    </Card>
  );
}

export default function TodayScreen() {
  const { api, isReady, dataVersion, refresh } = useApp();
  const toast = useToast();
  const today = isoToday();
  const [habits, setHabits] = useState([]);
  const [entriesByKey, setEntriesByKey] = useState(new Map());

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

  const due = useMemo(() => habits.filter((h) => isDueOn(h, today)), [habits, today]);
  const entriesByHabitToday = useMemo(() => {
    const map = new Map();
    for (const h of habits) map.set(h.id, entriesByKey.get(`${h.id}__${today}`) ?? null);
    return map;
  }, [habits, entriesByKey, today]);
  const summary = useMemo(() => computeTodaySummary(habits, entriesByHabitToday, today), [habits, entriesByHabitToday, today]);

  if (!isReady) return null;

  return (
    <Screen
      title="Run the day cleanly."
      subtitle="See what is due, finish the essentials, and keep progress visible."
      eyebrow="Calm execution"
      scroll
      heroStats={[
        { label: "Date", value: today },
        { label: "Due", value: summary.dueCount },
        { label: "Done", value: summary.doneCount },
      ]}
    >
      <Card tone="accent">
        <SectionTitle
          eyebrow="Today"
          title="Daily scoreboard"
          subtitle="Use this view to keep the list short and the signals honest."
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard label="Due habits" value={summary.dueCount} accent />
          <StatCard label="Completed" value={summary.doneCount} />
        </View>
      </Card>

      <SectionTitle
        eyebrow="Active list"
        title={due.length ? "What needs attention now" : "Nothing due right now"}
        subtitle={due.length ? "Start with the easiest win and keep the pace steady." : "Add a habit in the Habits tab or review your schedule."}
      />

      {due.length === 0 ? (
        <EmptyCard title="Nothing due today" body="Your list is clear. Add habits or adjust cadence if this screen is empty too often." />
      ) : (
        due.map((h) => {
          const entry = entriesByKey.get(`${h.id}__${today}`) ?? null;
          const streak = currentStreak(h, entriesByKey, today);
          return (
            <HabitRow
              key={h.id}
              habit={h}
              entry={entry}
              streak={streak}
              onToggle={async () => {
                const done = entryMeetsTarget(h, entry);
                if (done) await api.deleteEntry(h.id, today);
                else await api.setEntry({ habitId: h.id, date: today, value: 1, note: "" });
                refresh();
              }}
              onSetQuantity={async (value) => {
                if (!Number.isFinite(value) || value < 0) return toast.push("Please enter a valid number.");
                await api.setEntry({ habitId: h.id, date: today, value, note: "" });
                toast.push("Saved.");
                refresh();
              }}
            />
          );
        })
      )}

      <View style={{ height: 16 }} />
    </Screen>
  );
}
