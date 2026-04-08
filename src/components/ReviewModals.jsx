import { useState } from 'react';
import { getWeekStart, isoToday } from '../lib/date.js';
import Modal from './Modal.jsx';

/**
 * Daily & Weekly Review Components
 * - End-of-day reflection
 * - Weekly summary
 * - Mood tracking
 * - Progress insights
 */

export function DailyReviewModal({
	isOpen,
	onClose,
	onSave,
	existingReview = null,
	stats = null,
}) {
	const [mood, setMood] = useState(existingReview?.mood || '');
	const [wins, setWins] = useState(existingReview?.wins || '');
	const [misses, setMisses] = useState(existingReview?.misses || '');
	const [notes, setNotes] = useState(existingReview?.notes || '');

	const moodOptions = [
		{ value: 'energetic', emoji: '⚡', label: 'Energetic' },
		{ value: 'happy', emoji: '😊', label: 'Happy' },
		{ value: 'neutral', emoji: '😐', label: 'Neutral' },
		{ value: 'tired', emoji: '😴', label: 'Tired' },
		{ value: 'stressed', emoji: '😰', label: 'Stressed' },
	];

	const handleSave = () => {
		onSave({
			date: isoToday(),
			mood,
			wins,
			misses,
			notes,
		});
		onClose();
	};

	if (!isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Daily Review"
			maxWidth="md"
		>
			<div className="space-y-6">
				{/* Stats Summary */}
				{stats && (
					<div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
						<p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-3">
							Today's Performance
						</p>
						<div className="grid grid-cols-3 gap-3">
							<div>
								<p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
									{stats.completed}
								</p>
								<p className="text-xs text-neutral-600 dark:text-neutral-400">
									Completed
								</p>
							</div>
							<div>
								<p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
									{stats.skipped}
								</p>
								<p className="text-xs text-neutral-600 dark:text-neutral-400">
									Skipped
								</p>
							</div>
							<div>
								<p className="text-2xl font-bold text-green-600 dark:text-green-400">
									{stats.rate}%
								</p>
								<p className="text-xs text-neutral-600 dark:text-neutral-400">
									Rate
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Mood Selector */}
				<div>
					<label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-3">
						How are you feeling?
					</label>
					<div className="grid grid-cols-5 gap-2">
						{moodOptions.map((option) => (
							<button
								key={option.value}
								onClick={() => setMood(option.value)}
								className={`p-3 rounded-lg transition-all border-2 ${
									mood === option.value
										? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
										: 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
								}`}
								title={option.label}
							>
								<span className="text-2xl display-block">{option.emoji}</span>
								<p className="text-xs mt-1 font-medium text-neutral-600 dark:text-neutral-400">
									{option.label}
								</p>
							</button>
						))}
					</div>
				</div>

				{/* What went well */}
				<div>
					<label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
						✨ What went well?
					</label>
					<textarea
						value={wins}
						onChange={(e) => setWins(e.target.value)}
						placeholder="Did you complete any important habits? Any breakthroughs today?"
						className="w-full p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
						rows={3}
					/>
				</div>

				{/* What failed */}
				<div>
					<label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
						💭 What didn't go as planned?
					</label>
					<textarea
						value={misses}
						onChange={(e) => setMisses(e.target.value)}
						placeholder="Any habits you skipped? Why might that have happened?"
						className="w-full p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
						rows={3}
					/>
				</div>

				{/* General Notes */}
				<div>
					<label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
						📝 Additional Notes
					</label>
					<textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Any other thoughts or reflections..."
						className="w-full p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
						rows={2}
					/>
				</div>

				{/* Actions */}
				<div className="flex gap-3 pt-4">
					<button
						onClick={handleSave}
						className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all shadow-lg"
					>
						✓ Save Review
					</button>
					<button
						onClick={onClose}
						className="flex-1 px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 font-semibold rounded-lg transition-all hover:bg-neutral-300 dark:hover:bg-neutral-600"
					>
						Cancel
					</button>
				</div>
			</div>
		</Modal>
	);
}

// Weekly review card/modal
export function WeeklyReviewModal({
	isOpen,
	onClose,
	onSave,
	weekData = null,
	habits = [],
}) {
	const [summary, setSummary] = useState(weekData?.summary || '');
	const [suggestions, setSuggestions] = useState(weekData?.suggestions || []);
	const [newSuggestion, setNewSuggestion] = useState('');

	const handleAddSuggestion = () => {
		if (newSuggestion.trim()) {
			setSuggestions([...suggestions, newSuggestion]);
			setNewSuggestion('');
		}
	};

	const handleRemoveSuggestion = (index) => {
		setSuggestions(suggestions.filter((_, i) => i !== index));
	};

	const handleSave = () => {
		onSave({
			weekStart: getWeekStart(new Date()).toISOString().split('T')[0],
			summary,
			suggestions,
		});
		onClose();
	};

	if (!isOpen) return null;

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			title="Weekly Review"
			maxWidth="md"
		>
			<div className="space-y-6">
				{/* Week Stats */}
				{weekData && (
					<div className="grid grid-cols-2 gap-4">
						<div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200/50 dark:border-green-700/50">
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								Completion Rate
							</p>
							<p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
								{Math.round(weekData.completionRate * 100)}%
							</p>
						</div>
						<div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
							<p className="text-sm text-neutral-600 dark:text-neutral-400">
								Habits Tracked
							</p>
							<p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
								{habits.length}
							</p>
						</div>
					</div>
				)}

				{/* Weekly Summary */}
				<div>
					<label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
						📊 Week Summary
					</label>
					<textarea
						value={summary}
						onChange={(e) => setSummary(e.target.value)}
						placeholder="How was your week overall? Any patterns or notable achievements?"
						className="w-full p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
						rows={4}
					/>
				</div>

				{/* Suggestions for Next Week */}
				<div>
					<label className="block text-sm font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
						💡 Suggestions for Next Week
					</label>
					<div className="space-y-2 mb-3">
						{suggestions.map((suggestion, index) => (
							<div
								key={index}
								className="flex items-center justify-between p-2 bg-blue-50/50 dark:bg-blue-900/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50"
							>
								<span className="text-sm text-neutral-900 dark:text-neutral-50">
									{suggestion}
								</span>
								<button
									onClick={() => handleRemoveSuggestion(index)}
									className="text-red-500 hover:text-red-700"
								>
									×
								</button>
							</div>
						))}
					</div>
					<div className="flex gap-2">
						<input
							type="text"
							value={newSuggestion}
							onChange={(e) => setNewSuggestion(e.target.value)}
							onKeyPress={(e) => e.key === 'Enter' && handleAddSuggestion()}
							placeholder="Add a suggestion..."
							className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<button
							onClick={handleAddSuggestion}
							className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-all"
						>
							Add
						</button>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3 pt-4">
					<button
						onClick={handleSave}
						className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all shadow-lg"
					>
						✓ Save Review
					</button>
					<button
						onClick={onClose}
						className="flex-1 px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 font-semibold rounded-lg transition-all hover:bg-neutral-300 dark:hover:bg-neutral-600"
					>
						Cancel
					</button>
				</div>
			</div>
		</Modal>
	);
}

// Daily review card (for summary view)
export function DailyReviewCard({ review }) {
	const moodEmojis = {
		happy: '😊',
		neutral: '😐',
		tired: '😴',
		stressed: '😰',
		energetic: '⚡',
	};

	return (
		<div className="glassmorphic-card p-4 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/20">
			<div className="flex items-start gap-3">
				<div className="text-3xl">{moodEmojis[review.mood] || '😐'}</div>
				<div className="flex-1">
					<p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
						Daily Review
					</p>
					{review.wins && (
						<p className="text-xs text-green-600 dark:text-green-400 mt-1">
							✓ {review.wins}
						</p>
					)}
					{review.misses && (
						<p className="text-xs text-amber-600 dark:text-amber-400">
							⚠️ {review.misses}
						</p>
					)}
					{review.notes && (
						<p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
							{review.notes}
						</p>
					)}
				</div>
			</div>
		</div>
	);
}
