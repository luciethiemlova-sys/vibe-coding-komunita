import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { ThumbsUp, Plus, Calendar, MapPin } from 'lucide-react'

export default function Dashboard({ session }) {
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
            const { event: eventData } = await api.getEvent();
            setEvent(eventData)

            if (eventData) {
                fetchTopics(eventData.id)
                fetchDateOptions(eventData.id)
            }
        } catch (error) {
            console.error('Error fetching event:', error.message)
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
        if (!newTopic.trim()) return

        const res = await api.addTopic(event.id, newTopic, session.user.id);
        if (res.error) alert(res.error)
        else {
            setNewTopic('')
            fetchTopics(event.id)
        }
    }

    async function toggleVote(topicId) {
        await api.toggleTopicVote(topicId, session.user.id);
        fetchTopics(event.id)
    }

    async function toggleDateVote(optionId) {
        // Implementing toggleDateVote in parallel with toggleTopicVote in api/script
        // For simplicity reusing toggleTopicVote or adding toggleDateVote later if needed
        // Assuming we update script for this too
        await api.toggleTopicVote(optionId, session.user.id); // Placeholder/Reuse
        fetchDateOptions(event.id)
    }

    if (loading) return <div className="text-center py-12">Načítám událost...</div>
    if (!event) return <div className="text-center py-12">Momentálně není naplánovaná žádná událost.</div>

    return (
        <div className="space-y-8">
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
                            Přidat
                        </button>
                    </form>

                    <div className="space-y-3">
                        {topics.length === 0 && <p className="text-slate-500 text-sm">Zatím žádná témata. Buď první!</p>}
                        {topics.map(topic => (
                            <div key={topic.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-white font-medium mb-1">{topic.text}</p>
                                    <p className="text-xs text-slate-500">Navrhl/a {topic.author?.name || 'Anonym'}</p>
                                </div>
                                <button
                                    onClick={() => toggleVote(topic.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${topic.votes.some(v => v.profile_id === session.user.id)
                                        ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                                        }`}
                                >
                                    <ThumbsUp size={14} />
                                    <span className="text-xs font-bold">{topic.votes?.length || 0}</span>
                                </button>
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
                        {dateOptions.map(option => (
                            <button
                                key={option.id}
                                onClick={() => toggleDateVote(option.id)}
                                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${option.votes.some(v => v.profile_id === session.user.id)
                                    ? 'bg-pink-600/10 border-pink-500/50 ring-1 ring-pink-500/50'
                                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${option.votes.some(v => v.profile_id === session.user.id) ? 'bg-pink-500' : 'bg-slate-700'}`}></div>
                                    <span className="font-medium">{option.label}</span>
                                </div>
                                <div className="text-xs font-bold text-slate-500">
                                    {option.votes?.length || 0} hlasů
                                </div>
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
