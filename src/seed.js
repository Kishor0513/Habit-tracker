import { HabitType, ScheduleKind } from "./lib/habits.js";

export const TEMPLATE_PACKS = [
  {
    id: "pack_morning",
    name: "Morning Routine (Realistic)",
    description:
      "A simple routine you can do even on busy weekdays. Designed to build momentum, not perfection.",
    habits: [
      {
        name: "Drink water after waking",
        type: HabitType.binary,
        color: "#22c55e",
        schedule: { kind: ScheduleKind.daily },
        notes: "Keep a bottle near the bed or kitchen sink.",
      },
      {
        name: "10 minutes planning",
        type: HabitType.quantity,
        target: 10,
        unit: "min",
        color: "#7c5cff",
        schedule: { kind: ScheduleKind.weekdays, days: [1, 2, 3, 4, 5] },
        notes: "Write your top 3 priorities for the day.",
      },
      {
        name: "No phone in first 30 minutes",
        type: HabitType.binary,
        color: "#f59e0b",
        schedule: { kind: ScheduleKind.weekdays, days: [1, 2, 3, 4, 5] },
        notes: "Charge phone outside the bedroom if possible.",
      },
    ],
    projects: [
      {
        name: "Build a consistent morning routine",
        goal: "Follow the routine at least 4 weekdays per week for 4 weeks.",
        why: "Energy + focus improves everything else.",
        milestones: [
          "Week 1: keep it tiny (water + planning)",
          "Week 2: add no-phone rule",
          "Week 3: refine and remove friction",
          "Week 4: keep streak stable even on tough days",
        ],
      },
    ],
  },
  {
    id: "pack_fitness",
    name: "Run a 5K (8-week plan)",
    description: "A beginner-friendly project that links habits to a concrete outcome.",
    habits: [
      {
        name: "Run / walk training",
        type: HabitType.quantity,
        target: 30,
        unit: "min",
        color: "#06b6d4",
        schedule: { kind: ScheduleKind.weekdays, days: [2, 4, 6] },
        notes: "Start easy. Consistency beats intensity.",
      },
      {
        name: "Strength (legs + core)",
        type: HabitType.quantity,
        target: 20,
        unit: "min",
        color: "#a855f7",
        schedule: { kind: ScheduleKind.weekdays, days: [3, 5] },
        notes: "Squats, lunges, planks. Keep it simple.",
      },
      {
        name: "Sleep 7+ hours",
        type: HabitType.binary,
        color: "#22c55e",
        schedule: { kind: ScheduleKind.daily },
        notes: "Set a shutdown alarm 45 minutes before bed.",
      },
    ],
    projects: [
      {
        name: "Run a 5K without stopping",
        goal: "Complete a 5K run within 8 weeks.",
        why: "Fitness, confidence, and a clear milestone.",
        milestones: [
          "Weeks 1–2: run/walk intervals",
          "Weeks 3–4: longer easy runs",
          "Weeks 5–6: steady 20–25 minutes continuous",
          "Weeks 7–8: simulate 5K pace + taper",
        ],
      },
    ],
  },
  {
    id: "pack_learning",
    name: "Learn React (Mini-project driven)",
    description: "Build real output: a landing page, then a small app, then polish it.",
    habits: [
      {
        name: "Deep work (learning)",
        type: HabitType.quantity,
        target: 45,
        unit: "min",
        color: "#7c5cff",
        schedule: { kind: ScheduleKind.weekdays, days: [1, 2, 3, 4, 5] },
        notes: "No multitasking. One topic per session.",
      },
      {
        name: "Ship something small",
        type: HabitType.binary,
        color: "#22c55e",
        schedule: { kind: ScheduleKind.weekdays, days: [5] },
        notes: "One tiny feature or refactor every Friday.",
      },
      {
        name: "Write notes (what I learned)",
        type: HabitType.quantity,
        target: 5,
        unit: "min",
        color: "#f59e0b",
        schedule: { kind: ScheduleKind.daily },
        notes: "Capture 3 bullets: concept, pitfall, next step.",
      },
    ],
    projects: [
      {
        name: "Portfolio website + small app",
        goal: "Deploy a portfolio site and one polished demo app.",
        why: "Projects make learning stick; deployables are measurable.",
        milestones: [
          "Week 1: component basics + props/state",
          "Week 2: routing + forms",
          "Week 3: data fetching + loading states",
          "Week 4: polish + deploy",
        ],
      },
    ],
  },
];

