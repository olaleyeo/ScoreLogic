import React, { useState, useEffect } from 'react';
import { Activity, Search, Sparkles, Bot, AlertTriangle, MapPin, ArrowLeft } from 'lucide-react';
import { API_BASE_URL } from '../config';

const isLive = (statusShort) => {
    return ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(statusShort);
};

const getMatchProgress = (match) => {
    const elapsed = match.fixture.status.elapsed || 0;
    const short = match.fixture.status.short;
    if (short === 'HT') return 50;
    if (short === 'FT' || short === 'AET' || short === 'PEN') return 100;
    return Math.min(100, (elapsed / 90) * 100);
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

            // Headings (#, ##, ###)
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

            // Bullet points
            const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
            const content = isBullet ? trimmed.replace(/^[-*]\s+/, '') : line;

            // Format bold text **text**
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
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
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
            <div key={`table-end`} className="font-mono text-xs md:text-sm bg-gray-50 dark:bg-gray-900/50 p-3 sm:p-4 rounded-xl overflow-x-auto my-3 border border-gray-200 dark:border-gray-700 shadow-inner whitespace-pre">
                {tableLines.join('\n')}
            </div>
        );
    }
    
    return elements;
};

const LiveStats = () => {
  const [liveMatches, setLiveMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);
  
  const [aiAnalysis, setAiAnalysis] = useState({});
  const [mobileTab, setMobileTab] = useState('matches'); // 'matches' | 'stats'

  const fetchLiveMatches = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/matches/live`);
      if (res.ok) {
        const data = await res.json();
        setLiveMatches(data.matches || []);
      }
    } catch (err) {
      console.error('Failed to fetch live matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMatches();
    const interval = setInterval(fetchLiveMatches, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

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

  useEffect(() => {
    let intervalId;
    if (stats && isLive(stats.matchInfo.fixture.status.short)) {
      intervalId = setInterval(() => {
        fetchMatchStats(stats.matchInfo);
      }, 60000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [stats?.matchInfo?.fixture?.id]);

  const filteredMatches = liveMatches.filter(m => {
      if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return m.teams.home.name.toLowerCase().includes(query) || 
                 m.teams.away.name.toLowerCase().includes(query) || 
                 m.league.name.toLowerCase().includes(query);
      }
      return true;
  });

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 relative">
      {/* Mobile Top Navigation Bar when viewing Match Details */}
      {mobileTab === 'stats' && stats && (
        <div className="lg:hidden flex items-center justify-between gap-2 mb-3 bg-white dark:bg-gray-800 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs">
          <button
            onClick={() => setMobileTab('matches')}
            className="flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-3 py-2 rounded-xl active:scale-95 transition-all shrink-0"
          >
            <ArrowLeft size={16} />
            <span>All Live Matches</span>
          </button>
          <div className="flex items-center gap-1.5 min-w-0 px-2 text-right">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate uppercase tracking-wider">
              {stats.matchInfo.league.name}
            </span>
          </div>
        </div>
      )}

      {/* Header (Shown on Desktop, or on Mobile only when viewing Matches List) */}
      <div className={`items-center gap-3 mb-4 sm:mb-8 ${mobileTab === 'stats' ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-2.5 sm:p-3 bg-red-100 dark:bg-red-900/50 rounded-xl">
          <Activity className="text-red-600 dark:text-red-400" size={24} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              Live Stats
              <span className="text-xs sm:text-sm font-bold bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2.5 py-0.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]">
                  {filteredMatches.length} Live
              </span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-xs sm:text-sm mt-0.5">
            Real-time match statistics and live AI momentum tracking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 pb-20">
        
        {/* Left Column: Match List */}
        <div className={`lg:col-span-5 flex flex-col gap-3 sm:gap-4 ${mobileTab === 'stats' ? 'hidden lg:flex' : 'flex'}`}>
            {/* Mobile indicator if match already open */}
            {stats && (
              <div className="lg:hidden flex items-center justify-between bg-red-50 dark:bg-red-950/60 p-2.5 rounded-xl border border-red-100 dark:border-red-900/40 text-xs">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                  <span className="text-gray-600 dark:text-gray-300 truncate">
                    Viewing: <strong className="text-red-600 dark:text-red-400">{stats.matchInfo.teams.home.name} vs {stats.matchInfo.teams.away.name}</strong>
                  </span>
                </div>
                <button
                  onClick={() => setMobileTab('stats')}
                  className="font-bold text-red-600 dark:text-red-400 hover:underline shrink-0 ml-2"
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
                placeholder="Search live matches by team or league..."
                className="w-full pl-3.5 pr-10 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors shadow-xs"
              />
              <Search className="absolute right-3 top-2.5 sm:top-3 text-gray-400" size={18} />
            </div>

            <div className="flex flex-col gap-2.5 sm:gap-3 max-h-[750px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                {loading && liveMatches.length === 0 ? (
                    <div className="flex items-center justify-center p-10">
                        <Activity size={24} className="animate-spin text-gray-400" />
                    </div>
                ) : filteredMatches.length === 0 ? (
                    <div className="text-center p-8 sm:p-10 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-sm">
                        No live matches currently playing.
                    </div>
                ) : (
                    filteredMatches.map(match => (
                        <div 
                            key={match.fixture.id}
                            className={`w-full shrink-0 relative overflow-hidden bg-white dark:bg-gray-800 border ${stats?.matchInfo?.fixture?.id === match.fixture.id ? 'border-red-500 dark:border-red-400 shadow-md ring-1 ring-red-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'} rounded-2xl cursor-pointer transition-all flex flex-col`}
                        >
                            <div 
                                onClick={() => fetchMatchStats(match)}
                                className="p-3.5 sm:p-4 flex items-center gap-3 sm:gap-4 relative select-none"
                            >
                                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-200 dark:bg-gray-700/50">
                                    <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${getMatchProgress(match)}%` }}></div>
                                </div>
                                <div className="flex flex-col gap-1 w-16 sm:w-20 shrink-0 justify-center text-center border-r border-gray-100 dark:border-gray-700 pr-2 sm:pr-3">
                                    <span className="text-[10px] sm:text-[11px] font-bold text-red-600 dark:text-red-400 uppercase flex flex-col items-center justify-center gap-0.5">
                                        <div className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                            {match.fixture.status.elapsed ? `${match.fixture.status.elapsed}'` : 'LIVE'}
                                        </div>
                                    </span>
                                    <span className="text-[9px] font-semibold text-gray-400 truncate max-w-full" title={match.league.name}>{match.league.name}</span>
                                </div>

                                <div className="flex-1 flex flex-col gap-1.5 sm:gap-2 overflow-hidden">
                                    <div className="flex justify-between items-center font-bold text-gray-900 dark:text-white">
                                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                                            <img src={match.teams.home.logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => e.target.style.display='none'} />
                                            <span className="truncate text-xs sm:text-sm">{match.teams.home.name}</span>
                                        </div>
                                        <span className="text-sm sm:text-base ml-2 shrink-0">{match.goals.home !== null ? match.goals.home : '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center font-bold text-gray-900 dark:text-white">
                                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                                            <img src={match.teams.away.logo} alt="" className="w-4 h-4 object-contain shrink-0" onError={(e) => e.target.style.display='none'} />
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

        {/* Right Column: Comprehensive Stats */}
        <div className={`lg:col-span-7 ${mobileTab === 'matches' ? 'hidden lg:block' : 'block'}`}>
            {statsLoading ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 sm:p-10 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                    <Activity size={32} className="animate-spin text-red-500 mb-4" />
                    <p className="text-gray-500 text-sm font-medium">Loading live statistics...</p>
                </div>
            ) : statsError ? (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 sm:p-6 text-red-600 flex items-center gap-3 text-sm">
                    <AlertTriangle className="shrink-0" /> {statsError}
                </div>
            ) : !stats ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 sm:p-10 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px]">
                    <Activity size={44} className="text-gray-200 dark:text-gray-700 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-center max-w-md text-sm">
                        Select any live match from the list to view its comprehensive statistics, momentum, and AI insights.
                    </p>
                </div>
            ) : (
                <div className="space-y-4 sm:space-y-6">
                    {/* Centered Symmetrical Score Card */}
                    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                        <div className="absolute bottom-0 left-0 w-full h-[4px] bg-gray-100 dark:bg-gray-700">
                            <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${getMatchProgress(stats.matchInfo)}%` }}></div>
                        </div>

                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                            {/* Home Team */}
                            <div className="flex-1 flex flex-col items-center text-center min-w-0">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 p-2 rounded-2xl bg-gray-50 dark:bg-gray-900/60 flex items-center justify-center shrink-0 mb-2 border border-gray-100 dark:border-gray-800">
                                    <img 
                                        src={stats.matchInfo.teams.home.logo} 
                                        className="w-full h-full object-contain" 
                                        alt={stats.matchInfo.teams.home.name} 
                                        onError={(e) => e.target.style.display='none'} 
                                    />
                                </div>
                                <span className="font-bold text-xs sm:text-base text-gray-900 dark:text-white leading-tight line-clamp-2 w-full">
                                    {stats.matchInfo.teams.home.name}
                                </span>
                            </div>
                            
                            {/* Score & Live Status */}
                            <div className="px-2 sm:px-6 flex flex-col items-center shrink-0 z-10">
                                <div className="text-2xl sm:text-4xl font-black px-4 sm:px-6 py-2 sm:py-3 rounded-2xl border text-red-600 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900/30 tracking-tight">
                                    {stats.matchInfo.goals.home !== null ? stats.matchInfo.goals.home : '-'} : {stats.matchInfo.goals.away !== null ? stats.matchInfo.goals.away : '-'}
                                </div>
                                
                                <div className="mt-2 text-center">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[11px] font-black uppercase">
                                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                                        LIVE {stats.matchInfo.fixture.status.elapsed}'
                                    </div>
                                </div>
                            </div>

                            {/* Away Team */}
                            <div className="flex-1 flex flex-col items-center text-center min-w-0">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 p-2 rounded-2xl bg-gray-50 dark:bg-gray-900/60 flex items-center justify-center shrink-0 mb-2 border border-gray-100 dark:border-gray-800">
                                    <img 
                                        src={stats.matchInfo.teams.away.logo} 
                                        className="w-full h-full object-contain" 
                                        alt={stats.matchInfo.teams.away.name} 
                                        onError={(e) => e.target.style.display='none'} 
                                    />
                                </div>
                                <span className="font-bold text-xs sm:text-base text-gray-900 dark:text-white leading-tight line-clamp-2 w-full">
                                    {stats.matchInfo.teams.away.name}
                                </span>
                            </div>
                        </div>

                        {/* Venue info in footer of score card */}
                        {stats.matchInfo.fixture.venue?.name && (
                            <div className="mt-3.5 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 text-center">
                                <MapPin size={13} className="shrink-0 text-red-500" />
                                <span className="truncate">{stats.matchInfo.fixture.venue.name}{stats.matchInfo.fixture.venue.city ? `, ${stats.matchInfo.fixture.venue.city}` : ''}</span>
                            </div>
                        )}
                    </div>

                    {/* AI Match Insight Card (Single-Layer, No Nested Box Clutter) */}
                    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl border border-red-100 dark:border-red-900/40 shadow-xs space-y-3">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/80">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                <Bot size={18} className="shrink-0" />
                                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">AI Live Insight</span>
                            </div>
                            {(!aiAnalysis[stats.matchInfo.fixture.id]?.text && !aiAnalysis[stats.matchInfo.fixture.id]?.loading) && (
                                <button 
                                    onClick={(e) => handleAiAnalysis(e, stats.matchInfo)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
                                >
                                    <Sparkles size={13} /> <span>Generate Insight</span>
                                </button>
                            )}
                        </div>
                        
                        {aiAnalysis[stats.matchInfo.fixture.id]?.loading ? (
                            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-red-600 dark:text-red-400 py-3 font-medium">
                                <Activity size={16} className="animate-spin shrink-0" /> 
                                <span>Analyzing live momentum, cards and expected goals...</span>
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
                                Tap "Generate Insight" to let the Gemini engine analyze in-play momentum, tactical shifts, and live win probabilities.
                            </p>
                        )}
                    </div>

                    {/* Live Match Statistics with Head-to-Head Visual Comparison Bars */}
                    {stats.statisticsItems.length > 0 ? (
                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-xs">
                            <div className="bg-gray-50/80 dark:bg-gray-900/50 px-4 sm:px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <span className="font-bold text-gray-800 dark:text-gray-200 text-xs sm:text-sm uppercase tracking-wider">Live Match Statistics</span>
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
                                                <span className={`w-14 text-left ${isHomeDominant ? 'text-red-600 dark:text-red-400 font-extrabold' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {item.home}
                                                </span>
                                                <span className="flex-1 text-center text-gray-500 dark:text-gray-400 font-medium text-[11px] sm:text-xs uppercase tracking-wider truncate px-2">
                                                    {item.name}
                                                </span>
                                                <span className={`w-14 text-right ${isAwayDominant ? 'text-red-600 dark:text-red-400 font-extrabold' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {item.away}
                                                </span>
                                            </div>
                                            {/* Visual Comparison Bar */}
                                            <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                                <div 
                                                    style={{ width: `${homePct}%` }} 
                                                    className={`h-full transition-all duration-500 ${isHomeDominant ? 'bg-red-500 dark:bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`} 
                                                />
                                                <div 
                                                    style={{ width: `${awayPct}%` }} 
                                                    className={`h-full transition-all duration-500 ${isAwayDominant ? 'bg-red-500 dark:bg-red-500' : 'bg-gray-300 dark:bg-gray-600'}`} 
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 sm:p-6 text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                            Detailed in-play statistics will appear here as they are provided by the match data feed.
                        </div>
                    )}
                </div>
            )}
        </div>

      </div>
    </main>
  );
};

export default LiveStats;
