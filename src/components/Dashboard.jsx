import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { ThumbsUp, Plus, Calendar, MapPin, Trash2 } from 'lucide-react'

export default function Dashboard({ session, profile }) {
    const [event, setEvent] = useState(null)
    const [topics, setTopics] = useState([])
    const [dateOptions, setDateOptions] = useState([])
    const [newTopic, setNewTopic] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchActiveEvent()
    }, [])

    async function fetchActiveEvent() {
        try {
            setLoading(true)
            const res = await api.getEvent();
            if (res.error) {
                alert(`Chyba načítání: ${res.error}`);
            }
            const eventData = res.event;
            setEvent(eventData)

            if (eventData) {
                // Normalizace ID - může přijít jako 'id' nebo 'ID' nebo 'Id'
                const eventId = eventData.id || eventData.ID || eventData.Id;
                if (eventId) {
                    fetchTopics(eventId)
                    fetchDateOptions(eventId)
                } else {
                    console.error('Event ID not found in data:', eventData);
                }
            }
        } catch (error) {
            console.error('Error fetching event:', error.message)
            alert(`Chyba připojení: ${error.message}`);
        } finally {
            setLoading(false)
        }
    }

    async function fetchTopics(eventId) {
        const data = await api.getTopics(eventId);
        setTopics(data || [])
    }

    async function fetchDateOptions(eventId) {
        const data = await api.getDateOptions(eventId);
        setDateOptions(data || [])
    }

    async function handleAddTopic(e) {
        e.preventDefault()
        if (!newTopic.trim() || votingId) return
        setVotingId('new-topic')
        try {
            const res = await api.addTopic(event.id, newTopic, session.user.id);
            if (res.error) alert(res.error)
            else {
                setNewTopic('')
                fetchTopics(event.id)
            }
        } finally {
            setVotingId(null)
        }
    }

    const [votingId, setVotingId] = useState(null)

    async function toggleVote(topicId) {
        if (votingId) return
        setVotingId(topicId)
        // Optimistická aktualizace
        const oldTopics = [...topics];
        setTopics(prev => prev.map(t => {
            if (t.id === topicId) {
                const votes = t.votes || [];
                const hasVoted = votes.some(v => String(v.profile_id).toLowerCase() === String(session.user.id).toLowerCase());
                return {
                    ...t,
                    votes: hasVoted
                        ? votes.filter(v => String(v.profile_id).toLowerCase() !== String(session.user.id).toLowerCase())
                        : [...votes, { profile_id: session.user.id }]
                };
            }
            return t;
        }));

        try {
            const res = await api.toggleTopicVote(topicId, session.user.id);
            if (res.error) {
                setTopics(oldTopics); // Rollback
                alert(`Nepodařilo se hlasovat: ${res.error}`);
            } else {
                await fetchTopics(event.id); // Tichá synchronizace
            }
        } catch (err) {
            setTopics(oldTopics); // Rollback
            alert(`Chyba sítě: ${err.message}`);
        } finally {
            setVotingId(null)
        }
    }

    async function handleDeleteTopic(topicId) {
        if (!confirm('Opravdu chcete toto téma smazat?')) return
        try {
            const res = await api.deleteTopic(topicId);
            if (res.error) alert(`Nepodařilo se smazat téma: ${res.error}`)
            else await fetchTopics(event.id)
        } catch (err) {
            alert(`Chyba sítě: ${err.message}`)
        }
    }

    async function toggleDateVote(optionId) {
        if (votingId) return;
        setVotingId(optionId)

        // Optimistická aktualizace
        const oldOptions = [...dateOptions];
        setDateOptions(prev => prev.map(o => {
            if (o.id === optionId) {
                const votes = o.votes || [];
                const hasVoted = votes.some(v => String(v.profile_id).toLowerCase() === String(session.user.id).toLowerCase());
                return {
                    ...o,
                    votes: hasVoted
                        ? votes.filter(v => String(v.profile_id).toLowerCase() !== String(session.user.id).toLowerCase())
                        : [...votes, { profile_id: session.user.id }]
                };
            }
            return o;
        }));

        try {
            const res = await api.toggleDateVote(optionId, session.user.id);
            if (res.error) {
                setDateOptions(oldOptions); // Rollback
                alert(`Nepodařilo se hlasovat o termínu: ${res.error}`);
            } else {
                await fetchDateOptions(event.id); // Tichá synchronizace
            }
        } catch (err) {
            setDateOptions(oldOptions); // Rollback
            alert(`Chyba sítě: ${err.message}`);
        } finally {
            setVotingId(null)
        }
    }

    if (loading) return <div className="text-center py-12">Načítám událost...</div>
    if (!event) return <div className="text-center py-12">Momentálně není naplánovaná žádná událost.</div>

    return (
        <div className="space-y-8 transition-opacity">
            {/* Event Header */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-4xl font-black mb-4 tracking-tighter">{event.title}</h2>
                    <p className="text-slate-400 text-lg mb-6 max-w-2xl">{event.description}</p>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                            <MapPin size={16} className="text-pink-500" />
                            {event.venue}
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 blur-[100px] -mr-32 -mt-32"></div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Topics Section */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <Plus size={20} className="text-purple-400" /> Navržená témata
                        </h3>
                    </div>

                    <form onSubmit={handleAddTopic} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Navrhni téma..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                            value={newTopic}
                            onChange={(e) => setNewTopic(e.target.value)}
                        />
                        <button type="submit" className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                            {votingId === 'new-topic' ? '...' : 'Přidat'}
                        </button>
                    </form>

                    <div className="space-y-3">
                        {topics.length === 0 && <p className="text-slate-500 text-sm">Zatím žádná témata. Buď první!</p>}
                        {topics.map(topic => (
                            <div
                                key={topic.id}
                                className={`bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-start justify-between gap-4 transition-opacity ${votingId === topic.id ? 'opacity-50 pointer-events-none' : ''}`}
                            >
                                <div>
                                    <p className="text-white font-medium mb-1">{topic.text || topic.label || 'Bez textu'}</p>
                                    <p className="text-xs text-slate-500">Navrhl/a {topic.author?.name || 'Anonym'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => toggleVote(topic.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${topic.votes?.some(v => String(v.profile_id).toLowerCase() === String(session.user.id).toLowerCase())
                                            ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                                            : 'border-slate-700 text-slate-400 hover:border-slate-600'
                                            }`}
                                    >
                                        <ThumbsUp size={14} />
                                        <span className="text-xs font-bold">{topic.votes?.length || 0}</span>
                                    </button>
                                    {profile?.is_admin && (
                                        <button
                                            onClick={() => handleDeleteTopic(topic.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-500 transition-colors"
                                            title="Smazat téma"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Date Voting Section */}
                <section className="space-y-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Calendar size={20} className="text-pink-400" /> Hlasování o termínu
                    </h3>

                    <div className="space-y-3">
                        {dateOptions.map(option => {
                            const isSelected = option.votes?.some(v => String(v.profile_id).toLowerCase() === String(session.user.id).toLowerCase());
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => toggleDateVote(option.id)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${votingId === option.id ? 'opacity-50 pointer-events-none' : ''
                                        } ${isSelected
                                            ? 'bg-pink-600/20 border-pink-500 ring-2 ring-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.2)]'
                                            : 'bg-slate-900 border-slate-800 hover:border-pink-500/50 hover:bg-slate-800/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-pink-500 border-pink-500' : 'border-slate-700 group-hover:border-pink-500/50'}`}>
                                            {isSelected && <Plus size={14} className="text-white rotate-45" />}
                                        </div>
                                        <span className={`font-semibold text-lg ${isSelected ? 'text-pink-100' : 'text-slate-300'}`}>
                                            {(() => {
                                                const label = option.label || option.termin || option.datum || option.text || option.Label || option.Kdy || option.kdy;
                                                if (label) return label;
                                                const fallback = Object.entries(option).find(([k, v]) =>
                                                    typeof v === 'string' && v.length > 2 && !['id', 'event_id', 'profile_id'].includes(k.toLowerCase())
                                                );
                                                return fallback ? fallback[1] : 'Termín neuveden';
                                            })()}
                                        </span>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${isSelected ? 'bg-pink-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                                        {option.votes?.length || 0} hlasů
                                    </div>
                                </button>
                            );
                        })}
                        {dateOptions.length === 0 && <p className="text-slate-500 text-sm italic py-4">Pro tuto událost nejsou vypsány žádné termíny hlasování.</p>}
                    </div>
                </section>
            </div>
        </div>
    )
}
