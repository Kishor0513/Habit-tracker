import { useEffect, useState } from 'react';
import { isoToday } from '../lib/date.js';
import { useApp } from '../state/AppState.jsx';
import { useToast } from '../state/ToastState.jsx';

export default function DailyReviewPage() {
	const { api, isReady, refresh, dataVersion } = useApp();
	const toast = useToast();
	const today = isoToday();
	const [dailyReview, setDailyReview] = useState({
		mood: '',
		notes: '',
		wins: '',
		misses: '',
	});

	useEffect(() => {
		if (!api?.listDailyReviews) return;
		let alive = true;
		api
			.listDailyReviews()
			.then((reviews) => {
				if (!alive) return;
				const review = (reviews ?? []).find((item) => item.date === today);
				if (!review) return;
				setDailyReview({
					mood: review.mood ?? '',
					notes: review.notes ?? '',
					wins: review.wins ?? '',
					misses: review.misses ?? '',
				});
			})
			.catch((error) => {
				console.error(error);
			});
		return () => {
			alive = false;
		};
	}, [api, today, dataVersion]);

	if (!isReady) {
		return (
			<div className="pageContent">
				<p style={{ color: 'var(--text-muted)' }}>
					Loading review workspace...
				</p>
			</div>
		);
	}

	return (
		<div className="pageContent">
			<div className="heroCard todayHeroCard">
				<div className="todayHeroContent">
					<div className="greeting">Reflection</div>
					<h2 className="todayHeroTitle">Daily review workspace</h2>
					<div className="todayHeroSubtle">
						Capture mood, wins, misses, and notes for {today}.
					</div>
				</div>
				<div className="todayHeroPills">
					<span className="badge brand">{today}</span>
				</div>
			</div>

			<div className="card todayReviewCard">
				<div className="sectionHeader">
					<div>
						<h2>Daily review</h2>
						<div className="subtle">
							Capture reflection, mood, and what to improve before the day
							closes.
						</div>
					</div>
					<button
						className="btn primary"
						type="button"
						onClick={async () => {
							await api.upsertDailyReview({
								date: today,
								...dailyReview,
							});
							toast.push('Daily review saved.');
							refresh();
						}}
					>
						Save review
					</button>
				</div>
				<div
					className="grid two"
					style={{ marginTop: 16 }}
				>
					<div className="card">
						<h2>Mood</h2>
						<div
							className="row"
							style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}
						>
							{['happy', 'neutral', 'tired', 'focused', 'stressed'].map(
								(mood) => (
									<button
										key={mood}
										className={
											dailyReview.mood === mood ? 'btn primary' : 'btn ghost'
										}
										type="button"
										onClick={() =>
											setDailyReview((current) => ({ ...current, mood }))
										}
									>
										{mood}
									</button>
								),
							)}
						</div>
						<textarea
							className="textarea"
							style={{ marginTop: 12 }}
							value={dailyReview.notes}
							onChange={(event) =>
								setDailyReview((current) => ({
									...current,
									notes: event.target.value,
								}))
							}
							placeholder="Quick journal entry"
						/>
					</div>
					<div className="card">
						<h2>Reflection</h2>
						<textarea
							className="textarea"
							value={dailyReview.wins}
							onChange={(event) =>
								setDailyReview((current) => ({
									...current,
									wins: event.target.value,
								}))
							}
							placeholder="What went well?"
						/>
						<textarea
							className="textarea"
							style={{ marginTop: 12 }}
							value={dailyReview.misses}
							onChange={(event) =>
								setDailyReview((current) => ({
									...current,
									misses: event.target.value,
								}))
							}
							placeholder="What failed or created friction?"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
