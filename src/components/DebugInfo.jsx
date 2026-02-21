import React from 'react'
import { supabase } from '../lib/supabase'

export default function DebugInfo({ session, profile, loading }) {
    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#0f0',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '10px',
            zIndex: 9999,
            maxWidth: '300px',
            border: '1px solid #0f0'
        }}>
            <h3 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #0f0' }}>DEBUG INFO</h3>
            <p>Loading: {loading ? 'YES' : 'NO'}</p>
            <p>Session: {session ? 'Logged In' : 'Logged Out'}</p>
            <p>Profile: {profile ? 'Found' : 'Not Found'}</p>
            <p>URL: {import.meta.env.VITE_SUPABASE_URL ? 'OK' : 'MISSING'}</p>
            <p>Key: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'OK' : 'MISSING'}</p>
            <button
                onClick={() => window.location.reload()}
                style={{ background: '#0f0', color: '#000', border: 'none', padding: '2px 5px', cursor: 'pointer', marginTop: '5px' }}
            >
                HARD REFRESH
            </button>
        </div>
    )
}
