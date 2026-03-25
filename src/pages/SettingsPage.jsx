import { TEMPLATE_PACKS } from '../seed.js';
import { useApp } from '../state/AppState.jsx';
import { useToast } from '../state/ToastState.jsx';

async function exportData(api) {
	const [habits, entries, projects] = await Promise.all([
		api.listHabits(),
		api.listEntries(),
		api.listProjects(),
	]);
	return {
		version: 1,
		exportedAt: new Date().toISOString(),
		habits,
		entries,
		projects,
	};
}

async function importData(api, data) {
	if (!data || typeof data !== 'object') throw new Error('Invalid import.');
	const habits = Array.isArray(data.habits) ? data.habits : [];
	const entries = Array.isArray(data.entries) ? data.entries : [];
	const projects = Array.isArray(data.projects) ? data.projects : [];
	for (const h of habits) await api.upsertHabit(h);
	for (const e of entries)
		await api.setEntry({
			habitId: e.habitId,
			date: e.date,
			value: e.value ?? 0,
			note: e.note ?? '',
		});
	for (const p of projects) await api.upsertProject(p);
}

export default function SettingsPage() {
	const { api, isReady, refresh, user, supabaseConfigured, auth } = useApp();
	const toast = useToast();

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
				<h2>Settings</h2>
				<p className="subtle">
					Load real-life examples, export your data, or import it on another
					device.
				</p>
			</div>

			{supabaseConfigured ? (
				<div className="card">
					<h2>Account</h2>
					<div className="subtle">Signed in as: {user?.email ?? user?.id}</div>
					<div style={{ marginTop: 10 }}>
						<button
							className="btn"
							type="button"
							onClick={async () => {
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

			<div className="card">
				<h2>Example packs</h2>
				<div className="list">
					{TEMPLATE_PACKS.map((pack) => (
						<div
							key={pack.id}
							className="item"
						>
							<div
								className="row between"
								style={{ gap: 14 }}
							>
								<div
									className="stack"
									style={{ gap: 4, minWidth: 0 }}
								>
									<div
										className="itemName"
										style={{ fontWeight: 750 }}
									>
										{pack.name}
									</div>
									<div className="subtle">{pack.description}</div>
									<div className="subtle">
										Habits: {pack.habits.length} · Projects:{' '}
										{pack.projects.length}
									</div>
								</div>
								<button
									className="btn primary"
									type="button"
									onClick={() => loadPack(pack)}
								>
									Load
								</button>
							</div>
						</div>
					))}
				</div>
			</div>

			<div className="card">
				<h2>Data</h2>
				<div
					className="row"
					style={{ flexWrap: 'wrap' }}
				>
					<button
						className="btn"
						type="button"
						onClick={async () => {
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
						className="btn"
						type="button"
						onClick={() => {
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
						onClick={async () => {
							const ok = window.confirm(
								'This wipes all local data for this app in this browser. Continue?',
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
						Reset app (wipe local data)
					</button>
				</div>
				<p className="subtle">
					{supabaseConfigured
						? 'Signed-in data is stored in Supabase and scoped to your account.'
						: 'Data is stored locally in your browser (IndexedDB). Export regularly if it matters.'}
				</p>
			</div>
		</div>
	);
}
