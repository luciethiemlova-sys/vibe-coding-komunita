import React, { useState } from 'react'
import { api } from '../lib/api'

export default function UserProfile({ session, profile: initialProfile, onUpdate, onCancel }) {
    const [loading, setLoading] = useState(false)

    // Split existing name if any
    const existingName = initialProfile?.name || '';
    const nameParts = existingName.split(' ');
    const initialFirstName = nameParts[0] || '';
    const initialLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const [profile, setProfile] = useState({
        firstName: initialFirstName,
        lastName: initialLastName,
        bio: initialProfile?.bio || '',
    })

    async function updateProfile(e) {
        e.preventDefault()
        try {
            setLoading(true)

            // Spojíme jméno a příjmení
            const fullName = `${profile.firstName.trim()} ${profile.lastName.trim()}`.trim();

            await api.saveProfile(session.user.id, fullName, profile.bio)

            const updatedProfile = { ...initialProfile, name: fullName, bio: profile.bio };
            onUpdate(updatedProfile);
            localStorage.setItem('vibe_profile', JSON.stringify(updatedProfile));

            alert('Profil byl úspěšně aktualizován!')
            onCancel() // Return to dashboard
        } catch (error) {
            alert('Chyba při aktualizaci profilu.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl text-white">
            <h2 className="text-2xl font-bold mb-6 text-center">Můj Profil</h2>
            <form onSubmit={updateProfile} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Jméno</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            value={profile.firstName}
                            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300">Příjmení</label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                            value={profile.lastName}
                            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300">Bio (nepovinné)</label>
                    <textarea
                        className="mt-1 block w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none"
                        rows="3"
                        maxLength="140"
                        placeholder="Co tě přivedlo?"
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    />
                </div>

                <div className="pt-4 flex gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 py-3 px-4 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 transition-all"
                    >
                        {loading ? 'Ukládám...' : 'Uložit změny'}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-3 px-4 rounded-lg font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition-all border border-slate-700"
                    >
                        Zrušit
                    </button>
                </div>
            </form>
        </div>
    )
}
