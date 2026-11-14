import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("GeoVision Error Boundary Caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0e17', color: 'white', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>GeoVision temporarily unavailable</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '400px', marginBottom: '24px' }}>
            A rendering or data error occurred while initializing the 3D environment.
          </p>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
            {this.props.onClose && (
              <button className="btn btn-secondary" onClick={this.props.onClose}>Return to Dashboard</button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
