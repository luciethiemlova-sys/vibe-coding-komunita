import React, { useState } from 'react'

export default function Auth({ onLogin }) {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email) return
        setLoading(true)
        await onLogin(email)
        setLoading(false)
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
            <div className="w-full max-w-md space-y-8 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl">
                <div className="text-center">
                    <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        Vibe Coding Ostrava
                    </h1>
                    <p className="mt-4 text-slate-400">
                        Zadej svůj e-mail pro vstup do komunity.
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
                        {loading ? 'Přihlašuji...' : 'Vstoupit'}
                    </button>
                    <p className="text-[10px] text-center text-slate-500 italic">
                        * Přihlášení je zcela zdarma a bezpečné přes Google Sheets backend.
                    </p>
                </form>
            </div>
        </div>
    )
}
