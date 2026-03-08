import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Calendar, Users, Plus, Trash2, ArrowLeft, Download } from 'lucide-react'

export default function AdminDashboard({ onBack }) {
    const [events, setEvents] = useState([])
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('events') // 'events' or 'members'

    const [newTitle, setNewTitle] = useState('')
    const [newDesc, setNewDesc] = useState('')
    const [newVenue, setNewVenue] = useState('Sbeerka, Ostrava-Poruba')
    const [newDates, setNewDates] = useState(['', '', '']) // Start with 3 empty slots
    const [editingEvent, setEditingEvent] = useState(null)
    const [eventDetails, setEventDetails] = useState({ topics: [], dates: [] })

    useEffect(() => {
        fetchData()
    }, [view])

    async function fetchData() {
        setLoading(true)
        try {
            // VŽDY načteme události i členy, abychom měli data pro výsledky
            const [eventsData, membersData] = await Promise.all([
                api.getEvents(),
                api.getMembers()
            ]);

            const allEvents = eventsData || [];
            const allMembers = membersData || [];

            setEvents(allEvents);
            setMembers(allMembers);

            // Fetch details for the active event to show results
            // Robustnější kontrola is_active (zvládne true i "TRUE")
            const activeEvent = allEvents.find(e =>
                e.is_active === true ||
                String(e.is_active).toLowerCase() === 'true'
            );

            if (activeEvent) {
                const [topics, dates] = await Promise.all([
                    api.getTopics(activeEvent.id),
                    api.getDateOptions(activeEvent.id)
                ]);
                setEventDetails({ topics: topics || [], dates: dates || [] });
            } else {
                setEventDetails({ topics: [], dates: [] });
            }
        } catch (err) {
            console.error('Error fetching admin data:', err);
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setLoading(true)
        try {
            if (editingEvent) {
                const res = await api.updateEvent(editingEvent.id, {
                    title: newTitle,
                    description: newDesc,
                    venue: newVenue
                });
                if (res.error) alert(res.error)
                else {
                    alert('Událost byla úspěšně aktualizována!')
                    handleCancelEdit()
                    fetchData()
                }
            } else {
                const res = await api.createEvent({
                    title: newTitle,
                    description: newDesc,
                    venue: newVenue,
                    dates: newDates.filter(d => d.trim() !== '')
                });

                if (res.error) alert(res.error)
                else {
                    setNewTitle('')
                    setNewDesc('')
                    setNewDates(['', '', ''])
                    fetchData()
                    alert('Událost s hlasováním byla úspěšně vytvořena!')
                }
            }
        } catch (err) {
            alert('Chyba: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleEditClick = (ev) => {
        setEditingEvent(ev)
        setNewTitle(ev.title || '')
        setNewDesc(ev.description || '')
        setNewVenue(ev.venue || 'Sbeerka, Ostrava-Poruba')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleCancelEdit = () => {
        setEditingEvent(null)
        setNewTitle('')
        setNewDesc('')
        setNewVenue('Sbeerka, Ostrava-Poruba')
        setNewDates(['', '', ''])
    }

    const handleDateChange = (index, value) => {
        const updatedDates = [...newDates]
        updatedDates[index] = value
        setNewDates(updatedDates)
    }

    const addDateField = () => {
        setNewDates([...newDates, ''])
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
                                {editingEvent ? <Plus className="text-pink-500 rotate-45" /> : <Plus className="text-purple-500" />}
                                {editingEvent ? 'Upravit událost' : 'Nová událost'}
                            </h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
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
                                {!editingEvent && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Možnosti termínů</label>
                                        <div className="space-y-2">
                                            {newDates.map((date, index) => (
                                                <input
                                                    key={index}
                                                    type="text"
                                                    placeholder={`Termín ${index + 1} (např. Pondělí 18:00)`}
                                                    value={date}
                                                    onChange={e => handleDateChange(index, e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm"
                                                />
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addDateField}
                                            className="mt-2 text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Přidat další termín
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-500 py-3 rounded-lg font-bold transition-all disabled:opacity-50">
                                        {editingEvent ? 'Uložit změny' : 'Vytvořit událost'}
                                    </button>
                                    {editingEvent && (
                                        <button
                                            type="button"
                                            onClick={handleCancelEdit}
                                            className="px-4 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-all"
                                        >
                                            Zrušit
                                        </button>
                                    )}
                                </div>
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
                                                onClick={() => handleEditClick(ev)}
                                                className="px-3 py-1 rounded-lg text-xs font-bold border border-slate-700 hover:bg-slate-800 transition-colors"
                                            >
                                                Upravit
                                            </button>
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

                        {/* Voting Results for Active Event */}
                        <section className="lg:col-span-3 space-y-8 mt-12 bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
                            <div>
                                <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                                    <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                                    Výsledky hlasování (Aktuální událost)
                                </h2>
                                <p className="text-slate-500 text-sm">Zde vidíte, kdo pro co hlasoval.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Date Results */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-pink-400 flex items-center gap-2">
                                        <Calendar size={20} /> Termíny
                                    </h3>
                                    <div className="space-y-4">
                                        {eventDetails.dates.map(opt => (
                                            <div key={opt.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="font-bold text-slate-200">
                                                        {(() => {
                                                            const val = opt.label || opt.text || 'Termín';
                                                            const d = new Date(val);
                                                            return isNaN(d.getTime()) ? val : d.toLocaleString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
                                                        })()}
                                                    </span>
                                                    <span className="bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded text-xs font-black">{opt.votes?.length || 0} HLASŮ</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {opt.votes?.map(v => {
                                                        const member = members.find(m => String(m.id).toLowerCase() === String(v.profile_id).toLowerCase());
                                                        return (
                                                            <span key={v.profile_id} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">
                                                                {member?.name || 'Vibe Coder'}
                                                            </span>
                                                        );
                                                    })}
                                                    {(!opt.votes || opt.votes.length === 0) && <span className="text-xs text-slate-600 italic">Zatím žádné hlasy</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Topic Results */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold text-purple-400 flex items-center gap-2">
                                        <Users size={20} /> Témata
                                    </h3>
                                    <div className="space-y-4">
                                        {eventDetails.topics.map(topic => (
                                            <div key={topic.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="font-bold text-slate-200">{topic.text || topic.label}</span>
                                                    <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs font-black">{topic.votes?.length || 0} HLASŮ</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {topic.votes?.map(v => {
                                                        const member = members.find(m => String(m.id).toLowerCase() === String(v.profile_id).toLowerCase());
                                                        return (
                                                            <span key={topic.id + v.profile_id} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">
                                                                {member?.name || 'Vibe Coder'}
                                                            </span>
                                                        );
                                                    })}
                                                    {(!topic.votes || topic.votes.length === 0) && <span className="text-xs text-slate-600 italic">Zatím žádné hlasy</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
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
