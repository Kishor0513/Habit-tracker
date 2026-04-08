import { useState } from 'react';
import { TEMPLATE_PACKS } from '../seed.js';
import Modal from '../components/Modal.jsx';
import { useApp } from '../state/AppState.jsx';
import { useToast } from '../state/ToastState.jsx';

async function exportData(api) {
	const [habits, entries, projects, reminderSettings] = await Promise.all([
		api.listHabits(),
		api.listEntries(),
		api.listProjects(),
		api.getSetting('reminders'),
	]);
	return {
		version: 1,
		exportedAt: new Date().toISOString(),
		habits,
		entries,
		projects,
		settings: reminderSettings ? [reminderSettings] : [],
	};
}

async function importData(api, data) {
	if (!data || typeof data !== 'object') throw new Error('Invalid import.');
	const habits = Array.isArray(data.habits) ? data.habits : [];
	const entries = Array.isArray(data.entries) ? data.entries : [];
	const projects = Array.isArray(data.projects) ? data.projects : [];
	const settings = Array.isArray(data.settings) ? data.settings : [];
	for (const h of habits) await api.upsertHabit(h);
	for (const e of entries)
		await api.setEntry({
			habitId: e.habitId,
			date: e.date,
			value: e.value ?? 0,
			note: e.note ?? '',
			status: e.status,
		});
	for (const p of projects) await api.upsertProject(p);
	for (const setting of settings) await api.setSetting(setting.key, setting.value);
}

export default function SettingsPage() {
	const { api, isReady, refresh, user, supabaseConfigured, auth } = useApp();
	const toast = useToast();
	const [activePanel, setActivePanel] = useState(null);

	if (!isReady) return <div className="card">Loading…</div>;

	async function loadPack(pack) {
		const habits = [];
		for (const h of pack.habits) habits.push(await api.upsertHabit(h));
		for (const p of pack.projects)
			await api.upsertProject({
				...p,
				habitIds: habits.slice(0, 3).map((x) => x.id),
			});
		toast.push('Loaded example pack.');
		refresh();
	}

	return (
		<div className="stack">
			<div className="card">
				<div className="sectionHeader">
					<div>
						<h2>Settings</h2>
						<div className="subtle">
							Load real-life examples, export your data, or import it on another device.
						</div>
					</div>
				</div>
			</div>

			{supabaseConfigured ? (
				<div className="card interactiveSurface" onClick={() => setActivePanel('account')}>
					<h2>Account</h2>
					<div className="row" style={{ gap: 12, alignItems: 'center' }}>
						<div className="badge accent">{user?.email ?? user?.id}</div>
						<button
							className="btn ghost"
							type="button"
							style={{ padding: '6px 12px', fontSize: '0.85rem' }}
							onClick={async (event) => {
								event.stopPropagation();
								try {
									await auth.signOut();
									toast.push('Signed out.');
								} catch (e) {
									toast.push(e?.message ?? 'Sign-out failed.');
								}
							}}
						>
							Sign out
						</button>
					</div>
				</div>
			) : null}

			<div className="card interactiveSurface" onClick={() => setActivePanel('notifications')}>
				<h2>Notifications</h2>
				<div className="stack">
					<div className="subtle">
						Browser reminders fire while this app is open. Enable notifications and set reminder times per habit.
					</div>
					<div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
						<span className="badge accent">
							{typeof Notification === 'undefined'
								? 'Unsupported'
								: Notification.permission === 'granted'
									? 'Allowed'
									: Notification.permission === 'denied'
										? 'Blocked'
										: 'Not requested'}
						</span>
						{typeof Notification !== 'undefined' ? (
							<button
								className="btn ghost"
								type="button"
								onClick={async (event) => {
									event.stopPropagation();
									const permission = await Notification.requestPermission();
									await api.setSetting('reminders', { permission, updatedAt: new Date().toISOString() });
									toast.push(`Notification permission: ${permission}.`);
									refresh();
								}}
							>
								Request permission
							</button>
						) : null}
					</div>
				</div>
			</div>

			<div className="card interactiveSurface" onClick={() => setActivePanel('packs')}>
				<h2>Example packs</h2>
				<div className="list">
					{TEMPLATE_PACKS.map((pack) => (
						<div key={pack.id} className="item interactiveSurface" onClick={() => setActivePanel(`pack:${pack.id}`)}>
							<div className="row between" style={{ gap: 14 }}>
								<div className="stack" style={{ gap: 6, minWidth: 0, flex: 1 }}>
									<div className="itemName">{pack.name}</div>
									<div className="subtle">{pack.description}</div>
									<div className="row" style={{ gap: 8 }}>
										<span className="badge">Habits: {pack.habits.length}</span>
										<span className="badge accent">Projects: {pack.projects.length}</span>
									</div>
								</div>
								<button
									className="btn primary"
									type="button"
									onClick={(event) => {
										event.stopPropagation();
										loadPack(pack);
									}}
								>
									Load pack
								</button>
							</div>
						</div>
					))}
				</div>
			</div>

			<div className="card interactiveSurface" onClick={() => setActivePanel('data')}>
				<h2>Data management</h2>
				<div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
					<button
						className="btn ghost"
						type="button"
						onClick={async (event) => {
							event.stopPropagation();
							const payload = await exportData(api);
							const blob = new Blob([JSON.stringify(payload, null, 2)], {
								type: 'application/json',
							});
							const url = URL.createObjectURL(blob);
							const a = document.createElement('a');
							a.href = url;
							a.download = `habit-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
							document.body.append(a);
							a.click();
							a.remove();
							window.setTimeout(() => URL.revokeObjectURL(url), 1000);
						}}
					>
						Export JSON
					</button>
					<button
						className="btn ghost"
						type="button"
						onClick={(event) => {
							event.stopPropagation();
							const input = document.createElement('input');
							input.type = 'file';
							input.accept = 'application/json';
							input.onchange = async () => {
								const file = input.files?.[0];
								if (!file) return;
								const text = await file.text();
								try {
									await importData(api, JSON.parse(text));
									toast.push('Imported.');
									refresh();
								} catch (e) {
									toast.push(e?.message ?? 'Import failed.');
								}
							};
							input.click();
						}}
					>
						Import JSON
					</button>
					<button
						className="btn danger"
						type="button"
						onClick={async (event) => {
							event.stopPropagation();
							const ok = window.confirm(
								'This wipes all local data for this app in this browser. This cannot be undone. Continue?',
							);
							if (!ok) return;
							await new Promise((resolve, reject) => {
								const req = indexedDB.deleteDatabase('habit_tracker_db');
								req.onsuccess = () => resolve();
								req.onerror = () => reject(req.error);
							});
							toast.push('Reset complete. Reloading…');
							window.setTimeout(() => window.location.reload(), 600);
						}}
					>
						Reset application
					</button>
				</div>
				<p className="subtle" style={{ marginTop: 12 }}>
					{supabaseConfigured
						? 'Signed-in data is stored in Supabase and synced across devices.'
						: 'Data is stored locally in your browser (IndexedDB). Export regularly to prevent data loss.'}
				</p>
			</div>

			{activePanel ? (
				<Modal
					title={
						activePanel === 'account' ? 'Account' :
						activePanel === 'notifications' ? 'Notifications' :
						activePanel === 'packs' ? 'Example packs' :
						activePanel === 'data' ? 'Data management' :
						TEMPLATE_PACKS.find((pack) => `pack:${pack.id}` === activePanel)?.name ?? 'Settings'
					}
					onClose={() => setActivePanel(null)}
				>
					{activePanel === 'account' ? (
						<div className="stack">
							<div className="card">
								<div className="label">Signed in as</div>
								<div className="value" style={{ marginTop: 8 }}>{user?.email ?? user?.id}</div>
							</div>
						</div>
					) : null}
					{activePanel === 'notifications' ? (
						<div className="stack">
							<div className="card">
								<div className="label">Browser notifications</div>
								<div className="subtle" style={{ marginTop: 8 }}>
									Enable notifications here, then set reminder times inside each habit.
								</div>
							</div>
						</div>
					) : null}
					{activePanel === 'packs' ? (
						<div className="list">
							{TEMPLATE_PACKS.map((pack) => (
								<div key={pack.id} className="item">
									<div className="itemName">{pack.name}</div>
									<div className="subtle" style={{ marginTop: 6 }}>{pack.description}</div>
								</div>
							))}
						</div>
					) : null}
					{activePanel === 'data' ? (
						<div className="stack">
							<div className="card">
								<div className="label">Export / Import / Reset</div>
								<div className="subtle" style={{ marginTop: 8 }}>
									Export backups, import previous data, or reset the local application storage.
								</div>
							</div>
						</div>
					) : null}
					{activePanel.startsWith('pack:') ? (
						(() => {
							const pack = TEMPLATE_PACKS.find((item) => `pack:${item.id}` === activePanel);
							if (!pack) return null;
							return (
								<div className="stack">
									<div className="card">
										<div className="itemName">{pack.name}</div>
										<div className="subtle" style={{ marginTop: 8 }}>{pack.description}</div>
										<div className="row" style={{ gap: 8, marginTop: 12 }}>
											<span className="badge">Habits: {pack.habits.length}</span>
											<span className="badge accent">Projects: {pack.projects.length}</span>
										</div>
									</div>
									<button className="btn primary" type="button" onClick={() => { loadPack(pack); setActivePanel(null); }}>
										Load pack
									</button>
								</div>
							);
						})()
					) : null}
				</Modal>
			) : null}
		</div>
	);
}
