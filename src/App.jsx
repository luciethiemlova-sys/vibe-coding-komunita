import React, { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Account from './components/Account'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'
import DebugInfo from './components/DebugInfo'

import './index.css'




function App() {
    const [session, setSession] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        console.log('App mounting, fetching session...');
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('Session fetched:', session);
            setSession(session)
            if (session) checkProfile(session.user.id)
            else setLoading(false)
        }).catch(err => {
            console.error('Error fetching session:', err);
            setLoading(false);
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('Auth state change:', _event, session);
            setSession(session)
            if (session) checkProfile(session.user.id)
            else setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    async function checkProfile(userId) {
        console.log('Checking profile for user:', userId);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, is_admin')

                .eq('id', userId)
                .single()

            if (error) console.log('Profile fetch error (expected if new user):', error);
            if (data) {
                console.log('Profile found:', data);
                setProfile(data)
            }
        } catch (err) {
            console.error('Unexpected error checking profile:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <p>Načítám aplikaci...</p>
            <p className="text-xs text-slate-500 mt-2">Pokud toto vidíš déle než pár sekund, zkontroluj konzoli prohlížeče (F12).</p>
        </div>
    )


    if (!session) {
        return <Auth />
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
                <Account session={session} />
            </div>
        )
    }

    if (showAdmin && profile?.is_admin) {
        return <AdminDashboard onBack={() => setShowAdmin(false)} />
    }

    return (

        <div className="min-h-screen bg-slate-950 text-white p-8">
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-6">
                        <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                            Vibe Coding Ostrava
                        </h1>
                        {profile?.is_admin && (
                            <button
                                onClick={() => setShowAdmin(true)}
                                className="px-3 py-1 bg-purple-600/20 border border-purple-500/50 rounded-full text-[10px] font-black uppercase tracking-wider text-purple-400 hover:bg-purple-600 hover:text-white transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                            >
                                Admin Panel
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        Odhlásit se
                    </button>
                </header>
                <main>
                    <Dashboard session={session} />
                </main>
            </div>
            <DebugInfo session={session} profile={profile} loading={loading} />
        </div>
    )
}




export default App
