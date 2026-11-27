import React from 'react';

const PATHS = {
	home: <><path d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-4v-6h-4v6H6a2 2 0 0 1-2-2z" /></>,
	pulse: <><path d="M3 12h4l2.2-5 4.4 10 2.4-5H21" /></>,
	habit: <><rect x="7" y="7" width="10" height="10" rx="3" /><path d="M8 12h8M12 8v8" /></>,
	task: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" /></>,
	project: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" /><path d="M19 5l-4.5 4.5" /></>,
	note: <><path d="M7 4h8l4 4v12H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><path d="M15 4v4h4M9 13h6M9 17h4" /></>,
	finance: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M3 10h18M16 15h2" /></>,
	invoice: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
	calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
	chart: <><path d="M4 19h16M7 15l3-3 3 2 4-6" /></>,
	settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21v4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
	search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
	plus: <><path d="M12 5v14M5 12h14" /></>,
	bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9z" /><path d="M10 21h4" /></>,
	chevron: <><path d="m9 6 6 6-6 6" /></>,
	chevronDown: <><path d="m6 9 6 6 6-6" /></>,
	more: <><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>,
	check: <><path d="m5 12 4 4L19 6" /></>,
	close: <><path d="M6 6l12 12M18 6 6 18" /></>,
	trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14" /></>,
	edit: <><path d="m4 20 4-1 11-11-3-3L5 16z" /><path d="m14 6 3 3" /></>,
	pin: <><path d="M9 3h6l-1 6 4 3v2H6v-2l4-3z" /><path d="M12 14v7" /></>,
	archive: <><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v12h14V8M10 12h4" /></>,
	download: <><path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" /></>,
	filter: <><path d="M4 6h16l-6 7v5l-4 2v-7z" /></>,
	menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
	clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
	folder: <><path d="M3 6h6l2 2h10v11H3z" /></>,
	tag: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="7.5" r="1.2" /></>,
	arrow: <><path d="M5 12h14m-6-6 6 6-6 6" /></>,
	print: <><path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="7" y="14" width="10" height="7" /></>,
	refresh: <><path d="M20 11a8 8 0 1 0-2 6M20 5v6h-6" /></>,
	sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></>,
	moon: <><path d="M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10z" /></>,
	monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>,
	logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
	grip: <><circle cx="9" cy="6" r="1.3" /><circle cx="15" cy="6" r="1.3" /><circle cx="9" cy="12" r="1.3" /><circle cx="15" cy="12" r="1.3" /><circle cx="9" cy="18" r="1.3" /><circle cx="15" cy="18" r="1.3" /></>,
	eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
	eyeOff: <><path d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.4 5.2A10.8 10.8 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.4 4.2M6.3 6.4A17 17 0 0 0 2 12s4 7 10 7a10 10 0 0 0 3-.5" /></>,
	wallet: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M10 15h4" /></>,
	user: <><circle cx="12" cy="8" r="4" /><path d="M6 21v-2a4 4 0 0 1 12 0v2" /></>,
};

export default function AppIcon({ name, size = 18, className = '', strokeWidth = 1.8 }) {
	return (
		<svg
			className={`appIcon ${className}`}
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={strokeWidth}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{PATHS[name] ?? PATHS.task}
		</svg>
	);
}
