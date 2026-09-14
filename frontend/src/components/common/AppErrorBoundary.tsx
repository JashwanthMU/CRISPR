import React from 'react';

interface State {
  error: Error | null;
}

export default class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('CRISPR frontend render failure', error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    const chunkFailure = /dynamically imported module|loading chunk|failed to fetch/i.test(this.state.error.message);
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--color-bg)' }}>
        <section className="card" role="alert" style={{ width: 'min(520px, 100%)', textAlign: 'center', padding: 28 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>CRISPR could not load this view</h1>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {chunkFailure
              ? 'A newer application version is available. Reload to use the current dashboard files.'
              : 'The dashboard received data it could not display. Reload the view; your organization data has not been changed.'}
          </p>
          <button className="btn-primary" onClick={this.reload}>Reload application</button>
        </section>
      </main>
    );
  }
}
