export default function LogoMark({ size = 22 }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 64 64"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<rect
				x="3"
				y="3"
				width="58"
				height="58"
				rx="18"
				fill="currentColor"
				fillOpacity="0.22"
				stroke="currentColor"
				strokeOpacity="0.4"
				strokeWidth="2"
			/>
			<path
				d="M19 33L28 42L45 22"
				stroke="currentColor"
				strokeWidth="6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
