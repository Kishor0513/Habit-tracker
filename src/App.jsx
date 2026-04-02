import React, { useMemo } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import TodayPage from "./pages/TodayPage.jsx";
import HabitsPage from "./pages/HabitsPage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import InsightsPage from "./pages/InsightsPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import { AppProvider } from "./state/AppState.jsx";
import { ToastProvider } from "./state/ToastState.jsx";
import LogoMark from "./components/LogoMark.jsx";
import ToastViewport from "./components/ToastViewport.jsx";
import AuthGate from "./components/AuthGate.jsx";
import { useApp } from "./state/AppState.jsx";

// ─── Nav items with icons ────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: "/",         label: "Today",    eyebrow: "Daily rhythm",      icon: "⚡" },
  { to: "/habits",   label: "Habits",   eyebrow: "System design",     icon: "🔁" },
  { to: "/projects", label: "Projects", eyebrow: "Outcome tracking",  icon: "🎯" },
  { to: "/insights", label: "Insights", eyebrow: "Momentum review",   icon: "📈" },
  { to: "/settings", label: "Settings", eyebrow: "Workspace control", icon: "⚙️" },
];

// ─── Greeting / hero copy per route ──────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function contentFor(pathname) {
  if (pathname === "/") return {
    title: "Run your day with clarity.",
    subtitle: "Track what matters, review momentum, and keep habits tied to real outcomes.",
  };
  if (pathname === "/habits") return {
    title: "Shape routines that stick.",
    subtitle: "Define cadence, targets, and the small rules that keep consistency alive.",
  };
  if (pathname === "/projects") return {
    title: "Connect inputs to outcomes.",
    subtitle: "Projects become clearer when linked habits are visible and measurable.",
  };
  if (pathname === "/insights") return {
    title: "Read the trend first.",
    subtitle: "Completion rates and streaks show whether your setup is sustainable or overloaded.",
  };
  if (pathname === "/settings") return {
    title: "Control your workspace.",
    subtitle: "Manage examples, backups, and local setup from one place.",
  };
  return { title: "Habit Tracker", subtitle: "A focused control room for habits and projects." };
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brandPanel">
        <div className="brand">
          <div className="logo">
            <LogoMark />
          </div>
          <div className="brandText">
            <span className="eyebrow">Habit Tracker</span>
            <h1>Operate your routines like&nbsp;a&nbsp;system.</h1>
          </div>
        </div>
      </div>

      <nav className="nav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            end={item.to === "/"}
            className={({ isActive }) => (isActive ? "navCard isActive" : "navCard")}
            to={item.to}
          >
            <span className="navIcon" aria-hidden="true">{item.icon}</span>
            <span className="navCardBody">
              <span className="navCardEyebrow">{item.eyebrow}</span>
              <span className="navCardTitle">{item.label}</span>
            </span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebarNote">
        <span className="eyebrow">Method</span>
        <p>Keep habits simple, review weekly, and only raise targets after the baseline feels easy.</p>
      </div>
    </aside>
  );
}

// ─── Topbar ──────────────────────────────────────────────────────────────────
function Topbar() {
  const location = useLocation();
  const content = contentFor(location.pathname);
  const greeting = getGreeting();

  return (
    <header className="topbar">
      <div className="heroCopy">
        <span className="greeting">{greeting}</span>
        <h2>{content.title}</h2>
        <p>{content.subtitle}</p>
      </div>

      <div className="heroStats" aria-label="Workspace highlights">
        <div className="heroStat">
          <span className="heroStatLabel">Views</span>
          <strong>5</strong>
        </div>
        <div className="heroStat">
          <span className="heroStatLabel">Mode</span>
          <strong>Focused</strong>
        </div>
        <div className="heroStat">
          <span className="heroStatLabel">Loop</span>
          <strong>Daily</strong>
        </div>
      </div>
    </header>
  );
}

// ─── Mobile Bottom Nav ───────────────────────────────────────────────────────
function BottomNav() {
  return (
    <nav className="mobileNav" aria-label="Mobile navigation">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          end={item.to === "/"}
          className={({ isActive }) => (isActive ? "navItem isActive" : "navItem")}
          to={item.to}
          style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: 'inherit' }}
        >
          <span style={{ fontSize: '20px' }}>{item.icon}</span>
          <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────────────
function AppShell() {
  const location = useLocation();
  const isToday = location.pathname === "/";

  return (
    <div className="app">
      <div className="shell">
        <Sidebar />
        <div className="mainShell">
          {/* Hide topbar on Today page because it has its own Greeting card in the Bento grid */}
          {!isToday && <Topbar />}
          <main className="content" id="view" style={isToday ? { background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 } : {}}>
            <AuthGate>
              <Routes>
                <Route path="/"         element={<TodayPage />} />
                <Route path="/habits"   element={<HabitsPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </AuthGate>
          </main>
        </div>
      </div>
      <BottomNav />
      <ToastViewport />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AppProvider>
  );
}
