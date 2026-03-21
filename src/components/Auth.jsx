import React, { useState } from 'react'
import { api } from '../lib/api'

export default function Auth() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [sent, setSent] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email) return
        setLoading(true)
        const appUrl = window.location.origin + window.location.pathname;
        try {
            const res = await api.sendMagicLink(email, appUrl);
            if (res && res.success) {
                setSent(true)
            } else {
                alert('Chyba při odesílání e-mailu: ' + (res?.error || 'Neznámá chyba'))
            }
        } catch (err) {
            alert('Chyba spojení se serverem: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (sent) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
                <div className="w-full max-w-md space-y-8 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter text-white">
                        Odkaz odeslán!
                    </h1>
                    <p className="mt-4 text-slate-400">
                        Zkontroluj si e-mailovou schránku na adrese <strong>{email}</strong> a klikni na přihlašovací odkaz.
                    </p>
                    <p className="text-xs text-slate-500 mt-6">
                        (Může to chvíli trvat. Zkontroluj i složku Hromadné nebo Spam.)
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
            <div className="w-full max-w-md space-y-8 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
                <div className="text-center">
                    <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        Vibe Coding Ostrava
                    </h1>
                    <p className="mt-4 text-slate-400">
                        Zadej svůj e-mail pro zaslání přihlašovacího odkazu.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                            E-mailová adresa
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            className="mt-1 block w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                            placeholder="tvuj@email.cz"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                    >
                        {loading ? 'Odesílám odkaz...' : 'Zaslat přihlašovací odkaz'}
                    </button>
                    <p className="text-[10px] text-center text-slate-500 italic">
                        * Bezpečné přihlášení bez nutnosti hesla (Magic Link).
                    </p>
                </form>
            </div>
        </div>
    )
}
