import { useEffect, useState } from 'react';

/**
 * Advanced Spotify Integration Component
 * - Display current track
 * - Link playlists to habits
 * - Track playlist correlations
 * - Spotify player controls
 */

export function SpotifyCurrentTrack({
	currentTrack = null,
	isPlaying = false,
}) {
	if (!currentTrack) {
		return (
			<div className="glassmorphic-card p-4 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20">
				<p className="text-sm text-neutral-600 dark:text-neutral-400">
					🎵 No track playing
				</p>
			</div>
		);
	}

	return (
		<div className="glassmorphic-card p-4 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20">
			<div className="flex items-center gap-3">
				<div className="flex-shrink-0">
					{isPlaying && (
						<div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
							<span className="animate-pulse text-sm">▶</span>
						</div>
					)}
					{!isPlaying && (
						<div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center opacity-50">
							<span className="text-sm">⏸</span>
						</div>
					)}
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 truncate">
						{currentTrack.name}
					</p>
					<p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
						{currentTrack.artists?.join(', ') || 'Unknown Artist'}
					</p>
				</div>
				<div className="text-lg">🎵</div>
			</div>
		</div>
	);
}

// Linked playlist selector
export function PlaylistLinkModal({
	isOpen,
	onClose,
	onSelect,
	habit,
	currentPlaylist = null,
}) {
	const [playlists, setPlaylists] = useState([]);
	const [loading, setLoading] = useState(false);
	const [selectedPlaylist, setSelectedPlaylist] = useState(currentPlaylist);

	useEffect(() => {
		if (isOpen) {
			loadPlaylists();
		}
	}, [isOpen]);

	const loadPlaylists = async () => {
		setLoading(true);
		try {
			// This would call Spotify API in real implementation
			// For now, return mock data
			setPlaylists([
				{
					id: '1',
					name: 'Focus & Productivity',
					description: '30 instrumental tracks for deep work',
				},
				{
					id: '2',
					name: 'Morning Energy',
					description: 'Upbeat tracks to start your day',
				},
				{
					id: '3',
					name: 'Evening Chill',
					description: 'Relaxing ambient music',
				},
				{
					id: '4',
					name: 'Workout Pump',
					description: 'High energy training music',
				},
			]);
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
			<div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-md w-full max-h-96 overflow-hidden flex flex-col">
				{/* Header */}
				<div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
					<h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
						Link Playlist to {habit.name}
					</h3>
					<p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
						Choose a playlist to automatically play during this habit's focus
						sessions
					</p>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-4 space-y-2">
					{loading ? (
						<p className="text-center text-neutral-500 dark:text-neutral-400 py-8">
							Loading playlists...
						</p>
					) : (
						playlists.map((playlist) => (
							<button
								key={playlist.id}
								onClick={() => setSelectedPlaylist(playlist.id)}
								className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
									selectedPlaylist === playlist.id
										? 'border-green-500 bg-green-50 dark:bg-green-900/20'
										: 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
								}`}
							>
								<p className="font-medium text-sm text-neutral-900 dark:text-neutral-50">
									🎵 {playlist.name}
								</p>
								<p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
									{playlist.description}
								</p>
							</button>
						))
					)}
				</div>

				{/* Footer */}
				<div className="p-4 border-t border-neutral-200 dark:border-neutral-700 flex gap-3">
					<button
						onClick={onClose}
						className="flex-1 px-4 py-2 rounded-lg font-medium text-neutral-900 dark:text-neutral-50 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-all"
					>
						Cancel
					</button>
					<button
						onClick={() => {
							onSelect(selectedPlaylist);
							onClose();
						}}
						disabled={!selectedPlaylist}
						className="flex-1 px-4 py-2 rounded-lg font-medium text-white bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
					>
						Link Playlist
					</button>
				</div>
			</div>
		</div>
	);
}

// Spotify mini player component
export function SpotifyMiniPlayer({
	currentTrack = null,
	isPlaying = false,
	onPlayPause,
	onNext,
	onPrevious,
}) {
	const isConnected = !!currentTrack;

	if (!isConnected) {
		return (
			<div className="glassmorphic-card p-4 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50 text-center">
				<p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
					🎵 Spotify Not Connected
				</p>
				<button className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
					Connect Spotify
				</button>
			</div>
		);
	}

	return (
		<div className="glassmorphic-card p-4 rounded-lg border border-green-200/50 dark:border-green-700/50 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20">
			{/* Current Track */}
			<div className="mb-4 p-3 bg-neutral-50/50 dark:bg-neutral-800/50 rounded-lg">
				<p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
					Now Playing
				</p>
				<p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50 truncate">
					{currentTrack.name}
				</p>
				<p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
					{currentTrack.artists?.join(', ')}
				</p>
			</div>

			{/* Controls */}
			<div className="flex items-center justify-center gap-2">
				<button
					onClick={onPrevious}
					className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
					title="Previous"
				>
					⏮
				</button>
				<button
					onClick={onPlayPause}
					className="px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold transition-all"
				>
					{isPlaying ? '⏸ Pause' : '▶ Play'}
				</button>
				<button
					onClick={onNext}
					className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
					title="Next"
				>
					⏭
				</button>
			</div>
		</div>
	);
}

// Mood selector component (for right panel)
export function MoodSelector({ currentMood = null, onMoodSelect }) {
	const moods = [
		{ value: 'energetic', emoji: '⚡', label: 'Energetic' },
		{ value: 'happy', emoji: '😊', label: 'Happy' },
		{ value: 'neutral', emoji: '😐', label: 'Neutral' },
		{ value: 'tired', emoji: '😴', label: 'Tired' },
		{ value: 'stressed', emoji: '😰', label: 'Stressed' },
	];

	return (
		<div className="glassmorphic-card p-4 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50">
			<p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-3">
				How are you feeling?
			</p>
			<div className="grid grid-cols-5 gap-2">
				{moods.map((mood) => (
					<button
						key={mood.value}
						onClick={() => onMoodSelect(mood.value)}
						className={`p-2 rounded-lg transition-all border-2 ${
							currentMood === mood.value
								? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
								: 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
						}`}
						title={mood.label}
					>
						<span className="text-xl display-block">{mood.emoji}</span>
					</button>
				))}
			</div>
		</div>
	);
}

// Quick notes component (for right panel)
export function QuickNotesPanel({ notes = '', onNotesChange, onSave }) {
	return (
		<div className="glassmorphic-card p-4 rounded-lg border border-neutral-200/50 dark:border-neutral-700/50">
			<p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-2">
				📝 Quick Notes
			</p>
			<textarea
				value={notes}
				onChange={(e) => onNotesChange(e.target.value)}
				placeholder="Jot down quick thoughts..."
				className="w-full p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
				rows={3}
			/>
			<button
				onClick={onSave}
				className="w-full mt-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs rounded-lg transition-all"
			>
				Save Notes
			</button>
		</div>
	);
}
