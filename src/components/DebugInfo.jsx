import React from 'react'

export default function DebugInfo({ session, profile, loading }) {
    const apiUrl = import.meta.env.VITE_API_URL;

    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            backgroundColor: 'rgba(0,0,0,0.85)',
            color: '#0f0',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '11px',
            zIndex: 9999,
            maxWidth: '300px',
            border: '1px solid #0f0',
            fontFamily: 'monospace'
        }}>
            <h3 style={{ margin: '0 0 8px 0', borderBottom: '1px solid #0f0', paddingBottom: '4px' }}>SHEETS DEBUG</h3>
            <div style={{ spaceY: '4px' }}>
                <p>Status: <span style={{ color: loading ? '#ff0' : '#0f0' }}>{loading ? 'Načítám...' : 'OK'}</span></p>
                <p>Uživatel: {session ? 'Přihlášen' : 'Anonym'}</p>
                <p>Profil: {profile ? 'Nalezen' : 'Chybí'}</p>
                <p>Backend: {apiUrl ? 'URL OK' : '!! CHYBÍ URL !!'}</p>
                {profile && <p>Role: {profile.is_admin ? 'ADMIN' : 'MEMBER'}</p>}
                {profile && <p>ID: {String(profile.id).substring(0, 10)}...</p>}
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                <button
                    onClick={() => window.location.reload()}
                    style={{ background: '#0f0', color: '#000', border: 'none', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
                >
                    REFRESH
                </button>
                <button
                    onClick={async () => {
                        const res = await fetch(`${apiUrl}?action=diagnostics`).then(r => r.json());
                        alert(JSON.stringify(res, null, 2));
                    }}
                    style={{ background: '#333', color: '#0f0', border: '1px solid #0f0', padding: '4px 8px', cursor: 'pointer', borderRadius: '4px' }}
                >
                    DIAG
                </button>
            </div>
        </div>
    )
}
