import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

try {
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </React.StrictMode>,
    )
} catch (error) {

    console.error(error);
    document.getElementById('root').innerHTML = `<div style="color: white; padding: 20px;">Chyba: ${error.message}</div>`;
}

