import React, { useState } from 'react';
import { Users, Search, GripHorizontal, X, Bot, Sparkles, Activity, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import teamLogos from '../assets/teamLogos.json';
import { API_BASE_URL } from '../config';

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
                    <div key={`table-${index}`} className="font-mono text-xs bg-gray-50 dark:bg-gray-900/50 p-2.5 sm:p-3 rounded-lg overflow-x-auto my-2 border border-gray-200 dark:border-gray-700 shadow-inner whitespace-pre">
                        {tableLines.join('\n')}
                    </div>
                );
                inTable = false;
                tableLines = [];
            }
            
            if (!trimmed) {
                elements.push(<div key={index} className="h-1.5" />);
                return;
            }

            // Headings (#, ##, ###)
            if (trimmed.startsWith('### ')) {
                elements.push(
                    <h4 key={index} className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider mt-2.5 mb-1">
                        {trimmed.replace(/^###\s+/, '')}
                    </h4>
                );
                return;
            }
            if (trimmed.startsWith('## ')) {
                elements.push(
                    <h3 key={index} className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide mt-2.5 mb-1">
                        {trimmed.replace(/^##\s+/, '')}
                    </h3>
                );
                return;
            }
            if (trimmed.startsWith('# ')) {
                elements.push(
                    <h2 key={index} className="text-sm font-black text-gray-900 dark:text-white mt-3 mb-1.5">
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
                    <div key={index} className="flex items-start gap-1.5 text-xs py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                        <span className="flex-1">{formattedLine}</span>
                    </div>
                );
            } else {
                elements.push(
                    <div key={index} className="text-xs py-0.5 leading-relaxed">
                        {formattedLine}
                    </div>
                );
            }
        }
    });
    
    if (inTable) {
        elements.push(
            <div key={`table-end`} className="font-mono text-xs bg-gray-50 dark:bg-gray-900/50 p-2.5 sm:p-3 rounded-lg overflow-x-auto my-2 border border-gray-200 dark:border-gray-700 shadow-inner whitespace-pre">
                {tableLines.join('\n')}
            </div>
        );
    }
    
    return elements;
};

const MY_TEAMS = [
  "Arsenal", "Aston Villa", "Real Madrid", "Real Sociedad", "Barcelona", "Athletic Bilbao", "Bayern Munich", 
  "Stuttgart", "Ac Milan", "Venezia", "Crystal Palace", "Man City", "Rio Ave", "Sporting", "SV 07 Elversberg", 
  "Bayer Leverkusen", "Bournemouth", "Everton", "Celtic", "Falkirk Fc", "Lens", "Strasbourg", "Tottenham", 
  "Newcastle", "Borussia Dortmund", "Hamburger SV", "Galatasaray Istanbul", "Goztepe Izmir", "Lyon", "Le Havre", 
  "Sevilla", "Atletico Madrid", "FC Utrecht", "PSV Eindhoven", "Feyenoord", "ADO Den Haag", "Chelsea", "Brighton", 
  "SC Telstar", "Ajax", "Malaga CF", "SC Cambuur", "FC Twente Enschede", "Samsunspor", "Fenerbahce Istanbul", 
  "Cagliari", "Inter", "Rayo vallecano", "SK Rapid", "Strum Graz", "Salzburg", "FK Austria Wien", "Gent", 
  "Club Brugge", "Union Gilloise", "RSC Anderlecht", "KVC Westerlo", "SV Zulte Waregem", "FK Spartak 1918", 
  "Ludogorets", "NK Istra 1961", "GNK Dinamo Zagreb", "Sparta Pargue", "Slavia Prague", "Viborg FF", "AC Horsens", 
  "Silkeborg IF", "FC Midtjylland", "Nordsjaelland", "Broendby IF", "Alkmaar", "Go Ahead Eagles", "Bodo/Gimit", 
  "Rosenborg", "Tromsoe IL", "Sarpsborg 08", "Academico de Viseu", "Porto", "Aberdeen", "Rangers", "Valencia", 
  "Betis", "LASK Linz"
].sort();

const MyTeams = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState({});

  // Generated slip states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMatches, setGeneratedMatches] = useState([]);
  const [showGeneratedSlip, setShowGeneratedSlip] = useState(false);
  const [savingSlip, setSavingSlip] = useState(false);
  const [slipMinConfidence, setSlipMinConfidence] = useState(75);
  const [totalEvaluatedCount, setTotalEvaluatedCount] = useState(0);

  const filteredTeams = MY_TEAMS.filter(team => 
    team.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTeamClick = async (team) => {
    setSelectedTeam(team);
    setUpcomingMatches([]);
    setLoadingMatches(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/${encodeURIComponent(team)}/matches`);
      if (response.ok) {
        const data = await response.json();
        setUpcomingMatches(data.matches || []);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  const handleAiAnalysis = async (matchId, forceRetry = false) => {
    if (!forceRetry && aiAnalysis[matchId]?.text) {
      setAiAnalysis(prev => ({
        ...prev,
        [matchId]: {
          ...prev[matchId],
          expanded: !prev[matchId].expanded
        }
      }));
      return;
    }

    setAiAnalysis(prev => ({
      ...prev,
      [matchId]: { loading: true, text: null, error: null, expanded: true }
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/matches/${matchId}/predict`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch AI analysis');
      setAiAnalysis(prev => ({
        ...prev,
        [matchId]: { loading: false, text: data.analysis, error: null, expanded: true }
      }));
    } catch (err) {
      setAiAnalysis(prev => ({
        ...prev,
        [matchId]: { loading: false, text: null, error: err.message, expanded: false }
      }));
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedMatches([]);
    setShowGeneratedSlip(false);

    try {
      const response = await fetch(`${API_BASE_URL}/api/my-teams/generate-slip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teams: MY_TEAMS,
          minConfidence: 70
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate AI 14-day slip');
      }

      // Deduplicate and strictly sort by highest confidence first
      const uniqueMatches = Array.from(
        new Map((data.matches || []).map(m => [m.matchId, m])).values()
      ).sort((a, b) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0));

      setTotalEvaluatedCount(data.totalEvaluated || uniqueMatches.length);
      setGeneratedMatches(uniqueMatches);
      setShowGeneratedSlip(true);
    } catch (err) {
      console.error('Error generating slip:', err);
      alert('Failed to generate slip: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const activeSlipMatches = generatedMatches.filter(
    m => (Number(m.confidence) || 0) >= slipMinConfidence
  );

  const handleRemoveSlipMatch = (matchId) => {
    setGeneratedMatches(prev => prev.filter(m => m.matchId !== matchId));
  };

  const handleSaveSlip = async () => {
    if (activeSlipMatches.length === 0) return;
    setSavingSlip(true);
    try {
      const todayFormatted = new Date().toISOString().split('T')[0];
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
      alert('Generated AI Slip saved successfully! You can view it in the History page.');
      setShowGeneratedSlip(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingSlip(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 relative">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
            <Users className="text-indigo-600 dark:text-indigo-400" size={22} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">My Teams</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Tracking {MY_TEAMS.length} favorite teams</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`font-bold py-2.5 px-5 rounded-xl transition-all whitespace-nowrap shadow-xs text-xs sm:text-sm flex items-center justify-center gap-2 ${isGenerating ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-98'}`}
          >
            {isGenerating ? 'Generating...' : 'Generate 14-Day Slip'}
          </button>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm transition-colors shadow-xs"
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
        <AnimatePresence>
          {filteredTeams.map((team) => (
            <motion.div
              key={team}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTeamClick(team)}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-700 p-3 sm:p-4 flex flex-col items-center justify-center gap-2 sm:gap-3 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all cursor-pointer group"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-indigo-100 dark:group-hover:border-indigo-900/50 transition-colors shadow-xs">
                <img 
                  src={teamLogos[team] || `https://ui-avatars.com/api/?name=${encodeURIComponent(team)}&background=random&color=fff&bold=true&size=128&font-size=0.33`} 
                  alt={`${team} badge`} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 text-center line-clamp-2">
                {team}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4">
          <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">No teams found</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">We couldn't find any team matching "{searchTerm}".</p>
        </div>
      )}

      {/* Selected Team Modal */}
      <AnimatePresence>
        {selectedTeam && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTeam(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-lg sm:max-w-xl max-h-[88vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 border border-gray-100 dark:border-gray-700"
            >
              <div className="p-5 sm:p-6 flex flex-col items-center relative">
                <button 
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                  className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="Close"
                >
                  <X size={18} />
                </button>

                <div className="w-20 h-20 sm:w-24 sm:h-24 mb-3 sm:mb-4 rounded-full shadow-md overflow-hidden border-4 border-white dark:border-gray-700 shrink-0">
                  <img 
                    src={teamLogos[selectedTeam] || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTeam)}&background=random&color=fff&bold=true&size=256&font-size=0.33`} 
                    alt={`${selectedTeam} badge`} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-3 text-center">{selectedTeam}</h2>
                
                <div className="w-full mb-5 text-left">
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2.5">Upcoming Matches</h3>
                  
                  {loadingMatches ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                    </div>
                  ) : upcomingMatches.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingMatches.map((match) => (
                        <div key={match.id} className="bg-gray-50 dark:bg-gray-900/50 p-3.5 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col transition-all">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">{match.league}</span>
                            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                              {new Date(match.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className={`text-xs sm:text-sm ${match.home === selectedTeam ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-600 dark:text-gray-300'}`}>{match.home}</span>
                            <span className="text-xs text-gray-400 mx-2 font-medium">vs</span>
                            <span className={`text-xs sm:text-sm ${match.away === selectedTeam ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-600 dark:text-gray-300'}`}>{match.away}</span>
                          </div>

                          {/* AI Insight Action / Card */}
                          <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                            {!aiAnalysis[match.id]?.text && !aiAnalysis[match.id]?.loading && (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                                  <Bot size={15} className="shrink-0" />
                                  <span>AI Match Insight</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAiAnalysis(match.id);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                                >
                                  <Sparkles size={13} />
                                  <span>Generate Insight</span>
                                </button>
                              </div>
                            )}

                            {aiAnalysis[match.id]?.loading && (
                              <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 py-2 font-medium">
                                <Activity size={15} className="animate-spin shrink-0" />
                                <span>Analyzing team form, tactics, and expected match flow...</span>
                              </div>
                            )}

                            {aiAnalysis[match.id]?.error && (
                              <div className="flex items-center justify-between text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2.5 rounded-lg border border-red-100 dark:border-red-900/30">
                                <div className="flex items-center gap-1.5">
                                  <AlertTriangle size={14} className="shrink-0" />
                                  <span>{aiAnalysis[match.id].error}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAiAnalysis(match.id, true);
                                  }}
                                  className="underline font-bold hover:text-red-700 ml-2 cursor-pointer"
                                >
                                  Retry
                                </button>
                              </div>
                            )}

                            {aiAnalysis[match.id]?.text && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                    <Bot size={15} className="shrink-0" />
                                    <span>AI Match Insight</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAiAnalysis(match.id);
                                    }}
                                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
                                  >
                                    <span>{aiAnalysis[match.id].expanded ? 'Hide' : 'View'}</span>
                                    {aiAnalysis[match.id].expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                </div>

                                {aiAnalysis[match.id].expanded && (
                                  <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-gray-700 dark:text-gray-300 leading-relaxed max-h-64 overflow-y-auto space-y-1">
                                    {formatAiText(aiAnalysis[match.id].text)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl text-center text-xs text-gray-500 dark:text-gray-400">
                      No upcoming matches found.
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedTeam(null)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-xs sm:text-sm cursor-pointer shadow-xs active:scale-98"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Generated Slip Modal */}
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
                      <Bot size={17} className="shrink-0" />
                      <div>
                          <span className="font-bold text-sm block leading-tight">
                              AI 14-Day Slip ({activeSlipMatches.length} / {totalEvaluatedCount} Evaluated)
                          </span>
                          <span className="text-[10px] text-indigo-100 block">
                              Sorted by highest AI confidence • Multi-market
                          </span>
                      </div>
                  </div>
                  <button onClick={() => setShowGeneratedSlip(false)} className="text-white opacity-70 hover:opacity-100 p-1 transition-opacity">
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
                          No upcoming matches for your tracked teams met the ≥{slipMinConfidence}% strict AI confidence threshold. Try lowering the confidence filter above.
                      </div>
                  ) : (
                      <div className="space-y-2.5">
                          {activeSlipMatches.map(match => (
                              <div key={match.matchId} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 shadow-xs relative">
                                  <button
                                      type="button"
                                      onClick={() => handleRemoveSlipMatch(match.matchId)}
                                      className="absolute top-2.5 right-2.5 text-gray-400 hover:text-red-500 p-0.5 transition-colors"
                                      title="Remove from slip"
                                  >
                                      <X size={14} />
                                  </button>
                                  <div className="flex justify-between items-start mb-1.5 pr-5 gap-2">
                                      <div>
                                          <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider block">
                                              {match.league}
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
                      <button 
                          onClick={handleSaveSlip}
                          disabled={savingSlip}
                          className={`w-full py-2.5 rounded-xl font-bold text-white shadow-md transition-colors text-xs sm:text-sm flex items-center justify-center gap-2 ${savingSlip ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      >
                          {savingSlip ? 'Saving...' : `Save High-Confidence AI Slip (${activeSlipMatches.length})`}
                      </button>
                  </div>
              )}
          </motion.div>
      )}

    </main>
  );
};

export default MyTeams;
