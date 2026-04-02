import LogoMark from './LogoMark.jsx';

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
	const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
	return {
		x: centerX + radius * Math.cos(angleInRadians),
		y: centerY + radius * Math.sin(angleInRadians),
	};
}

function describeArc(centerX, centerY, radius, startAngle, endAngle) {
	const start = polarToCartesian(centerX, centerY, radius, endAngle);
	const end = polarToCartesian(centerX, centerY, radius, startAngle);
	const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
	return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export default function CircularClock({
	now = new Date(),
	title = 'System time',
	subtitle = '',
}) {
	const hours = now.getHours() % 12;
	const minutes = now.getMinutes();
	const seconds = now.getSeconds();

	const timeRings = [
		{
			label: 'second',
			value: seconds / 60,
			color: '#ff4d8d',
			radius: 74,
			width: 16,
		},
		{
			label: 'minute',
			value: (minutes + seconds / 60) / 60,
			color: '#a855f7',
			radius: 56,
			width: 14,
		},
		{
			label: 'hour',
			value: (hours + minutes / 60) / 12,
			color: '#ef4444',
			radius: 38,
			width: 12,
		},
	];

	return (
		<div className="watchClockCard">
			<div className="clockFaceWrap">
				<svg
					className="watchFace"
					viewBox="0 0 200 200"
					role="img"
					aria-label={title}
				>
					<circle
						cx="100"
						cy="100"
						r="86"
						className="watchFaceOuter"
					/>

					{Array.from({ length: 12 }, (_, index) => {
						const angle = index * 30;
						const start = polarToCartesian(100, 100, 80, angle);
						const end = polarToCartesian(100, 100, index % 3 === 0 ? 70 : 74, angle);
						return (
							<line
								key={angle}
								className="watchTick"
								x1={start.x}
								y1={start.y}
								x2={end.x}
								y2={end.y}
							/>
						);
					})}

					{timeRings.map((ring) => (
						<g key={ring.label}>
							<circle
								cx="100"
								cy="100"
								r={ring.radius}
								fill="none"
								stroke="rgba(255,255,255,0.08)"
								strokeWidth={ring.width}
							/>
							<path
								d={describeArc(100, 100, ring.radius, 0, ring.value * 360)}
								fill="none"
								stroke={ring.color}
								strokeWidth={ring.width}
								strokeLinecap="round"
							/>
						</g>
					))}
				</svg>
				<div className="clockCenterMark">
					<LogoMark />
				</div>
			</div>

			<div className="watchCaption">
				<div className="watchCaptionTitle">{title}</div>
				{subtitle ? <div className="watchCaptionSubtitle">{subtitle}</div> : null}
			</div>
		</div>
	);
}
