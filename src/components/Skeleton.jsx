export function SkeletonLine({ width = '100%', height = '1rem', style = {} }) {
	return (
		<div
			className="skeleton-line"
			style={{
				width,
				height,
				background: 'linear-gradient(90deg, var(--bg-subtle, rgba(255,255,255,0.05)) 25%, var(--bg-hover, rgba(255,255,255,0.1)) 50%, var(--bg-subtle, rgba(255,255,255,0.05)) 75%)',
				backgroundSize: '200% 100%',
				animation: 'skeleton-shimmer 1.5s infinite',
				borderRadius: '6px',
				...style,
			}}
		/>
	);
}

export function SkeletonCard({ lines = 3, style = {} }) {
	return (
		<div
			className="card"
			style={{ padding: '1.5rem', ...style }}
		>
			<div className="stack" style={{ gap: '0.75rem' }}>
				<SkeletonLine width="40%" height="1.25rem" />
				{Array.from({ length: lines }).map((_, i) => (
					<SkeletonLine
						key={i}
						width={i === lines - 1 ? '60%' : '100%'}
						height="0.875rem"
					/>
				))}
			</div>
		</div>
	);
}

export function SkeletonPage() {
	return (
		<div className="pageContent">
			<SkeletonCard lines={1} style={{ marginBottom: '1rem' }} />
			<div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
				{Array.from({ length: 4 }).map((_, i) => (
					<SkeletonCard key={i} lines={1} />
				))}
			</div>
			<SkeletonCard lines={5} />
		</div>
	);
}
