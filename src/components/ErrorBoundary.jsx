import React from 'react'

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', backgroundColor: '#1a1a1a', color: '#ff4d4d', minHeight: '100vh', fontFamily: 'sans-serif' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Něco se pokazilo 😵</h1>
                    <p style={{ marginTop: '10px', color: '#ccc' }}>Aplikace narazila na chybu:</p>
                    <pre style={{ backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '8px', overflowX: 'auto', marginTop: '10px' }}>
                        {this.state.error?.message}
                    </pre>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#333', color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer' }}
                    >
                        Zkusit znovu načíst
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
