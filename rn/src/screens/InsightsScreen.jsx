import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useApp } from "../state/AppState";
import { isoToday, lastNDays } from "../lib/date";
import { entryMeetsTarget, isDueOn } from "../lib/habits";
import { completionRateLastNDays, currentStreak } from "../lib/stats";
import { Card, EmptyCard, Dot, Screen, SectionTitle, StatCard, colors } from "../ui/components";

function fmtPct(rate) {
  return `${Math.round(rate * 100)}%`;
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
    return best.day ? `${best.day} (${Math.round(best.rate * 100)}%)` : "-";
  }, [habits, entriesByKey, today]);

  if (!isReady) return null;

  return (
    <Screen
      title="Read the trend before reacting."
      subtitle="Insights are useful when they help you simplify or scale at the right time."
      eyebrow="Performance review"
      scroll
      heroStats={[
        { label: "Active", value: habits.length },
        { label: "7d", value: fmtPct(last7.rate) },
        { label: "30d", value: fmtPct(last30.rate) },
      ]}
    >
      {habits.length === 0 ? (
        <EmptyCard title="No data yet" body="Add habits or load example packs before reviewing trends." />
      ) : (
        <>
          <Card tone="accent">
            <SectionTitle eyebrow="Overview" title="Recent consistency" subtitle="Look for stable improvement, not perfect days." />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <StatCard label="7-day rate" value={fmtPct(last7.rate)} accent />
              <StatCard label="30-day rate" value={fmtPct(last30.rate)} />
            </View>
            <StatCard label="Best day in last 14" value={bestDay} />
          </Card>

          <SectionTitle eyebrow="Habits" title="Individual streaks" subtitle="A high streak with a low completion rate usually means the habit is too occasional." />
          {habits.map((habit) => {
            const streak = currentStreak(habit, entriesByKey, today);
            const stats = completionRateLastNDays([habit], entriesByKey, 30, today);
            return (
              <Card key={habit.id}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 14,
                      backgroundColor: `${habit.color ?? colors.brand}22`,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Dot color={habit.color ?? colors.brand} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{habit.name}</Text>
                    <Text style={{ color: colors.muted }}>30-day completion: {fmtPct(stats.rate)}</Text>
                  </View>
                  <Text style={{ color: colors.brandStrong, fontWeight: "800" }}>{`Streak ${streak}`}</Text>
                </View>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}
