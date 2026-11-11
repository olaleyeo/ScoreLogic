import React, { useState, useEffect } from 'react';
import { Activity, Search, Sparkles, Bot, AlertTriangle, MapPin, ArrowLeft, GripHorizontal, X, Globe, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config';

const isLive = (statusShort) => {
    return ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(statusShort);
};

const isFinished = (statusShort) => {
    return ['FT', 'AET', 'PEN', 'AW', 'ABD', 'AWD', 'WO', 'CANC', 'PST', 'TBD'].includes(statusShort);
};

const getMatchProgress = (match) => {
    const elapsed = match.fixture.status.elapsed || 0;
    const short = match.fixture.status.short;
    if (short === 'HT') return 50;
    if (short === 'FT' || short === 'AET' || short === 'PEN') return 100;
    return Math.min(100, (elapsed / 90) * 100);
};

const formatCompetitionLabel = (name) => {
    if (!name) return 'International';
    if (name.toLowerCase() === 'friendlies') return 'International Friendly';
    return name;
};

const formatAiText = (text) => {
    if (!text) return null;
    const lines = text.split('\n');
    let inTable = false;
    let tableLines = [];
    const elements = [];

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('|')) {
            inTable = true;
            tableLines.push(line);
        } else {
            if (inTable) {
                elements.push(
                    <div key={`table-${index}`} className="font-mono text-xs md:text-sm bg-gray-50 dark:bg-gray-900/50 p-3 sm:p-4 rounded-xl overflow-x-auto my-3 border border-gray-200 dark:border-gray-700 shadow-inner whitespace-pre">
                        {tableLines.join('\n')}
                    </div>
                );
                inTable = false;
                tableLines = [];
            }

            if (!trimmed) {
                elements.push(<div key={index} className="h-2" />);
                return;
            }

            if (trimmed.startsWith('### ')) {
                elements.push(
                    <h4 key={index} className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mt-3 mb-1">
                        {trimmed.replace(/^###\s+/, '')}
                    </h4>
                );
                return;
            }
            if (trimmed.startsWith('## ')) {
                elements.push(
                    <h3 key={index} className="text-sm sm:text-base font-black text-gray-900 dark:text-white uppercase tracking-wide mt-3 mb-1.5">
                        {trimmed.replace(/^##\s+/, '')}
                    </h3>
                );
                return;
            }
            if (trimmed.startsWith('# ')) {
                elements.push(
                    <h2 key={index} className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-4 mb-2">
                        {trimmed.replace(/^#\s+/, '')}
                    </h2>
                );
                return;
            }

            const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
            const content = isBullet ? trimmed.replace(/^[-*]\s+/, '') : line;

            const parts = content.split(/(\*\*.*?\*\*)/g);
            const formattedLine = parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={pIdx} className="text-gray-900 dark:text-white font-bold">{part.slice(2, -2)}</strong>;
                }
                return part;
            });

            if (isBullet) {
                elements.push(
                    <div key={index} className="flex items-start gap-2 text-xs sm:text-sm py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                        <span className="flex-1">{formattedLine}</span>
                    </div>
                );
            } else {
                elements.push(
                    <div key={index} className="text-xs sm:text-sm py-0.5 leading-relaxed">
                        {formattedLine}
                    </div>
                );
            }
        }
    });

    if (inTable) {
        elements.push(
            <div key="table-end" className="font-mono text-xs md:text-sm bg-gray-50 dark:bg-gray-900/50 p-3 sm:p-4 rounded-xl overflow-x-auto my-3 border border-gray-200 dark:border-gray-700 shadow-inner whitespace-pre">
                {tableLines.join('\n')}
            </div>
        );
    }

    return elements;
};

const InternationalGames = () => {
    const [allMatches, setAllMatches] = useState([]);
    const [datesWithGames, setDatesWithGames] = useState([]);
    const [competitions, setCompetitions] = useState([]);
    const [windowRange, setWindowRange] = useState({ start: '', end: '' });
    const [loading, setLoading] = useState(true);

    const [selectedDate, setSelectedDate] = useState('all');
    const [selectedCompetition, setSelectedCompetition] = useState('all');
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState(null);

    const [aiAnalysis, setAiAnalysis] = useState({});
    const [mobileTab, setMobileTab] = useState('matches');

    // Generated International Slip states
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedMatches, setGeneratedMatches] = useState([]);
    const [showGeneratedSlip, setShowGeneratedSlip] = useState(false);
    const [savingSlip, setSavingSlip] = useState(false);
    const [slipMinConfidence, setSlipMinConfidence] = useState(70);
    const [totalEvaluatedCount, setTotalEvaluatedCount] = useState(0);

    const fetchInternationalMatches = async () => {
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const localDate = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
            const res = await fetch(`${API_BASE_URL}/api/matches/international?timezone=${encodeURIComponent(tz)}&date=${localDate}&days=9`);
            if (res.ok) {
                const data = await res.json();
                setAllMatches(data.matches || []);
                setDatesWithGames(data.datesWithGames || []);
                setCompetitions(data.competitions || []);
                setWindowRange({
                    start: data.windowStart || localDate,
                    end: data.windowEnd || localDate
                });
            }
        } catch (err) {
            console.error('Failed to fetch international matches:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInternationalMatches();
        const interval = setInterval(fetchInternationalMatches, 3 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleGenerateInternationalSlip = async () => {
        setIsGenerating(true);
        setGeneratedMatches([]);
        setShowGeneratedSlip(false);

        try {
            const localDate = new Date().toLocaleDateString('en-CA');
            const response = await fetch(`${API_BASE_URL}/api/matches/international/generate-slip`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: localDate,
                    days: 9,
                    filterDate: selectedDate,
                    competitionId: selectedCompetition === 'all' ? null : Number(selectedCompetition),
                    minConfidence: 70,
                    maxGames: 20
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate International AI slip');
            }

            const uniqueMatches = Array.from(
                new Map((data.matches || []).map(m => [m.matchId, m])).values()
            )
                .sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0))
                .slice(0, 20);

            setTotalEvaluatedCount(data.totalEvaluated || uniqueMatches.length);
            setGeneratedMatches(uniqueMatches);
            setShowGeneratedSlip(true);
        } catch (err) {
            console.error('Error generating International slip:', err);
            alert('Failed to generate International slip: ' + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const activeSlipMatches = generatedMatches
        .filter(m => (Number(m.confidence) || 0) >= slipMinConfidence)
        .slice(0, 20);

    const handleRemoveSlipMatch = (matchId) => {
        setGeneratedMatches(prev => prev.filter(m => m.matchId !== matchId));
    };

    const handleCopyGeneratedSlip = () => {
        if (activeSlipMatches.length === 0) return;
        const totalOdds = activeSlipMatches.reduce((acc, m) => acc * (m.marketOdds || 1.0), 1);
        let text = `AI International Slip (${activeSlipMatches.length} games)\n------------------\n`;
        activeSlipMatches.forEach(m => {
            text += `${m.homeTeam} vs ${m.awayTeam} (${formatCompetitionLabel(m.league)})\n`;
            text += `Market: ${m.selectedMarket} | AI Confidence: ${m.confidence}%\n`;
            if (m.expectedCorners) text += `Expected Corners: ${m.expectedCorners}\n`;
            text += `Market Odds: ${Number(m.marketOdds || 1).toFixed(2)}\n`;
            if (m.reasoning) text += `Reason: ${m.reasoning}\n`;
            text += `\n`;
        });
        text += `Total Slip Odds: ${totalOdds.toFixed(2)}`;
        navigator.clipboard.writeText(text);
        alert('AI International Slip copied to clipboard!');
    };

    const handleSaveSlip = async () => {
        if (activeSlipMatches.length === 0) return;
        setSavingSlip(true);
        try {
            const todayFormatted = new Date().toLocaleDateString('en-CA');
            const totalOdds = activeSlipMatches.reduce((acc, m) => acc * (m.marketOdds || 1.0), 1);

            const payload = {
                date: todayFormatted,
                type: 'custom',
                totalOdds: parseFloat(totalOdds.toFixed(2)),
                matches: activeSlipMatches
            };

            const response = await fetch(`${API_BASE_URL}/api/slips/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to save slip');
            alert('Generated AI International Slip saved successfully! You can view it in the History page.');
            setShowGeneratedSlip(false);
        } catch (err) {
            alert(err.message);
        } finally {
            setSavingSlip(false);
        }
    };

    const handleAiAnalysis = async (e, match) => {
        e.stopPropagation();
        if (aiAnalysis[match.fixture.id]?.text || aiAnalysis[match.fixture.id]?.error) {
            setAiAnalysis(prev => {
                const next = { ...prev };
                delete next[match.fixture.id];
                return next;
            });
            return;
        }
        setAiAnalysis(prev => ({ ...prev, [match.fixture.id]: { loading: true, text: null, error: null } }));
        try {
            const res = await fetch(`${API_BASE_URL}/api/matches/${match.fixture.id}/predict`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch AI analysis');
            setAiAnalysis(prev => ({ ...prev, [match.fixture.id]: { loading: false, text: data.analysis, error: null } }));
        } catch (err) {
            setAiAnalysis(prev => ({ ...prev, [match.fixture.id]: { loading: false, text: null, error: err.message } }));
        }
    };

    const fetchMatchStats = async (match) => {
        setStatsLoading(true);
        setStatsError(null);
        try {
            const matchId = match.fixture.id;
            const statsRes = await fetch(`${API_BASE_URL}/api/matches/${matchId}/stats`);
            if (!statsRes.ok) throw new Error('Failed to fetch match statistics');
            const statsData = await statsRes.json();

            const combinedStats = [];
            if (statsData.statistics && statsData.statistics.length === 2) {
                const homeStats = statsData.statistics[0].statistics;
                const awayStats = statsData.statistics[1].statistics;
                homeStats.forEach((hStat, index) => {
                    const aStat = awayStats[index];
                    if (hStat && aStat && hStat.value !== null && aStat.value !== null) {
                        combinedStats.push({
                            name: hStat.type,
                            home: hStat.value,
                            away: aStat.value
                        });
                    }
                });
            }

            setStats({
                matchInfo: match,
                statisticsItems: combinedStats
            });
            setMobileTab('stats');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setStatsError(err.message || 'Failed to load statistics');
        } finally {
            setStatsLoading(false);
        }
    };

    const filteredMatches = allMatches.filter(m => {
        const short = m.fixture.status.short;

        if (selectedDate !== 'all') {
            const matchDate = (m.fixture.date || '').split('T')[0];
            if (matchDate !== selectedDate) return false;
        }

        if (selectedCompetition !== 'all') {
            if (Number(m.league.id) !== Number(selectedCompetition)) return false;
        }

        if (filter === 'scheduled') {
            if (isFinished(short)) return false;
            if (new Date(m.fixture.date).getTime() < Date.now()) return false;
        }
        if (filter === 'finished' && !isFinished(short)) return false;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                m.teams.home.name.toLowerCase().includes(query) ||
                m.teams.away.name.toLowerCase().includes(query) ||
                m.league.name.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const formatDatePill = (dateStr) => {
        try {
            const d = new Date(`${dateStr}T12:00:00Z`);
            return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        } catch (_) {
            return dateStr;
        }
    };

    return (
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 relative">
            {/* Mobile Top Navigation Bar when viewing Match Details */}
            {mobileTab === 'stats' && stats && (
                <div className="lg:hidden flex items-center justify-between gap-2 mb-3 bg-white dark:bg-gray-800 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
                    <button
                        onClick={() => setMobileTab('matches')}
                        className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-2 rounded-xl active:scale-95 transition-all shrink-0"
                    >
                        <ArrowLeft size={16} />
                        <span>All International Matches</span>
                    </button>
                    <div className="flex items-center gap-1.5 min-w-0 px-2 text-right">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate uppercase tracking-wider">
                            {formatCompetitionLabel(stats.matchInfo.league.name)}
                        </span>
                    </div>
                </div>
            )}

            {/* Header & Primary Controls */}
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4 ${mobileTab === 'stats' ? 'hidden lg:flex' : 'flex'}`}>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                        <Globe className="text-indigo-600 dark:text-indigo-400 shrink-0" size={28} />
                        <span>International Games</span>
                        <span className="text-xs sm:text-sm font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                            {filteredMatches.length} National Matches
                        </span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium text-xs sm:text-sm mt-0.5 sm:mt-1">
                        Exclusively senior national team fixtures, qualifiers, Nations League &amp; international friendlies.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={handleGenerateInternationalSlip}
                        disabled={isGenerating || allMatches.length === 0}
                        className={`font-bold py-2.5 px-5 rounded-xl transition-all whitespace-nowrap shadow-xs text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer ${
                            isGenerating || allMatches.length === 0
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-98'
                        }`}
                    >
                        <Bot size={16} />
                        <span>{isGenerating ? 'Generating...' : 'Generate International Slip'}</span>
                    </button>
                    <div className="grid grid-cols-3 w-full sm:w-auto bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0">
                        {['all', 'scheduled', 'finished'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize text-center ${
                                    filter === f
                                        ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                {f === 'scheduled' ? 'Upcoming' : f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* International Window Date & Competition Filters */}
            {allMatches.length > 0 && (
                <div className={`flex flex-col gap-2.5 mb-5 ${mobileTab === 'stats' ? 'hidden lg:flex' : 'flex'}`}>
                    {/* Date Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1 mr-1 shrink-0">
                            <Calendar size={13} /> Window:
                        </span>
                        <button
                            onClick={() => setSelectedDate('all')}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                selectedDate === 'all'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-400'
                            }`}
                        >
                            All Window ({allMatches.length})
                        </button>
                        {datesWithGames.map(dateStr => {
                            const count = allMatches.filter(m => (m.fixture?.date || '').startsWith(dateStr)).length;
                            return (
                                <button
                                    key={dateStr}
                                    onClick={() => setSelectedDate(dateStr)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                        selectedDate === dateStr
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-400'
                                    }`}
                                >
                                    {formatDatePill(dateStr)} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Competition Pills */}
                    {competitions.length > 1 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mr-1 shrink-0">
                                Tournament:
                            </span>
                            <button
                                onClick={() => setSelectedCompetition('all')}
                                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                                    selectedCompetition === 'all'
                                        ? 'bg-violet-600 text-white shadow-xs'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-violet-400'
                                }`}
                            >
                                All Tournaments
                            </button>
                            {competitions.map(comp => (
                                <button
                                    key={comp.id}
                                    onClick={() => setSelectedCompetition(String(comp.id))}
                                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                                        String(selectedCompetition) === String(comp.id)
                                            ? 'bg-violet-600 text-white shadow-xs'
                                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-violet-400'
                                    }`}
                                >
                                    {comp.logo && (
                                        <img src={comp.logo} alt="" className="w-3.5 h-3.5 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                                    )}
                                    <span>{formatCompetitionLabel(comp.name)}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 pb-20">
                {/* Left Column: National Team Match List */}
                <div className={`lg:col-span-5 flex flex-col gap-3 sm:gap-4 ${mobileTab === 'stats' ? 'hidden lg:flex' : 'flex'}`}>
                    {stats && (
                        <div className="lg:hidden flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs">
                            <div className="flex items-center gap-2 truncate min-w-0">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
                                <span className="text-gray-600 dark:text-gray-300 truncate">
                                    Viewing: <strong className="text-indigo-600 dark:text-indigo-400">{stats.matchInfo.teams.home.name} vs {stats.matchInfo.teams.away.name}</strong>
                                </span>
                            </div>
                            <button
                                onClick={() => setMobileTab('stats')}
                                className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 ml-2"
                            >
                                View &rarr;
                            </button>
                        </div>
                    )}

                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search national teams (e.g. Brazil, England, Nigeria) or tournament..."
                            className="w-full pl-3.5 pr-10 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow-xs"
                        />
                        <Search className="absolute right-3 top-2.5 sm:top-3 text-gray-400" size={18} />
                    </div>

                    <div className="flex flex-col gap-2.5 sm:gap-3 max-h-[750px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                        {loading && allMatches.length === 0 ? (
                            <div className="flex items-center justify-center p-10">
                                <Activity size={24} className="animate-spin text-gray-400" />
                            </div>
                        ) : allMatches.length === 0 ? (
                            <div className="text-center p-8 sm:p-10 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 space-y-2">
                                <Globe size={36} className="mx-auto text-indigo-400 opacity-80" />
                                <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                    No Active International Break Games Right Now
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                                    This tab automatically populates during FIFA international windows, qualifiers, Nations League, and senior national team friendlies ({windowRange.start} to {windowRange.end}).
                                </p>
                            </div>
                        ) : filteredMatches.length === 0 ? (
                            <div className="text-center p-8 sm:p-10 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-sm">
                                No national team matches match your current filter.
                            </div>
                        ) : (
                            filteredMatches.map(match => (
                                <div
                                    key={match.fixture.id}
                                    className={`w-full shrink-0 relative overflow-hidden bg-white dark:bg-gray-800 border ${
                                        stats?.matchInfo?.fixture?.id === match.fixture.id
                                            ? 'border-indigo-500 dark:border-indigo-400 shadow-md ring-1 ring-indigo-500'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    } rounded-2xl cursor-pointer transition-all flex flex-col`}
                                >
                                    <div
                                        onClick={() => fetchMatchStats(match)}
                                        className="p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 relative select-none"
                                    >
                                        {isLive(match.fixture.status.short) && (
                                            <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-200 dark:bg-gray-700/50">
                                                <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${getMatchProgress(match)}%` }}></div>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-0.5 w-20 sm:w-24 shrink-0 justify-center text-center border-r border-gray-100 dark:border-gray-700 pr-2 sm:pr-3">
                                            <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                                                {new Date(match.fixture.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                            </span>
                                            {isLive(match.fixture.status.short) ? (
                                                <span className="text-[10px] sm:text-[11px] font-bold text-red-600 dark:text-red-400 uppercase flex flex-col items-center justify-center gap-0.5">
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                                        {match.fixture.status.elapsed ? `${match.fixture.status.elapsed}'` : 'LIVE'}
                                                    </div>
                                                </span>
                                            ) : isFinished(match.fixture.status.short) ? (
                                                <span className={`text-[10px] sm:text-[11px] font-bold uppercase ${['CANC', 'PST', 'TBD'].includes(match.fixture.status.short) ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                    {['FT', 'AET', 'PEN'].includes(match.fixture.status.short) ? 'FT' : match.fixture.status.short}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] sm:text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                                    {new Date(match.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </span>
                                            )}
                                            <span
                                                className="text-[9px] font-semibold text-indigo-500 dark:text-indigo-400 truncate max-w-full"
                                                title={formatCompetitionLabel(match.league.name)}
                                            >
                                                {formatCompetitionLabel(match.league.name)}
                                            </span>
                                        </div>

                                        <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 overflow-hidden">
                                            <div className="flex justify-between items-center font-bold text-gray-900 dark:text-white">
                                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                    <img src={match.teams.home.logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                                                    <span className="truncate text-xs sm:text-sm">{match.teams.home.name}</span>
                                                </div>
                                                <span className="text-sm sm:text-base ml-2 shrink-0">{match.goals.home !== null ? match.goals.home : '-'}</span>
                                            </div>
                                            <div className="flex justify-between items-center font-bold text-gray-900 dark:text-white">
                                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                    <img src={match.teams.away.logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
                                                    <span className="truncate text-xs sm:text-sm">{match.teams.away.name}</span>
                                                </div>
                                                <span className="text-sm sm:text-base ml-2 shrink-0">{match.goals.away !== null ? match.goals.away : '-'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Comprehensive Stats & AI Match Insight */}
                <div className={`lg:col-span-7 ${mobileTab === 'matches' ? 'hidden lg:block' : 'block'}`}>
                    {statsLoading ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 sm:p-10 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                            <Activity size={32} className="animate-spin text-indigo-500 mb-4" />
                            <p className="text-gray-500 text-sm font-medium">Loading national team statistics...</p>
                        </div>
                    ) : statsError ? (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 sm:p-6 text-red-600 flex items-center gap-3 text-sm">
                            <AlertTriangle className="shrink-0" /> {statsError}
                        </div>
                    ) : !stats ? (
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 sm:p-10 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                            <Globe size={44} className="text-gray-200 dark:text-gray-700 mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md text-sm">
                                Select any national team fixture from the list to view head-to-head statistics, venue details, and AI pre-match or live insights.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4 sm:space-y-6">
                            {/* Symmetrical Match Score Card */}
                            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                                <div className="text-center mb-3">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                                        {formatCompetitionLabel(stats.matchInfo.league.name)}
                                        {stats.matchInfo.league.round ? ` • ${stats.matchInfo.league.round}` : ''}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-2 sm:gap-4">
                                    {/* Home Nation */}
                                    <div className="flex-1 flex flex-col items-center text-center min-w-0">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 p-2 rounded-2xl bg-gray-50 dark:bg-gray-900/60 flex items-center justify-center shrink-0 mb-2 border border-gray-100 dark:border-gray-800">
                                            <img
                                                src={stats.matchInfo.teams.home.logo}
                                                className="w-full h-full object-contain"
                                                alt={stats.matchInfo.teams.home.name}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                        <span className="font-bold text-xs sm:text-base text-gray-900 dark:text-white leading-tight line-clamp-2 w-full">
                                            {stats.matchInfo.teams.home.name}
                                        </span>
                                    </div>

                                    {/* Score & Status */}
                                    <div className="px-2 sm:px-6 flex flex-col items-center shrink-0 z-10">
                                        <div className={`text-2xl sm:text-4xl font-black px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border tracking-tight ${
                                            isLive(stats.matchInfo.fixture.status.short)
                                                ? 'text-red-600 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-800'
                                                : 'text-gray-900 bg-gray-50 border-gray-200 dark:text-white dark:bg-gray-700/60 dark:border-gray-600'
                                        }`}>
                                            {stats.matchInfo.goals.home !== null ? stats.matchInfo.goals.home : '-'} : {stats.matchInfo.goals.away !== null ? stats.matchInfo.goals.away : '-'}
                                        </div>

                                        <div className="mt-2 text-center">
                                            {isLive(stats.matchInfo.fixture.status.short) ? (
                                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[11px] font-black uppercase">
                                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                                                    LIVE {stats.matchInfo.fixture.status.elapsed}'
                                                </div>
                                            ) : isFinished(stats.matchInfo.fixture.status.short) ? (
                                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold uppercase tracking-wider">
                                                    FULL TIME
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                                                    {new Date(stats.matchInfo.fixture.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Away Nation */}
                                    <div className="flex-1 flex flex-col items-center text-center min-w-0">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 p-2 rounded-2xl bg-gray-50 dark:bg-gray-900/60 flex items-center justify-center shrink-0 mb-2 border border-gray-100 dark:border-gray-800">
                                            <img
                                                src={stats.matchInfo.teams.away.logo}
                                                className="w-full h-full object-contain"
                                                alt={stats.matchInfo.teams.away.name}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                        <span className="font-bold text-xs sm:text-base text-gray-900 dark:text-white leading-tight line-clamp-2 w-full">
                                            {stats.matchInfo.teams.away.name}
                                        </span>
                                    </div>
                                </div>

                                {stats.matchInfo.fixture.venue?.name && (
                                    <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 text-center">
                                        <MapPin size={13} className="shrink-0 text-indigo-500" />
                                        <span className="truncate">
                                            {stats.matchInfo.fixture.venue.name}
                                            {stats.matchInfo.fixture.venue.city ? `, ${stats.matchInfo.fixture.venue.city}` : ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* AI Match Insight Card */}
                            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 shadow-xs space-y-3">
                                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/80">
                                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                        <Bot size={18} className="shrink-0" />
                                        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">AI National Match Insight</span>
                                    </div>
                                    {!aiAnalysis[stats.matchInfo.fixture.id]?.text && !aiAnalysis[stats.matchInfo.fixture.id]?.loading && (
                                        <button
                                            onClick={(e) => handleAiAnalysis(e, stats.matchInfo)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                                        >
                                            <Sparkles size={13} /> <span>Generate Insight</span>
                                        </button>
                                    )}
                                </div>

                                {aiAnalysis[stats.matchInfo.fixture.id]?.loading ? (
                                    <div className="flex items-center gap-2.5 text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 py-3 font-medium">
                                        <Activity size={16} className="animate-spin shrink-0" />
                                        <span>Analyzing national team form, squad call-ups, and tactical matchup...</span>
                                    </div>
                                ) : aiAnalysis[stats.matchInfo.fixture.id]?.error ? (
                                    <div className="text-xs sm:text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                                        {aiAnalysis[stats.matchInfo.fixture.id].error}
                                    </div>
                                ) : aiAnalysis[stats.matchInfo.fixture.id]?.text ? (
                                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-xs sm:text-sm">
                                        {formatAiText(aiAnalysis[stats.matchInfo.fixture.id].text)}
                                    </div>
                                ) : (
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                        Tap "Generate Insight" to analyze national team form, squad rotation, and expected match flow.
                                    </p>
                                )}
                            </div>

                            {/* Match Statistics */}
                            {stats.statisticsItems.length > 0 ? (
                                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-xs">
                                    <div className="bg-gray-50/80 dark:bg-gray-900/50 px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <span className="font-bold text-gray-800 dark:text-gray-200 text-xs sm:text-sm uppercase tracking-wider">Match Statistics</span>
                                        <span className="text-[11px] font-semibold text-gray-400">Head to Head</span>
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800 p-1 sm:p-2">
                                        {stats.statisticsItems.map((item, iIdx) => {
                                            const homeVal = parseFloat(String(item.home).replace('%', '')) || 0;
                                            const awayVal = parseFloat(String(item.away).replace('%', '')) || 0;
                                            const total = (homeVal + awayVal) || 1;
                                            const homePct = Math.round((homeVal / total) * 100);
                                            const awayPct = 100 - homePct;
                                            const isHomeDominant = homeVal > awayVal;
                                            const isAwayDominant = awayVal > homeVal;

                                            return (
                                                <div key={iIdx} className="px-3 sm:px-4 py-2.5 sm:py-3 space-y-1.5">
                                                    <div className="flex justify-between items-center text-xs sm:text-sm font-bold">
                                                        <span className={`w-14 text-left ${isHomeDominant ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            {item.home}
                                                        </span>
                                                        <span className="flex-1 text-center text-gray-500 dark:text-gray-400 font-medium text-[11px] sm:text-xs uppercase tracking-wider truncate px-2">
                                                            {item.name}
                                                        </span>
                                                        <span className={`w-14 text-right ${isAwayDominant ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-gray-700 dark:text-gray-300'}`}>
                                                            {item.away}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                                        <div
                                                            style={{ width: `${homePct}%` }}
                                                            className={`h-full transition-all duration-500 ${isHomeDominant ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                        />
                                                        <div
                                                            style={{ width: `${awayPct}%` }}
                                                            className={`h-full transition-all duration-500 ${isAwayDominant ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 sm:p-6 text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                                    Detailed provider metrics will appear here once the match kicks off.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Generated International Slip Modal */}
            {showGeneratedSlip && (
                <motion.div
                    drag={typeof window !== 'undefined' && window.innerWidth >= 640}
                    dragMomentum={false}
                    className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-6 sm:right-6 w-auto sm:w-[28rem] max-w-[calc(100vw-1.5rem)] sm:max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col max-h-[84vh]"
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                >
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-3 sm:p-3.5 flex justify-between items-center select-none">
                        <div className="flex items-center gap-2 text-white">
                            <GripHorizontal size={18} className="opacity-70 hidden sm:block cursor-grab" />
                            <Globe size={17} className="shrink-0" />
                            <div>
                                <span className="font-bold text-sm block leading-tight">
                                    AI International Slip ({activeSlipMatches.length} / {totalEvaluatedCount} Evaluated)
                                </span>
                                <span className="text-[10px] text-indigo-100 block">
                                    National Teams Only • Max 20 games • Sorted by AI confidence
                                </span>
                            </div>
                        </div>
                        <button onClick={() => setShowGeneratedSlip(false)} className="text-white opacity-70 hover:opacity-100 p-1 transition-opacity cursor-pointer">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Confidence Priority Bar */}
                    <div className="px-3 sm:px-4 py-2 bg-indigo-50/70 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-gray-700 dark:text-gray-300">Min AI Confidence:</span>
                        <div className="flex items-center gap-1">
                            {[70, 75, 80, 85, 90].map(threshold => (
                                <button
                                    key={threshold}
                                    type="button"
                                    onClick={() => setSlipMinConfidence(threshold)}
                                    className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                                        slipMinConfidence === threshold
                                            ? 'bg-indigo-600 text-white shadow-xs'
                                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {threshold}%+
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-3 sm:p-4 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-800/50 max-h-[50vh]">
                        {activeSlipMatches.length === 0 ? (
                            <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                                No international matches met the &ge;{slipMinConfidence}% strict AI confidence threshold. Try lowering the confidence filter above.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {activeSlipMatches.map(match => (
                                    <div key={match.matchId} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 shadow-xs relative">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveSlipMatch(match.matchId)}
                                            className="absolute top-2.5 right-2.5 text-gray-400 hover:text-red-500 p-0.5 transition-colors cursor-pointer"
                                            title="Remove from slip"
                                        >
                                            <X size={14} />
                                        </button>
                                        <div className="flex justify-between items-start mb-1.5 pr-5 gap-2">
                                            <div>
                                                <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block">
                                                    {formatCompetitionLabel(match.league)}
                                                </span>
                                                {match.kickoffTime && (
                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                        {new Date(match.kickoffTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                                    match.confidence >= 85
                                                        ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800'
                                                        : match.confidence >= 78
                                                        ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                                                        : 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800'
                                                }`}>
                                                    {match.confidence}% AI Conf
                                                </span>
                                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                                                    @{match.marketOdds?.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <h4 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                                            {match.homeTeam} <span className="text-gray-400 font-normal">vs</span> {match.awayTeam}
                                        </h4>

                                        <div className="flex flex-wrap items-center justify-between gap-1.5 bg-indigo-50/70 dark:bg-gray-900/70 px-2.5 py-1.5 rounded-lg mb-1.5 border border-indigo-100 dark:border-gray-700">
                                            <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300">
                                                Pick: {match.selectedMarket}
                                            </span>
                                            {match.expectedCorners && (
                                                <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">
                                                    Corners: {match.expectedCorners}
                                                </span>
                                            )}
                                        </div>

                                        {(match.gameImportance || match.rotationRisk) && (
                                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                                {match.gameImportance && (
                                                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-1.5 py-0.5 rounded font-medium">
                                                        {match.gameImportance}
                                                    </span>
                                                )}
                                                {match.rotationRisk && (
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                                        match.rotationRisk === 'High'
                                                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                    }`}>
                                                        Rotation Risk: {match.rotationRisk}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {match.reasoning && (
                                            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-snug">
                                                {match.reasoning}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {activeSlipMatches.length > 0 && (
                        <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Combined Odds</span>
                                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                                    {activeSlipMatches.reduce((acc, m) => acc * (m.marketOdds || 1.0), 1).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleCopyGeneratedSlip}
                                    className="px-4 py-2.5 rounded-xl font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-colors text-xs sm:text-sm cursor-pointer"
                                >
                                    Copy
                                </button>
                                <button
                                    onClick={handleSaveSlip}
                                    disabled={savingSlip}
                                    className={`flex-1 py-2.5 rounded-xl font-bold text-white shadow-md transition-colors text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer ${savingSlip ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                    {savingSlip ? 'Saving...' : `Save AI Slip (${activeSlipMatches.length})`}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            )}
        </main>
    );
};

export default InternationalGames;

