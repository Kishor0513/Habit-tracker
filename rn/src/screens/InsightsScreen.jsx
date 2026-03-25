import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useApp } from "../state/AppState";
import { isoToday, lastNDays } from "../lib/date";
import { entryMeetsTarget, isDueOn } from "../lib/habits";
import { completionRateLastNDays } from "../lib/stats";
import { Card, Screen } from "../ui/components";

function StatLine({ label, value }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
      <Text style={{ opacity: 0.7 }}>{label}</Text>
      <Text style={{ fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const { api, isReady, dataVersion } = useApp();
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

  const today = isoToday();
  const last7 = useMemo(() => completionRateLastNDays(habits, entriesByKey, 7, today), [habits, entriesByKey, today]);
  const last30 = useMemo(() => completionRateLastNDays(habits, entriesByKey, 30, today), [habits, entriesByKey, today]);

  const bestDay = useMemo(() => {
    const days = lastNDays(14, today);
    let best = { day: null, rate: -1 };
    for (const d of days) {
      let due = 0;
      let done = 0;
      for (const h of habits) {
        if (!isDueOn(h, d)) continue;
        due += 1;
        const entry = entriesByKey.get(`${h.id}__${d}`) ?? null;
        if (entryMeetsTarget(h, entry)) done += 1;
      }
      const rate = due ? done / due : 0;
      if (rate > best.rate) best = { day: d, rate };
    }
    return best.day ? `${best.day} (${Math.round(best.rate * 100)}%)` : "—";
  }, [habits, entriesByKey, today]);

  if (!isReady) return null;

  return (
    <Screen title="Insights" subtitle="Trends over time.">
      <ScrollView contentContainerStyle={{ gap: 12 }}>
        <Card>
          <Text style={{ fontWeight: "700" }}>Overview</Text>
          <View style={{ marginTop: 10 }}>
            <StatLine label="Active habits" value={habits.length} />
            <StatLine label="7-day completion" value={`${Math.round(last7.rate * 100)}%`} />
            <StatLine label="30-day completion" value={`${Math.round(last30.rate * 100)}%`} />
            <StatLine label="Best day (last 14)" value={bestDay} />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}

