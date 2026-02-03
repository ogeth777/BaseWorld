import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
            color: '#ff4444', 
            padding: '20px', 
            background: 'rgba(0,0,0,0.9)', 
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'monospace'
        }}>
          <h1>Something went wrong.</h1>
          <p>{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
                marginTop: '20px',
                padding: '10px 20px',
                background: '#0052FF',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                borderRadius: '4px'
            }}
          >
            RELOAD PAGE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
