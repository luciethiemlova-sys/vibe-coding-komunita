import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'

export default function Account({ session, profile: initialProfile, onUpdate }) {
    const [loading, setLoading] = useState(false)
    const [profile, setProfile] = useState({
        name: initialProfile?.name || '',
        bio: initialProfile?.bio || '',
        phone: '', // Google Sheets version handles phone/consent in the same profiles sheet for simplicity
        consent_given: false
    })

    async function updateProfile(e) {
        e.preventDefault()
        try {
            setLoading(true)
            await api.saveProfile(session.user.id, profile.name, profile.bio)

            const updatedProfile = { ...initialProfile, name: profile.name, bio: profile.bio };
            onUpdate(updatedProfile);
            localStorage.setItem('vibe_profile', JSON.stringify(updatedProfile));

            alert('Profil byl úspěšně uložen!')
        } catch (error) {
            alert('Chyba při ukládání profilu.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl text-white">
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
