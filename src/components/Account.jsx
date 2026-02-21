import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Account({ session }) {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState({
        name: '',
        bio: '',
        phone: '',
        consent_given: false
    })

    useEffect(() => {
        getProfile()
    }, [session])

    async function getProfile() {
        try {
            setLoading(true)
            const { user } = session

            let { data, error, status } = await supabase
                .from('profiles')
                .select(`name, bio`)
                .eq('id', user.id)
                .single()

            if (error && status !== 406) {
                throw error
            }

            if (data) {
                // Also fetch private contact info
                let { data: contactData } = await supabase
                    .from('private_contacts')
                    .select(`phone, consent_given`)
                    .eq('id', user.id)
                    .single()

                setProfile({
                    name: data.name,
                    bio: data.bio || '',
                    phone: contactData?.phone || '',
                    consent_given: contactData?.consent_given || false
                })
            }
        } catch (error) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    async function updateProfile(e) {
        e.preventDefault()

        try {
            setLoading(true)
            const { user } = session

            const profileUpdates = {
                id: user.id,
                name: profile.name,
                bio: profile.bio,
            }


            const contactUpdates = {
                id: user.id,
                email: user.email,
                phone: profile.phone,
                consent_given: profile.consent_given,
                consent_at: profile.consent_given ? new Date() : null,
            }

            let { error: profileError } = await supabase.from('profiles').upsert(profileUpdates)
            if (profileError) throw profileError

            let { error: contactError } = await supabase.from('private_contacts').upsert(contactUpdates)
            if (contactError) throw contactError

            alert('Profil byl úspěšně uložen!')
            window.location.reload() // Refresh to update App state
        } catch (error) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-center">Dokončete svůj profil</h2>
            <form onSubmit={updateProfile} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-300">Jméno</label>
                    <input
                        type="text"
                        required
                        className="mt-1 block w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300">Bio (nepovinné)</label>
                    <textarea
                        className="mt-1 block w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        rows="3"
                        maxLength="140"
                        placeholder="Co tě přivedlo?"
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300">Telefon</label>
                    <input
                        type="tel"
                        required
                        className="mt-1 block w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                </div>
                <div className="flex items-start space-x-3 py-4">
                    <input
                        id="consent"
                        type="checkbox"
                        required
                        className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-800 text-purple-600 focus:ring-purple-500"
                        checked={profile.consent_given}
                        onChange={(e) => setProfile({ ...profile, consent_given: e.target.checked })}
                    />
                    <label htmlFor="consent" className="text-xs text-slate-400 leading-tight">
                        Souhlasím s tím, že mé kontaktní údaje budou použity výhradně k organizaci setkání komunity Vibe Coding Ostrava.
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 transition-all"
                >
                    {loading ? 'Ukládám...' : 'Uložit profil'}
                </button>
            </form>
        </div>
    )
}
