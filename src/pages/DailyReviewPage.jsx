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
				toast.push('Failed to load reviews. Please refresh.');
			});
		return () => {
			alive = false;
		};
	}, [api, today, dataVersion]);

	if (!isReady) {
	return (
		<div className="pageContent">
			<p className="reviewLoadingText">
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
					<a
						href="#/review/weekly"
						className="btn ghost btnSm"
					>
						Weekly review →
					</a>
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
							try {
								await api.upsertDailyReview({
									date: today,
									...dailyReview,
								});
								toast.push('Daily review saved.');
								refresh();
							} catch (err) {
								toast.push(err?.message ?? 'Could not save review.');
							}
						}}
					>
						Save review
					</button>
				</div>
				<div
					className="grid two mt-md"
				>
					<div className="card">
						<h2>Mood</h2>
						<div
							className="moodRowMt"
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
							className="textarea mt-md"
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
							className="textarea mt-md"
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
