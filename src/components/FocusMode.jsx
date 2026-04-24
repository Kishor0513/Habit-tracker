import { useEffect, useState } from 'react';

/**
 * Focus Mode / Habit Session Component
 * - Minimal UI for deep work
 * - Timer with pomodoro-style intervals
 * - Spotify integration
 * - Session tracking
 */

export function FocusModeModal({
	isOpen,
	habit,
	onClose,
	onComplete,
	onSkip,
	linkedSpotifyPlaylist = null,
}) {
	const [duration, setDuration] = useState(60); // minutes
	const [timeLeft, setTimeLeft] = useState(duration * 60); // seconds
	const [isRunning, setIsRunning] = useState(false);
	const [sessionStartTime] = useState(new Date());
	const [sessionPlaylistId] = useState(linkedSpotifyPlaylist);

	useEffect(() => {
		let interval;
		if (isRunning && timeLeft > 0) {
			interval = setInterval(() => {
				setTimeLeft((prev) => {
					if (prev <= 1) {
						setIsRunning(false);
						notifyCompletion();
						return 0;
					}
					return prev - 1;
				});
			}, 1000);
		}
		return () => clearInterval(interval);
	}, [isRunning, timeLeft]);

	const notifyCompletion = () => {
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification('Focus session complete!', {
				body: `Great job completing your ${habit.name} session!`,
				icon: '✅',
			});
		}
	};

	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
	};

	const handleComplete = () => {
		const endTime = new Date();
		const durationSeconds = Math.floor(
			(endTime.getTime() - sessionStartTime.getTime()) / 1000,
		);
		onComplete({
			success: true,
			duration: durationSeconds,
			playlistId: sessionPlaylistId,
			endTime,
		});
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center">
			{/* Spotify Widget */}
			{sessionPlaylistId && (
				<div className="absolute top-8 right-8 bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-400/30 rounded-xl p-4 backdrop-blur-md max-w-xs">
					<p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
						Currently Playing
					</p>
					<p className="font-semibold text-neutral-900 dark:text-neutral-50 truncate">
						🎵 {sessionPlaylistId}
					</p>
				</div>
			)}

			{/* Main Focus UI */}
			<div className="text-center max-w-3xl mx-auto px-6">
				{/* Habit Name */}
				<h2 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
					{habit.name}
				</h2>

				{/* Large Timer */}
				<div className="mb-8">
					<div className="inline-block p-12 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-600/10 border border-blue-400/30 backdrop-blur-md">
						<div className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
							{formatTime(timeLeft)}
						</div>
					</div>
				</div>

				{/* Duration Selector */}
				{!isRunning && timeLeft === duration * 60 && (
					<div className="flex gap-2 justify-center mb-6 flex-wrap">
						{[5, 15, 25, 45, 60].map((min) => (
							<button
								key={min}
								onClick={() => {
									setDuration(min);
									setTimeLeft(min * 60);
								}}
								className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
									duration === min
										? 'bg-blue-500 text-white shadow-lg'
										: 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 hover:bg-neutral-300 dark:hover:bg-neutral-600'
								}`}
							>
								{min}m
							</button>
						))}
					</div>
				)}

				{/* Control Buttons */}
				<div className="flex gap-4 justify-center flex-wrap">
					<button
						onClick={() => setIsRunning(!isRunning)}
						className={`px-8 py-3 rounded-lg font-semibold transition-all ${
							isRunning
								? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg'
								: 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg'
						}`}
					>
						{isRunning ? 'Pause' : 'Start'}
					</button>

					<button
						onClick={handleComplete}
						className="px-8 py-3 rounded-lg font-semibold bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all"
					>
						✓ Done
					</button>

					<button
						onClick={() => {
							onSkip();
							onClose();
						}}
						className="px-8 py-3 rounded-lg font-semibold bg-neutral-600 hover:bg-neutral-700 text-white shadow-lg transition-all"
					>
						Skip
					</button>
				</div>

				{/* Session Info */}
				<div className="mt-8 px-6 py-4 bg-neutral-50/50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50">
					<p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
						Session Info
					</p>
					<div className="flex justify-around text-sm font-medium text-neutral-900 dark:text-neutral-50 flex-wrap gap-4">
						<div>
							<span className="text-xs text-neutral-500 dark:text-neutral-400">
								Target
							</span>
							<div>
								{habit.target} {habit.unit || 'completion'}
							</div>
						</div>
						<div>
							<span className="text-xs text-neutral-500 dark:text-neutral-400">
								Category
							</span>
							<div>{habit.category || '—'}</div>
						</div>
						<div>
							<span className="text-xs text-neutral-500 dark:text-neutral-400">
								Started
							</span>
							<div>
								{sessionStartTime.toLocaleTimeString([], {
									hour: '2-digit',
									minute: '2-digit',
								})}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// Session summary card
export function SessionSummaryCard({ session, habit, spotify = null }) {
	const durationMinutes = Math.floor(session.duration / 60);
	const durationSeconds = session.duration % 60;

	return (
		<div className="glass-card p-4 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h4 className="font-semibold text-neutral-900 dark:text-neutral-50">
						✓ Session Complete
					</h4>
					<p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
						{habit.name}
					</p>
				</div>
				<div className="text-right">
					<div className="text-lg font-bold text-green-600 dark:text-green-400">
						{durationMinutes}m {durationSeconds}s
					</div>
					{session.playlistId && (
						<div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
							🎵 {session.playlistId}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
