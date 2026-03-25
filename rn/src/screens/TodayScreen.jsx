import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { useApp } from "../state/AppState";
import { useToast } from "../state/ToastState";
import { isoToday } from "../lib/date";
import { entryMeetsTarget, HabitType, isDueOn, targetLabel } from "../lib/habits";
import { computeTodaySummary, currentStreak } from "../lib/stats";
import { Btn, Card, Screen } from "../ui/components";

function Kpi({ label, value }) {
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: "rgba(10,10,20,0.04)" }}>
      <Text style={{ opacity: 0.7, fontSize: 12 }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: "700", marginTop: 4 }}>{value}</Text>
    </View>
  );
}

function HabitRow({ habit, entry, streak, onToggle, onSetQuantity }) {
  const done = entryMeetsTarget(habit, entry);
  const [qty, setQty] = useState(entry?.value != null ? String(entry.value) : "");

  useEffect(() => {
    setQty(entry?.value != null ? String(entry.value) : "");
  }, [entry?.value]);

  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: habit.color ?? "#7c5cff" }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700" }}>{habit.name}</Text>
          <Text style={{ opacity: 0.7, marginTop: 2 }}>
            {targetLabel(habit)} • Streak {streak}
          </Text>
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
            style={{ flex: 1, backgroundColor: "rgba(10,10,20,0.04)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}
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
    <Screen title="Today" subtitle={today}>
      <ScrollView contentContainerStyle={{ gap: 12 }}>
        <Card>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Kpi label="Due habits" value={summary.dueCount} />
            <Kpi label="Completed" value={summary.doneCount} />
          </View>
        </Card>

        {due.length === 0 ? (
          <Card>
            <Text style={{ fontWeight: "700" }}>Nothing due today</Text>
            <Text style={{ opacity: 0.7, marginTop: 6 }}>Add a habit in the Habits tab.</Text>
          </Card>
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
        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

