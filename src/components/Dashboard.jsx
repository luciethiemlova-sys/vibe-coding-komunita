import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { getAvatarById } from '../lib/avatars'
import { ThumbsUp, ThumbsDown, Plus, Calendar, MapPin, Trash2, UsersIcon, LayoutGrid, MessageSquare } from 'lucide-react'

export default function Dashboard({ session, profile }) {
    const [activeTab, setActiveTab] = useState('meetings')
    const [event, setEvent] = useState(null)
    const [topics, setTopics] = useState([])
    const [dateOptions, setDateOptions] = useState([])
    const [newTopic, setNewTopic] = useState('')
    const [loadingEvent, setLoadingEvent] = useState(true)
    
    // Users state
    const [members, setMembers] = useState([])
    const [loadingMembers, setLoadingMembers] = useState(false)

    useEffect(() => {
        fetchActiveEvent()
    }, [])

    useEffect(() => {
        if (activeTab === 'users' && members.length === 0) {
            fetchMembers()
        }
    }, [activeTab])

    async function fetchActiveEvent() {
        try {
            setLoadingEvent(true)
            const res = await api.getEvent();
            if (res.error) {
                alert(`Chyba načítání: ${res.error}`);
            }
            const eventData = res.event;
            setEvent(eventData)

            if (eventData) {
                const eventId = eventData.id || eventData.ID || eventData.Id;
                if (eventId) {
                    fetchTopics(eventId)
                    fetchDateOptions(eventId)
                }
            }
        } catch (error) {
            console.error('Error fetching event:', error.message)
            alert(`Chyba připojení: ${error.message}`);
        } finally {
            setLoadingEvent(false)
        }
    }

    async function fetchTopics(eventId) {
        const data = await api.getTopics(eventId);
        if (Array.isArray(data)) setTopics(data);
        else setTopics([]);
    }

    async function fetchDateOptions(eventId) {
        const data = await api.getDateOptions(eventId);
        if (Array.isArray(data)) setDateOptions(data);
        else setDateOptions([]);
    }

    async function fetchMembers() {
        setLoadingMembers(true)
        const data = await api.getMembers()
        if (Array.isArray(data)) setMembers(data);
        else setMembers([]);
        setLoadingMembers(false)
    }

    const [votingId, setVotingId] = useState(null)
    
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

    async function toggleVote(topicId, voteType = 1) {
        const oldTopics = [...topics];
        setTopics(prev => prev.map(t => {
            if (t.id === topicId) {
                const votes = t.votes || [];
                const existingVote = votes.find(v => 
                    String(v.profile_id || v.id || "").toLowerCase() === String(session?.user?.id || "").toLowerCase()
                );
                
                let newVotes;
                if (existingVote) {
                    const currentVoteType = parseInt(existingVote.vote_type) || 1;
                    if (currentVoteType === voteType) {
                        newVotes = votes.filter(v => 
                            String(v.profile_id || v.id || "").toLowerCase() !== String(session?.user?.id || "").toLowerCase()
                        );
                    } else {
                        newVotes = votes.map(v => 
                            String(v.profile_id || v.id || "").toLowerCase() === String(session?.user?.id || "").toLowerCase() 
                            ? { ...v, vote_type: voteType } : v
                        );
                    }
                } else {
                    newVotes = [...votes, { profile_id: session?.user?.id, vote_type: voteType }];
                }
                return { ...t, votes: newVotes };
            }
            return t;
        }));

        try {
            const res = await api.toggleTopicVote(topicId, session.user.id, voteType);
            if (res?.error) {
                setTopics(oldTopics); 
                alert(`Nepodařilo se hlasovat: ${res.error}`);
            } else {
                await fetchTopics(event.id);
            }
        } catch (err) {
            setTopics(oldTopics);
            alert(`Chyba sítě: ${err.message}`);
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
                setDateOptions(oldOptions);
                alert(`Nepodařilo se hlasovat o termínu: ${res.error}`);
            } else {
                await fetchDateOptions(event.id);
            }
        } catch (err) {
            setDateOptions(oldOptions);
            alert(`Chyba sítě: ${err.message}`);
        }
    }

    async function handleDeleteMember(memberId) {
        if (!confirm('Opravdu chcete tohoto uživatele smazat? Tato akce je nevratná.')) return;
        setLoadingMembers(true);
        try {
            const res = await api.deleteMember(memberId);
            if (res.error) alert(`Chyba při mazání: ${res.error}`);
            else await fetchMembers();
        } catch (err) {
            alert(`Chyba sítě: ${err.message}`);
        } finally {
            setLoadingMembers(false);
        }
    }

    if (loadingEvent && activeTab === 'meetings') return <div className="text-center py-12">Načítám událost...</div>

    return (
        <div className="space-y-8">
            {/* Tabs Navigation */}
            <div className="flex justify-center border-b border-slate-800">
                <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'users' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'}`}
                    >
                        <UsersIcon size={18} /> Uživatelé
                    </button>
                    <button
                        onClick={() => setActiveTab('meetings')}
                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'meetings' ? 'border-pink-500 text-pink-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'}`}
                    >
                        <Calendar size={18} /> Setkání
                    </button>
                    <button
                        onClick={() => setActiveTab('topics')}
                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'topics' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'}`}
                    >
                        <MessageSquare size={18} /> Témata
                    </button>
                </nav>
            </div>

            {/* TAB CONTENT: USERS */}
            {activeTab === 'users' && (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <UsersIcon className="text-purple-400" /> Komunita
                    </h2>
                    {loadingMembers ? (
                        <div className="text-center py-8 text-slate-400">Načítám uživatele...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {members.map(member => (
                                <div key={member.id} className="bg-slate-800 p-5 rounded-xl flex flex-col justify-between border border-slate-700 hover:border-purple-500/50 transition-all group shadow-lg">
                                    <div className="mb-4">
                                        <div className="flex items-start gap-4 mb-4">
                                            {(() => {
                                                const avatar = getAvatarById(member.photo);
                                                if (avatar) {
                                                    return (
                                                        <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-3xl shadow-inner">
                                                            {avatar.char}
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-xl font-bold text-slate-500 shadow-inner">
                                                        {member.name?.substring(0, 1) || '?'}
                                                    </div>
                                                );
                                            })()}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className="font-bold text-lg text-white truncate">{member.name || 'Anonym'}</h3>
                                                    {(String(member.is_admin).toLowerCase() === 'true' || member.is_admin === true) && (
                                                        <span className="shrink-0 text-[8px] uppercase font-black tracking-wider bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30">Admin</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-slate-500 truncate font-mono">{member.id}</p>
                                                {member.phone && (
                                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                                                        <span className="text-purple-500">📞</span> {member.phone}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {member.bio && (
                                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                                                <p className="text-sm text-slate-300 leading-relaxed italic line-clamp-3">"{member.bio}"</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-700/50">
                                        <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">
                                            Vibe Member
                                        </span>
                                        {profile?.is_admin && String(member.id).toLowerCase() !== String(session.user.id).toLowerCase() && (
                                            <button 
                                                onClick={() => handleDeleteMember(member.id)}
                                                className="text-slate-500 hover:text-red-400 transition-colors"
                                                title="Smazat uživatele"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {members.length === 0 && <p className="text-slate-500">Žádní uživatelé nenalezeni.</p>}
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENT: MEETINGS */}
            {activeTab === 'meetings' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {!event ? (
                        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">Momentálně není naplánovaná žádná událost.</div>
                    ) : (
                        <>
                            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden">
                                <div className="relative z-10">
                                    <h2 className="text-4xl font-black mb-4 tracking-tighter">{event.title}</h2>
                                    <p className="text-slate-400 text-lg mb-6 max-w-2xl">{event.description}</p>
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                                            <MapPin size={16} className="text-pink-500" />
                                            {event.venue || 'Místo bude upřesněno'}
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-pink-600/10 blur-[100px] -mr-32 -mt-32 pointer-events-none"></div>
                            </section>

                            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
                                <h3 className="text-xl font-bold flex items-center gap-2 mb-6">
                                    <Calendar size={20} className="text-pink-400" /> Termíny a Hlasování
                                </h3>
                                <div className="space-y-3 max-w-2xl">
                                    {dateOptions.map(option => {
                                        const isSelected = option.votes?.some(v => String(v.profile_id).toLowerCase() === String(session.user.id).toLowerCase());
                                        return (
                                            <button
                                                key={option.id}
                                                onClick={() => toggleDateVote(option.id)}
                                                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between group ${isSelected
                                                    ? 'bg-pink-600/20 border-pink-500 ring-2 ring-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.2)]'
                                                    : 'bg-slate-800 border-slate-700 hover:border-pink-500/50 hover:bg-slate-800/80'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-pink-500 border-pink-500' : 'border-slate-600 group-hover:border-pink-500/50'}`}>
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
                                                <div className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${isSelected ? 'bg-pink-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                    {option.votes?.length || 0} hlasů
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {dateOptions.length === 0 && <p className="text-slate-500 text-sm italic py-4">Pro tuto událost nejsou vypsány žádné termíny hlasování.</p>}
                                </div>
                            </section>
                        </>
                    )}
                </div>
            )}

            {/* TAB CONTENT: TOPICS */}
            {activeTab === 'topics' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {!event ? (
                        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">Událost nenalezena, nelze přidávat témata.</div>
                    ) : (
                        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold flex items-center gap-2 text-white">
                                        <MessageSquare size={24} className="text-indigo-400" /> Témata k diskuzi
                                    </h3>
                                    <p className="text-slate-400 text-sm mt-1">Hlasuj pro témata, která tě nejvíc zajímají. Vítězné téma vybereme na další sraz.</p>
                                </div>
                            </div>

                            <form onSubmit={handleAddTopic} className="flex gap-2 mb-8">
                                <input
                                    type="text"
                                    placeholder="Navrhni vlastní téma (např. 'React Hooks do hloubky')..."
                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-500"
                                    value={newTopic}
                                    onChange={(e) => setNewTopic(e.target.value)}
                                />
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-lg font-bold text-sm transition-colors shadow-lg shadow-indigo-500/20">
                                    {votingId === 'new-topic' ? '...' : 'Přidat téma'}
                                </button>
                            </form>

                            <div className="space-y-4">
                                {topics.length === 0 && (
                                    <p className="text-slate-500 text-sm py-8 text-center bg-slate-800/50 rounded-xl border border-slate-800 border-dashed">
                                        Zatím žádná témata. Buď první, kdo nějaké přidá!
                                    </p>
                                )}
                                {topics.sort((a,b) => {
                                    const aScore = (a.votes||[]).reduce((acc, v) => acc + (parseInt(v.vote_type)||1), 0);
                                    const bScore = (b.votes||[]).reduce((acc, v) => acc + (parseInt(v.vote_type)||1), 0);
                                    return bScore - aScore;
                                }).map(topic => {
                                    const topicVotes = topic.votes || [];
                                    const myVote = topicVotes.find(v => 
                                        String(v.profile_id || v.id || "").toLowerCase() === String(session?.user?.id || "").toLowerCase()
                                    );
                                    const myVoteType = myVote ? (parseInt(myVote.vote_type) || 1) : 0;
                                    
                                    const upvotes = topicVotes.filter(v => (parseInt(v.vote_type) || 1) > 0).length;
                                    const downvotes = topicVotes.filter(v => parseInt(v.vote_type) < 0).length;
                                    const score = upvotes - downvotes;

                                    return (
                                        <div
                                            key={topic.id}
                                            className="bg-slate-800 border border-slate-700 p-5 rounded-xl flex items-start justify-between gap-4 transition-all hover:border-indigo-500/30 group"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className={`text-lg font-bold ${score > 0 ? 'text-green-400' : score < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                                                        {score > 0 ? '+' : ''}{score}
                                                    </span>
                                                    <p className="text-white font-medium text-lg">{topic.text || topic.label || 'Bez textu'}</p>
                                                </div>
                                                <p className="text-sm text-slate-500 ml-10">od {topic.author?.name || 'Anonyma'}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {/* Upvote Button */}
                                                <button
                                                    onClick={() => toggleVote(topic.id, 1)}
                                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all ${myVoteType === 1
                                                        ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                                                        : 'border-slate-600 text-slate-400 hover:border-green-500/50 hover:text-green-400 bg-slate-900'
                                                        }`}
                                                >
                                                    <ThumbsUp size={16} className={myVoteType === 1 ? 'fill-current' : ''} />
                                                    <span className="text-xs font-bold">{upvotes}</span>
                                                </button>
                                                
                                                {/* Downvote Button */}
                                                <button
                                                    onClick={() => toggleVote(topic.id, -1)}
                                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-all ${myVoteType === -1
                                                        ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                                                        : 'border-slate-600 text-slate-400 hover:border-red-500/50 hover:text-red-400 bg-slate-900'
                                                        }`}
                                                >
                                                    <ThumbsDown size={16} className={myVoteType === -1 ? 'fill-current' : ''} />
                                                    <span className="text-xs font-bold">{downvotes}</span>
                                                </button>

                                                {/* Admin Delete */}
                                                {profile?.is_admin && (
                                                    <button
                                                        onClick={() => handleDeleteTopic(topic.id)}
                                                        className="ml-2 p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Smazat téma"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    )
}
