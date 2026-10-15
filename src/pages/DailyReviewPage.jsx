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

	const MOODS = [
		{ id: 'happy', emoji: '😄', label: 'Happy' },
		{ id: 'focused', emoji: '🎯', label: 'Focused' },
		{ id: 'neutral', emoji: '😐', label: 'Neutral' },
		{ id: 'tired', emoji: '😴', label: 'Tired' },
		{ id: 'stressed', emoji: '😰', label: 'Stressed' },
	];
	return (
		<div className="pageContent">
			<div className="heroCard todayHeroCard celebrateCard">
				<div className="todayHeroContent">
					<div className="greeting">💭 Reflection · {today}</div>
					<h2 className="todayHeroTitle"><span className="gradientText">Daily review</span> workspace</h2>
					<div className="todayHeroSubtle">
						Close the loop: mood, wins, friction and one kind note to future-you.
					</div>
				</div>
				<div className="todayHeroPills">
					<span className="badge levelPill">💭 Today</span>
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
						<h2>✨ How was today, really?</h2>
						<div className="subtle">
							Two minutes of honesty beats a perfect week of guessing.
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
					<div className="card celebrateCard">
						<h2>✨ Mood</h2>
						<div
							className="moodRowMt"
						>
							{MOODS.map(
								(mood) => (
									<button
										key={mood.id}
										className={
											dailyReview.mood === mood.id ? 'btn primary moodBtn isActive' : 'btn ghost moodBtn'
										}
										type="button"
										title={mood.label}
										onClick={() =>
											setDailyReview((current) => ({ ...current, mood: mood.id }))
										}
									>
										{mood.emoji} {mood.label}
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
