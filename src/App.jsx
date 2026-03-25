import React from "react";
import { NavLink, Route, Routes } from "react-router-dom";
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

function subtitleFor(pathname) {
  if (pathname === "/") return "Execute today. Review weekly. Improve forever.";
  if (pathname === "/habits") return "Habits: your daily system.";
  if (pathname === "/projects") return "Projects: real goals with milestones.";
  if (pathname === "/insights") return "Insights: progress that’s hard to fake.";
  if (pathname === "/settings") return "Examples, export/import, reset.";
  return "";
}

function Topbar() {
  const path = window.location.hash.replace(/^#/, "") || "/";
  const subtitle = subtitleFor(path);
  return (
    <header className="topbar">
      <div className="brand">
        <LogoMark />
        <div className="brandText">
          <h1>Habit Tracker</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <nav className="nav" aria-label="Primary navigation">
        <NavLink className={({ isActive }) => (isActive ? "pill isActive" : "pill")} to="/">
          Today
        </NavLink>
        <NavLink className={({ isActive }) => (isActive ? "pill isActive" : "pill")} to="/habits">
          Habits
        </NavLink>
        <NavLink className={({ isActive }) => (isActive ? "pill isActive" : "pill")} to="/projects">
          Projects
        </NavLink>
        <NavLink className={({ isActive }) => (isActive ? "pill isActive" : "pill")} to="/insights">
          Insights
        </NavLink>
        <NavLink className={({ isActive }) => (isActive ? "pill isActive" : "pill")} to="/settings">
          Settings
        </NavLink>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <div className="app">
          <div className="shell">
            <Topbar />
            <main className="content" id="view">
              <AuthGate>
                <Routes>
                  <Route path="/" element={<TodayPage />} />
                  <Route path="/habits" element={<HabitsPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/insights" element={<InsightsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </AuthGate>
            </main>
          </div>
          <ToastViewport />
        </div>
      </ToastProvider>
    </AppProvider>
  );
}
