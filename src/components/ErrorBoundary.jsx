import React from 'react';

export default class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error) {
		return { hasError: true, error };
	}

	componentDidCatch(error, errorInfo) {
		console.error('ErrorBoundary caught:', error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="pageContent">
					<div className="card">
						<div className="stack" style={{ gap: 12, textAlign: 'center', padding: '2rem' }}>
							<h2 style={{ color: 'var(--danger, #f43f5e)' }}>Something went wrong</h2>
							<p className="subtle">{this.state.error?.message || 'An unexpected error occurred.'}</p>
							<button
								className="btn primary"
								type="button"
								onClick={() => {
									this.setState({ hasError: false, error: null });
									window.location.reload();
								}}
							>
								Reload page
							</button>
						</div>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
