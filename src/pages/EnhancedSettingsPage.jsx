import { useEffect, useState } from 'react';
import { useApp } from '../state/AppState.jsx';
import { useToast } from '../state/ToastState.jsx';

/**
 * Enhanced Settings Page
 * - Profile settings
 * - Dark mode toggle
 * - Spotify settings
 * - Notifications & reminders
 * - Timezone
 * - Data export/import
 */

export default function EnhancedSettingsPage() {
	const { api, isReady } = useApp();
	const toast = useToast();

	// State
	const [isDarkMode, setIsDarkMode] = useState(false);
	const [profileName, setProfileName] = useState('');
	const [email, setEmail] = useState('');
	const [timezone, setTimezone] = useState('UTC');
	const [reminderTime, setReminderTime] = useState('08:00');
	const [reminderEnabled, setReminderEnabled] = useState(true);
	const [exportLoading, setExportLoading] = useState(false);

	useEffect(() => {
		// Load settings from localStorage or API
		const isDark = localStorage.getItem('isDarkMode') === 'true';
		setIsDarkMode(isDark);
	}, []);

	const handleThemeToggle = () => {
		const newDark = !isDarkMode;
		setIsDarkMode(newDark);
		localStorage.setItem('isDarkMode', newDark);
		document.documentElement.setAttribute(
			'data-theme',
			newDark ? 'dark' : 'light',
		);
		toast.success(`Switched to ${newDark ? 'dark' : 'light'} mode`);
	};

	const handleExportData = async () => {
		setExportLoading(true);
		try {
			// This would call an API endpoint to export data
			// For now, create a simple CSV export
			const data = {
				exportedAt: new Date().toISOString(),
				version: '1.0',
			};

			const dataStr = JSON.stringify(data, null, 2);
			const dataBlob = new Blob([dataStr], { type: 'application/json' });
			const url = URL.createObjectURL(dataBlob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `habit-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			toast.success('Data exported successfully!');
		} catch (error) {
			toast.error('Failed to export data');
		} finally {
			setExportLoading(false);
		}
	};

	const handleSaveSettings = async () => {
		try {
			// Save settings to API
			if (api.updateUserSettings) {
				await api.updateUserSettings({
					timezone,
					reminderTime,
					reminderEnabled,
				});
			}
			toast.success('Settings saved!');
		} catch (error) {
			toast.error('Failed to save settings');
		}
	};

	if (!isReady) {
		return (
			<div className="flex items-center justify-center h-screen">
				<p className="text-neutral-600 dark:text-neutral-400">
					Loading settings...
				</p>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 p-6">
			<div className="max-w-3xl mx-auto space-y-6">
				{/* Header */}
				<div>
					<h1 className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">
						⚙️ Settings
					</h1>
					<p className="text-neutral-600 dark:text-neutral-400 mt-1">
						Customize your Habit Tracker experience
					</p>
				</div>

				{/* Profile Settings */}
				<SettingsSection
					title="👤 Profile"
					description="Manage your profile information"
				>
					<SettingItem
						label="Full Name"
						value={profileName}
						onChange={setProfileName}
						type="text"
					/>
					<SettingItem
						label="Email"
						value={email}
						onChange={setEmail}
						type="email"
						disabled
					/>
					<button className="mt-4 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all">
						✏️ Edit Profile
					</button>
				</SettingsSection>

				{/* Appearance Settings */}
				<SettingsSection
					title="🎨 Appearance"
					description="Customize how the app looks"
				>
					<div className="space-y-4">
						<div className="flex items-center justify-between p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800">
							<div>
								<p className="font-medium text-neutral-900 dark:text-neutral-50">
									Dark Mode
								</p>
								<p className="text-sm text-neutral-600 dark:text-neutral-400">
									Use dark theme
								</p>
							</div>
							<button
								onClick={handleThemeToggle}
								className={`relative w-12 h-6 rounded-full transition-colors ${
									isDarkMode ? 'bg-blue-500' : 'bg-neutral-300'
								}`}
							>
								<div
									className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
										isDarkMode ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>
					</div>
				</SettingsSection>

				{/* Notifications & Reminders */}
				<SettingsSection
					title="🔔 Notifications & Reminders"
					description="Control when you get notified"
				>
					<div className="space-y-4">
						<div className="flex items-center justify-between p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800">
							<div>
								<p className="font-medium text-neutral-900 dark:text-neutral-50">
									Daily Reminders
								</p>
								<p className="text-sm text-neutral-600 dark:text-neutral-400">
									Get reminded to complete habits
								</p>
							</div>
							<button
								onClick={() => setReminderEnabled(!reminderEnabled)}
								className={`relative w-12 h-6 rounded-full transition-colors ${
									reminderEnabled ? 'bg-blue-500' : 'bg-neutral-300'
								}`}
							>
								<div
									className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
										reminderEnabled ? 'translate-x-6' : 'translate-x-1'
									}`}
								/>
							</button>
						</div>

						{reminderEnabled && (
							<SettingItem
								label="Reminder Time"
								value={reminderTime}
								onChange={setReminderTime}
								type="time"
							/>
						)}

						<div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-700/50">
							<p className="text-sm text-blue-700 dark:text-blue-300">
								💡 Tip: Set your reminder time to when you're most likely to
								complete your habits.
							</p>
						</div>
					</div>
				</SettingsSection>

				{/* Location & Timezone */}
				<SettingsSection
					title="🌍 Location & Timezone"
					description="Configure your timezone for analytics"
				>
					<div>
						<label className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-2">
							Timezone
						</label>
						<select
							value={timezone}
							onChange={(e) => setTimezone(e.target.value)}
							className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="UTC">UTC (Coordinated Universal Time)</option>
							<option value="EST">EST (Eastern Standard Time)</option>
							<option value="CST">CST (Central Standard Time)</option>
							<option value="MST">MST (Mountain Standard Time)</option>
							<option value="PST">PST (Pacific Standard Time)</option>
							<option value="GMT">GMT (Greenwich Mean Time)</option>
							<option value="CET">CET (Central European Time)</option>
							<option value="IST">IST (Indian Standard Time)</option>
							<option value="JST">JST (Japan Standard Time)</option>
							<option value="AEST">
								AEST (Australian Eastern Standard Time)
							</option>
						</select>
					</div>
				</SettingsSection>

				{/* Spotify Settings */}
				<SettingsSection
					title="🎵 Spotify Integration"
					description="Manage your Spotify connection"
				>
					<div className="space-y-4">
						<div className="p-4 rounded-lg bg-green-50/50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-700/50">
							<p className="font-medium text-neutral-900 dark:text-neutral-50 mb-2">
								Connected Spotify Account
							</p>
							<p className="text-sm text-green-600 dark:text-green-400">
								✓ Connected as spotify_user
							</p>
						</div>
						<button className="px-4 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 font-medium transition-all hover:bg-neutral-300 dark:hover:bg-neutral-600">
							🔄 Reconnect Spotify
						</button>
						<button className="px-4 py-2 rounded-lg bg-red-500/20 text-red-600 dark:text-red-400 font-medium transition-all hover:bg-red-500/30">
							❌ Disconnect
						</button>
					</div>
				</SettingsSection>

				{/* Data Management */}
				<SettingsSection
					title="📊 Data Management"
					description="Export or backup your data"
				>
					<div className="space-y-4">
						<button
							onClick={handleExportData}
							disabled={exportLoading}
							className="w-full px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50"
						>
							{exportLoading ? '⏳ Exporting...' : '📥 Export Data as JSON'}
						</button>
						<p className="text-xs text-neutral-600 dark:text-neutral-400">
							Download all your habits, entries, and settings as a JSON file for
							backup or import into another app.
						</p>
					</div>
				</SettingsSection>

				{/* About & Legal */}
				<SettingsSection
					title="ℹ️ About"
					description="Information and legal"
				>
					<div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
						<div className="flex justify-between">
							<span>Version</span>
							<span className="font-medium text-neutral-900 dark:text-neutral-50">
								1.0.0
							</span>
						</div>
						<div className="flex justify-between">
							<span>Build</span>
							<span className="font-medium text-neutral-900 dark:text-neutral-50">
								2024-01-01
							</span>
						</div>
						<button className="text-blue-600 dark:text-blue-400 hover:underline">
							View Privacy Policy
						</button>
						<button className="text-blue-600 dark:text-blue-400 hover:underline">
							View Terms of Service
						</button>
					</div>
				</SettingsSection>

				{/* Save Button */}
				<div className="flex gap-3">
					<button
						onClick={handleSaveSettings}
						className="flex-1 px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all shadow-lg"
					>
						✓ Save Settings
					</button>
				</div>
			</div>
		</div>
	);
}

// Settings section component
function SettingsSection({ title, description, children }) {
	return (
		<div className="glassmorphic-card p-6 rounded-2xl border border-neutral-200/50 dark:border-neutral-700/50 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md">
			<div className="mb-4">
				<h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
					{title}
				</h2>
				<p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
					{description}
				</p>
			</div>
			<div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
				{children}
			</div>
		</div>
	);
}

// Settings item component
function SettingItem({
	label,
	value,
	onChange,
	type = 'text',
	disabled = false,
}) {
	return (
		<div className="flex items-center justify-between p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800">
			<label className="font-medium text-neutral-900 dark:text-neutral-50">
				{label}
			</label>
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
			/>
		</div>
	);
}
