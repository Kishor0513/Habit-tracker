import { NavLink, useLocation } from 'react-router-dom';
import AppIcon from './AppIcon.jsx';
import LogoMark from './LogoMark.jsx';
import { useLifeData } from '../state/useLifeData.js';
import { isoToday } from '../lib/date.js';

export const NAV_GROUPS = [
	{
		label: 'Overview',
		items: [
			{ to: '/home', label: 'Home', icon: 'home', hint: 'Your dashboard' },
			{ to: '/', label: 'My Day', icon: 'pulse', hint: 'Execute today', end: true },
			{ to: '/calendar', label: 'Calendar', icon: 'calendar', hint: 'Everything on a timeline' },
		],
	},
	{
		label: 'Organize',
		items: [
			{ to: '/tasks', label: 'Tasks', icon: 'task', hint: 'Plan and ship' },
			{ to: '/projects', label: 'Projects', icon: 'target', hint: 'Goals and milestones' },
			{ to: '/habits', label: 'Habits', icon: 'habit', hint: 'Build systems' },
			{ to: '/notes', label: 'Notes', icon: 'note', hint: 'Capture ideas' },
		],
	},
	{
		label: 'Money',
		items: [
			{ to: '/finance', label: 'Finance', icon: 'finance', hint: 'Accounts and budgets' },
			{ to: '/invoices', label: 'Invoices', icon: 'invoice', hint: 'Clients and billing' },
		],
	},
	{
		label: 'Insight',
		items: [
			{ to: '/analytics', label: 'Analytics', icon: 'chart', hint: 'Patterns and progress' },
			{ to: '/review', label: 'Review', icon: 'review', hint: 'Reflect on today' },
			{ to: '/settings', label: 'Settings', icon: 'settings', hint: 'Tune' },
		],
	},
];

export const MOBILE_NAV = [
	{ to: '/home', label: 'Home', icon: 'home' },
	{ to: '/', label: 'Day', icon: 'pulse' },
	{ to: '/tasks', label: 'Tasks', icon: 'task' },
	{ to: '/notes', label: 'Notes', icon: 'note' },
	{ to: '/finance', label: 'Finance', icon: 'finance' },
];

export function routeTitle(pathname) {
	const all = NAV_GROUPS.flatMap((group) => group.items);
	const exact = all.find((item) => item.to === pathname);
	if (exact) return exact.label;
	const extra = {
		'/review/weekly': 'Weekly Review',
	};
	return extra[pathname] ?? 'LifeOS';
}

function useCounts() {
	const { data } = useLifeData();
	const today = isoToday();
	const tasks = data?.tasks ?? [];
	return {
		myDay: tasks.filter((task) => {
			if (!task || task.status === 'done') return false;
			const due = task.dueDate === today;
			const start = task.startDate && task.startDate <= today;
			const pinned = task.tags?.includes('my-day');
			return due || start || pinned;
		}).length,
	};
}

export default function AppSidebar({ collapsed, onToggleCollapse, onCreate }) {
	const counts = useCounts();
	const ownerLinks = {
		github: 'https://github.com/kishorchaudhary',
		website: 'https://kishorchaudhary.com.np',
		socials: 'https://instagram.com/kishor0513',
	};

	return (
		<aside className={`sidebarArea ${collapsed ? 'isCollapsed' : ''}`}>
			<div className="sidebarHeader">
				<div className="sidebarBrand">
					<div className="sidebarAvatar" aria-hidden="true">
						<LogoMark size={26} />
					</div>
					{!collapsed && (
						<div className="sidebarBrandText">
							<span className="sidebarEyebrow">✨ Personal</span>
							<span className="sidebarWorkspace"><span className="gradientText">LifeOS</span></span>
						</div>
					)}
				</div>
				<button
					className="themeToggleBtn"
					onClick={onToggleCollapse}
					aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
				>
					{collapsed ? '→' : '←'}
				</button>
			</div>

			{!collapsed && onCreate && (
				<button className="btn primary sidebarCreate" type="button" onClick={onCreate}>
					<AppIcon name="plus" size={15} /> Quick create
				</button>
			)}

			<nav className="navGroup" aria-label="Main navigation">
				{NAV_GROUPS.map((group) => (
					<div className="navSection" key={group.label}>
						{!collapsed && <div className="navGroupLabel">{group.label}</div>}
						{group.items.map((item) => (
							<NavLink
								key={item.to}
								to={item.to}
								end={item.end}
								title={item.hint}
								className={({ isActive }) =>
									`navItem ${isActive ? 'isActive' : ''} ${collapsed ? 'isCompact' : ''}`
								}
							>
								<span className="navIcon" aria-hidden="true">
									<AppIcon name={item.icon} />
								</span>
								{!collapsed && <span className="navItemLabel">{item.label}</span>}
								{!collapsed && item.to === '/tasks' && counts.myDay > 0 && (
									<span className="navCount">{counts.myDay}</span>
								)}
							</NavLink>
						))}
					</div>
				))}
			</nav>

			<div className="sidebarFooter">
				<div className="sidebarFooterLine">🌱 Build steady systems.</div>
				<div className="sidebarFooterLinks">
					<a
						href={ownerLinks.github}
						target="_blank"
						rel="noopener noreferrer"
					>GitHub</a>
					<a
						href={ownerLinks.website}
						target="_blank"
						rel="noopener noreferrer"
					>Website</a>
					<a
						href={ownerLinks.socials}
						target="_blank"
						rel="noopener noreferrer"
					>Socials</a>
				</div>
				<div className="sidebarFooterMeta">LifeOS · local-first</div>
			</div>
		</aside>
	);
}

export function MobileNav() {
	const location = useLocation();
	return (
		<nav className="mobileNav" aria-label="Mobile navigation">
			{MOBILE_NAV.map((item) => (
				<NavLink
					key={item.to}
					to={item.to}
					end={item.to === '/'}
					className={({ isActive }) =>
						`mobileNavItem ${isActive ? 'isActive' : ''}`
					}
				>
					<span className="mobileNavItemIcon">
						<AppIcon name={item.icon} />
					</span>
					<span className="mobileNavItemLabel">{item.label}</span>
				</NavLink>
			))}
		</nav>
	);
}