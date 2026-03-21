import React, { useState, useEffect } from 'react'
import { api } from './lib/api'
import Auth from './components/Auth'
import Account from './components/Account'
import Dashboard from './components/Dashboard'
import UserProfile from './components/UserProfile'
import { getAvatarById } from './lib/avatars'
import DebugInfo from './components/DebugInfo'

import './index.css'

function App() {
    const [session, setSession] = useState(() => {
        const saved = localStorage.getItem('vibe_session');
        return saved ? JSON.parse(saved) : null;
    })
    const [profile, setProfile] = useState(() => {
        const saved = localStorage.getItem('vibe_profile');
        return saved ? JSON.parse(saved) : null;
    })
    const [loading, setLoading] = useState(!session)
    const [showAdmin, setShowAdmin] = useState(false)
    const [showProfile, setShowProfile] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        
        if (token) {
            setLoading(true);
            api.verifyToken(token).then(res => {
                if (res.session && res.profile) {
                    setSession(res.session);
                    setProfile(res.profile);
                    localStorage.setItem('vibe_session', JSON.stringify(res.session));
                    localStorage.setItem('vibe_profile', JSON.stringify(res.profile));
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    alert('Chyba ověření: ' + (res.error || 'Neplatný odkaz'));
                }
                setLoading(false);
            }).catch(err => {
                alert('Chyba serveru: ' + err.message);
                setLoading(false);
            });
        } else if (session && !profile) {
            // Re-fetch profile if session exists but profile doesn't
            setLoading(true);
            api.login(session.user.id).then(res => {
                if (res.profile) setProfile(res.profile);
                setLoading(false);
            }).catch(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [])

    const handleLogin = async (email) => {
        setLoading(true);
        try {
            const res = await api.login(email);
            if (res.session) {
                setSession(res.session);
                setProfile(res.profile);
                localStorage.setItem('vibe_session', JSON.stringify(res.session));
                localStorage.setItem('vibe_profile', JSON.stringify(res.profile));
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('Chyba při přihlašování.');
        } finally {
            setLoading(false);
        }
    }

    const handleLogout = () => {
        setSession(null);
        setProfile(null);
        localStorage.removeItem('vibe_session');
        localStorage.removeItem('vibe_profile');
    }

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p>Načítám aplikaci...</p>
        </div>
    )

    if (!session) {
        return <Auth />
    }

    if (!profile || !profile.name) {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
                <Account session={session} profile={profile} onUpdate={(p) => setProfile(p)} />
            </div>
        )
    }

    const isAdmin = profile?.is_admin === true || String(profile?.is_admin).toLowerCase() === 'true';



    if (showProfile) {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
                <UserProfile 
                    session={session} 
                    profile={profile} 
                    onUpdate={(p) => setProfile(p)} 
                    onCancel={() => setShowProfile(false)} 
                />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-12">
                    <div className="flex items-center gap-6">
                        <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                            Vibe Coding Ostrava
                        </h1>
                        {isAdmin && (
                            <button
                                onClick={() => setShowAdmin(true)}
                                className="px-3 py-1 bg-purple-600/20 border border-purple-500/50 rounded-full text-[10px] font-black uppercase tracking-wider text-purple-400 hover:bg-purple-600 hover:text-white transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                            >
                                Admin Panel
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowProfile(true)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                        >
                            {(() => {
                                const avatar = getAvatarById(profile?.photo);
                                if (avatar) {
                                    return <div className="w-8 h-8 flex items-center justify-center text-xl">{avatar.char}</div>;
                                }
                                return (
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] border border-slate-700">
                                        {profile?.name?.substring(0, 1) || '?'}
                                    </div>
                                );
                            })()}
                            <span>Můj profil</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors border-l border-slate-800 pl-4"
                        >
                            Odhlásit se
                        </button>
                    </div>
                </header>
                <main>
                    <Dashboard session={session} profile={profile} />
                </main>
            </div>
            {isAdmin && <DebugInfo session={session} profile={profile} loading={loading} />}
        </div>
    )
}

export default App
