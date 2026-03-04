import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Calendar, Users, Plus, Trash2, ArrowLeft, Download } from 'lucide-react'

export default function AdminDashboard({ onBack }) {
    const [events, setEvents] = useState([])
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('events') // 'events' or 'members'

    // New Event State
    const [newTitle, setNewTitle] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [newVenue, setNewVenue] = useState('Sbeerka, Ostrava-Poruba')

    useEffect(() => {
        fetchData()
    }, [view])

    async function fetchData() {
        setLoading(true)
        try {
            if (view === 'events') {
                const data = await api.getEvents();
                setEvents(data || [])
            } else {
                const data = await api.getMembers();
                setMembers(data || [])
            }
        } catch (err) {
            console.error('Error fetching admin data:', err);
        } finally {
            setLoading(false)
        }
    }

    async function handleCreateEvent(e) {
        e.preventDefault()
        const res = await api.createEvent({
            title: newTitle,
            description: newDesc,
            venue: newVenue
        });

        if (res.error) alert(res.error)
        else {
            setNewTitle('')
            setNewDesc('')
            fetchData()
        }
    }

    async function toggleEventStatus(id, currentStatus) {
        // Simple toggle logic for Google Sheets (implementing as needed)
        alert('Tato funkce bude v Google Sheets verzi dostupná brzy. Prozatím upravte přímo v tabulce.');
    }

    async function deleteEvent(id) {
        if (confirm('Opravdu chcete tuto událost smazat? Smažte ji prosím přímo v Google Tabulce pro jistotu.')) {
            // Simplified delete guidance for now
        }
    }

    const exportToCSV = () => {
        const headers = ['Jmeno', 'Email', 'Bio']
        const rows = members.map(m => [
            m.name,
            m.id,
            m.bio || ''
        ])

        const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'vibe_coding_clenove.csv'
        link.click()
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                        <h1 className="text-3xl font-black tracking-tighter">Admin Panel</h1>
                    </div>

                    <nav className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                        <button
                            onClick={() => setView('events')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${view === 'events' ? 'bg-purple-600' : 'hover:bg-slate-800'}`}
                        >
                            <Calendar size={18} /> Události
                        </button>
                        <button
                            onClick={() => setView('members')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${view === 'members' ? 'bg-purple-600' : 'hover:bg-slate-800'}`}
                        >
                            <Users size={18} /> Členové
                        </button>
                    </nav>
                </header>

                {view === 'events' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Create Event Form */}
                        <section className="bg-slate-900 border border-slate-800 p-6 rounded-2xl h-fit">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Plus className="text-purple-500" /> Nová událost
                            </h2>
                            <form onSubmit={handleCreateEvent} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Název</label>
                                    <input
                                        type="text" required value={newTitle}
                                        onChange={e => setNewTitle(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Popis</label>
                                    <textarea
                                        required value={newDesc}
                                        onChange={e => setNewDesc(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2" rows="3"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Místo</label>
                                    <input
                                        type="text" required value={newVenue}
                                        onChange={e => setNewVenue(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2"
                                    />
                                </div>
                                <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-lg font-bold transition-all">
                                    Vytvořit událost
                                </button>
                            </form>
                        </section>

                        {/* Events List */}
                        <section className="lg:col-span-2 space-y-4">
                            <h2 className="text-xl font-bold mb-4">Historie událostí</h2>
                            {loading ? <p>Načítám...</p> : events.map(ev => (
                                <div key={ev.id} className={`p-6 rounded-2xl border transition-all ${ev.is_active ? 'bg-purple-600/10 border-purple-500' : 'bg-slate-900 border-slate-800'}`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-bold">{ev.title}</h3>
                                                {ev.is_active && <span className="text-[10px] bg-purple-500 px-2 py-0.5 rounded-full font-black uppercase">Aktivní</span>}
                                            </div>
                                            <p className="text-slate-400 text-sm mt-1">{ev.venue}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => toggleEventStatus(ev.id, ev.is_active)}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold border ${ev.is_active ? 'border-slate-700 hover:bg-slate-800' : 'border-purple-500 bg-purple-600 hover:bg-purple-500'}`}
                                            >
                                                {ev.is_active ? 'Deaktivovat' : 'Aktivovat'}
                                            </button>
                                            <button onClick={() => deleteEvent(ev.id)} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-300 italic">Created: {new Date(ev.created_at).toLocaleDateString()}</p>
                                </div>
                            ))}
                        </section>
                    </div>
                ) : (
                    <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Registrovaní členové ({members.length})</h2>
                            <button
                                onClick={exportToCSV}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold transition-all"
                            >
                                <Download size={18} /> Export CSV
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-950 text-slate-500 text-xs font-bold uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Jméno</th>
                                        <th className="px-6 py-4">Kontakt (E-mail)</th>
                                        <th className="px-6 py-4">Bio</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {members.map(m => (
                                        <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold">{m.name}</div>
                                                <div className="text-[10px] text-slate-500">{new Date(m.created_at).toLocaleDateString()}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm">{m.id}</div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-sm text-slate-300 truncate" title={m.bio}>{m.bio || '-'}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>
        </div>
    )
}
