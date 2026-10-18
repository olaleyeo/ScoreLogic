import React, { useState, useEffect } from 'react';
import { Filter, Copy, Share2, Save, Check, GripHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config';

const Home = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const todayFormatted = new Date().toISOString().split('T')[0];
  const [dateParam, setDateParam] = useState(todayFormatted);
  const [leaguesParam, setLeaguesParam] = useState('');
  const [strategyParam, setStrategyParam] = useState('Over15');
  const [timeRangeParam, setTimeRangeParam] = useState('all');
  
  // Custom Slip Builder state
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [savingSlip, setSavingSlip] = useState(false);
  const [isSlipMinimized, setIsSlipMinimized] = useState(false);

  useEffect(() => {
    fetchDynamicMatches(todayFormatted, '', 'Over15');
  }, []);

  const fetchDynamicMatches = async (targetDate, targetLeagues, targetStrategy) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (targetDate) params.append('date', targetDate);
      if (targetLeagues) params.append('leagues', targetLeagues);
      if (targetStrategy) params.append('strategy', targetStrategy);

      const response = await fetch(`${API_BASE_URL}/api/slips?${params.toString()}`);
      if (!response.ok) {
          let errorMessage = 'Failed to fetch matches';
          try {
              const errData = await response.json();
              if (errData.error) errorMessage = errData.error;
          } catch (e) {
              // Ignore JSON parse error and use default message
          }
          throw new Error(errorMessage);
      }

      const data = await response.json();
      const fetchedMatches = data.matches || [];
      const sortedMatches = fetchedMatches.sort((a, b) => {
          if (!a.kickoffTime) return 1;
          if (!b.kickoffTime) return -1;
          return new Date(a.kickoffTime) - new Date(b.kickoffTime);
      });
      setMatches(sortedMatches);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredMatchesToRender = () => {
      if (timeRangeParam === 'all') return matches;
      const limitHours = parseInt(timeRangeParam, 10);
      const limitTime = new Date().getTime() + (limitHours * 60 * 60 * 1000);
      return matches.filter(m => {
          if (!m.kickoffTime) return true;
          return new Date(m.kickoffTime).getTime() <= limitTime;
      });
  };

  const displayedMatches = getFilteredMatchesToRender();

  const handleApplyFilters = () => {
    fetchDynamicMatches(dateParam, leaguesParam, strategyParam);
  };

  const toggleMatchSelection = (match) => {
    setSelectedMatches(prev => {
      if (prev.some(m => m.matchId === match.matchId)) {
        return prev.filter(m => m.matchId !== match.matchId);
      } else {
        return [...prev, match];
      }
    });
  };

  const totalOdds = selectedMatches.reduce((acc, m) => acc * (m.marketOdds || 1.0), 1);

  const handleCopySlip = () => {
    const selected = selectedMatches;
    if (selected.length === 0) return;
    let text = `Custom Slip (${selected.length} games)\n------------------\n`;
    selected.forEach(m => {
        text += `${m.homeTeam} vs ${m.awayTeam} (${m.league})\n`;
        text += `Market: ${m.selectedMarket}\n`;
        text += `Odds: ${m.marketOdds?.toFixed(2)}\n\n`;
    });
    text += `Total Odds: ${totalOdds.toFixed(2)}`;
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleWhatsApp = () => {
    const selected = selectedMatches;
    if (selected.length === 0) return;
    let text = `CUSTOM SLIP\n`;
    selected.forEach(m => {
        text += `${m.homeTeam} vs ${m.awayTeam} - ${m.selectedMarket} (${m.marketOdds?.toFixed(2)})\n`;
    });
    text += `Total Odds: ${totalOdds.toFixed(2)}`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const handleSaveSlip = async () => {
    const selected = selectedMatches;
    if (selected.length === 0) return;
    
    setSavingSlip(true);
    try {
        const payload = {
            date: dateParam,
            type: 'custom',
            totalOdds: parseFloat(totalOdds.toFixed(2)),
            matches: selected
        };
        const response = await fetch(`${API_BASE_URL}/api/slips/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Failed to save slip');
        alert('Slip saved successfully! You can view it in the History page.');
    } catch (err) {
        alert(err.message);
    } finally {
        setSavingSlip(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (typeof confidence === 'string') {
        switch (confidence) {
            case 'Very High': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
            case 'High': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
            case 'Low': return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
        }
    }
    if (confidence >= 80) return 'bg-green-100 text-green-800';
    if (confidence >= 60) return 'bg-blue-100 text-blue-800';
    if (confidence >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const isJTLeague = (leagueName, strategy) => {
    if (strategy !== 'Over15') return false;
    if (!leagueName) return false;
    const l = leagueName.toLowerCase();
    
    if (l.includes('germany')) return true;
    if (l.includes('wales') && l.includes('premier')) return true;
    if (l.includes('northern ireland') || l.includes('nifl')) return true;
    if (l.includes('austria') && (l.includes('bundesliga') || l.includes('2liga') || l.includes('2. liga') || l.includes('2.liga') || l.includes('regionalliga') || l.includes('regionaliga'))) return true;
    if (l.includes('denmark') && (l.includes('superliga') || l.includes('1st division') || l.includes('1. division'))) return true;
    
    const keywords = [
        'chance liga',
        'veikkausliiga', 'ykkosliiga', 'ykkösliiga',
        'eredivisie', 'eerste', 'tweede', 'erste',
        'allsvenskan', 'allvenskan', 'superettan', 'supperettan', 'södra', 'sodra', 'norra'
    ];
    
    return keywords.some(kw => l.includes(kw));
  };

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-36 relative">
      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-3.5 sm:p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 sm:mb-8 flex flex-col gap-3 sm:gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-bold text-sm">
            <Filter size={16} className="text-indigo-600 dark:text-indigo-400" /> Match Filters
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {displayedMatches.length} matches found
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <input
            type="date"
            value={dateParam}
            onChange={(e) => setDateParam(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />

          <select
            value={strategyParam}
            onChange={(e) => setStrategyParam(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          >
            <option value="Over15">Over 1.5 Strategy</option>
            <option value="Over25">Over 2.5 Strategy</option>
            <option value="Under25">Under 2.5 Strategy</option>
            <option value="Under35">Under 3.5 Strategy</option>
            <option value="StraightWin">Straight Win Strategy (1.22-1.28)</option>
            <option value="StraightWin130">Straight Win Strategy (1.30-1.36)</option>
            <option value="StraightWin172">Straight Win Strategy (1.72-1.80)</option>
            <option value="DrawInHalf">Draw in Half Strategy</option>
          </select>

          <select
            value={leaguesParam}
            onChange={(e) => setLeaguesParam(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          >
            <option value="">All Leagues</option>
            <optgroup label="Major European Leagues">
              <option value="EPL">EPL (Premier League)</option>
              <option value="La Liga">La Liga</option>
              <option value="Serie A">Italy Serie A</option>
              <option value="Bundesliga">Bundesliga</option>
              <option value="Ligue 1">Ligue 1</option>
              <option value="UEFA Champions League">UEFA Champions League</option>
              <option value="UEFA Europa League">UEFA Europa League</option>
              <option value="UEFA Conference League">UEFA Conference League</option>
            </optgroup>
            <optgroup label="Other Popular Leagues">
              <option value="Eredivisie">Eredivisie (Netherlands)</option>
              <option value="Primeira Liga">Primeira Liga (Portugal)</option>
              <option value="Championship">Championship (England)</option>
              <option value="EFL Cup">EFL Cup (Carabao Cup)</option>
              <option value="MLS">MLS (USA)</option>
              <option value="Brasileiro">Brasileiro Serie A</option>
              <option value="Liga MX">Liga MX (Mexico)</option>
              <option value="Super Lig">Super Lig (Turkey)</option>
              <option value="Pro League">Saudi Pro League</option>
            </optgroup>
            <optgroup label="International">
              <option value="World Cup">World Cup</option>
              <option value="Euro Championship">Euro Championship</option>
              <option value="Copa America">Copa America</option>
              <option value="Nations League">UEFA Nations League</option>
              <option value="Friendlies">Friendlies</option>
              <option value="Qualification">Qualifiers</option>
            </optgroup>
          </select>

          <select
            value={timeRangeParam}
            onChange={(e) => setTimeRangeParam(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          >
            <option value="all">All Upcoming Time</option>
            <option value="6">Next 6 Hours</option>
            <option value="12">Next 12 Hours</option>
            <option value="24">Next 24 Hours</option>
            <option value="48">Next 48 Hours</option>
          </select>
        </div>

        <button
          onClick={handleApplyFilters}
          className="w-full sm:w-auto self-end bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm active:scale-98 text-sm"
        >
          Find Matches
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm font-medium">Fetching matches...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800 text-center text-sm font-medium">
          {error}
        </div>
      )}

      {!loading && !error && displayedMatches.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-16 px-4 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-base mb-1">No matches found</p>
          <p className="text-sm">Try selecting a different strategy or date to view upcoming games.</p>
        </div>
      )}

      {!loading && !error && displayedMatches.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {displayedMatches.map(match => {
                const isSelected = selectedMatches.some(m => m.matchId === match.matchId);
                return (
                    <div 
                        key={match.matchId} 
                        onClick={() => toggleMatchSelection(match)}
                        className={`cursor-pointer border rounded-2xl p-4 sm:p-5 transition-all duration-200 relative select-none ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-md dark:bg-indigo-900/20 dark:border-indigo-500' : 'bg-white border-gray-200 hover:border-indigo-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-indigo-500'}`}
                    >
                        <div className="absolute top-4 right-4 z-10">
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-800'}`}>
                                {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-start mb-3 gap-2 pr-8">
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider truncate max-w-[170px]" title={match.league}>
                              {match.league}
                            </span>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                {match.kickoffTime && (
                                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/80 px-2 py-0.5 rounded-full">
                                        {new Date(match.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                                {match.zeroZeroOdds && (
                                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">0:0 @ {match.zeroZeroOdds?.toFixed(2)}</span>
                                )}
                            </div>
                        </div>

                        <h4 className="font-bold text-gray-900 dark:text-white text-base mb-3 leading-snug">
                          {match.homeTeam} <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">vs</span> {match.awayTeam}
                        </h4>
                        
                        <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/70 p-2.5 sm:p-3 rounded-xl mb-3 border border-gray-100 dark:border-gray-800">
                            <span className="font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-300">{match.selectedMarket}</span>
                            <div className="flex flex-col items-end">
                                <span className="font-extrabold text-sm sm:text-base text-indigo-600 dark:text-indigo-400">{match.marketOdds?.toFixed(2)}</span>
                                {isJTLeague(match.league, strategyParam) && (
                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-wider">JT League</span>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-auto">
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Confidence:</span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getConfidenceColor(match.confidence)}`}>
                                {typeof match.confidence === 'number' ? `${match.confidence}%` : match.confidence}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {/* Floating Slip Builder Modal (Mobile Responsive & Minimizable) */}
      {selectedMatches.length > 0 && (
          <motion.div 
              drag={typeof window !== 'undefined' && window.innerWidth >= 640}
              dragMomentum={false}
              className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-6 sm:right-6 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] sm:max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col max-h-[80vh] transition-all"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
          >
              {/* Header / Drag Bar */}
              <div 
                onClick={() => setIsSlipMinimized(!isSlipMinimized)}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 p-3 sm:p-3.5 flex justify-between items-center cursor-pointer select-none"
              >
                  <div className="flex items-center gap-2 text-white">
                      <GripHorizontal size={18} className="opacity-70 hidden sm:block cursor-grab" />
                      <span className="font-black text-sm">Custom Slip ({selectedMatches.length})</span>
                      <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full ml-1">
                        Odds: {totalOdds.toFixed(2)}
                      </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => setIsSlipMinimized(!isSlipMinimized)} 
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        aria-label="Toggle slip view"
                      >
                          {isSlipMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <button 
                        onClick={() => setSelectedMatches([])} 
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                        aria-label="Close slip"
                      >
                          <X size={18} />
                      </button>
                  </div>
              </div>

              {/* Collapsible Body */}
              {!isSlipMinimized && (
                <>
                  {/* Selected Matches List */}
                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 bg-gray-50 dark:bg-gray-800/40 min-h-[120px] max-h-[45vh]">
                      {selectedMatches.map(m => (
                          <div key={m.matchId} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-xs relative pr-8">
                              <button 
                                onClick={() => toggleMatchSelection(m)} 
                                className="absolute top-2.5 right-2.5 p-1 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                              >
                                  <X size={14} />
                              </button>
                              <div className="flex justify-between items-center mb-1">
                                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">{m.league}</span>
                                  {m.kickoffTime && (
                                      <span className="mr-5 text-[9px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                          {new Date(m.kickoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                  )}
                              </div>
                              <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100 leading-snug my-1">
                                {m.homeTeam} <span className="text-gray-400 font-normal">vs</span> {m.awayTeam}
                              </div>
                              <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-gray-100 dark:border-gray-700/60">
                                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{m.selectedMarket}</span>
                                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm">{m.marketOdds?.toFixed(2)}</span>
                              </div>
                          </div>
                      ))}
                  </div>

                  {/* Footer / Actions */}
                  <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                      <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Combined Odds</span>
                          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{totalOdds.toFixed(2)}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                          <button 
                            onClick={handleCopySlip} 
                            className="flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 py-2.5 rounded-xl transition-colors font-bold text-xs"
                          >
                              <Copy size={14} /> <span>Copy</span>
                          </button>
                          <button 
                            onClick={handleWhatsApp} 
                            className="flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl transition-colors font-bold text-xs shadow-xs"
                          >
                              <Share2 size={14} /> <span>WhatsApp</span>
                          </button>
                          <button 
                            onClick={handleSaveSlip} 
                            disabled={savingSlip} 
                            className="flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2.5 rounded-xl transition-colors font-bold text-xs shadow-xs"
                          >
                              <Save size={14} /> <span>{savingSlip ? 'Saving...' : 'Save'}</span>
                          </button>
                      </div>
                  </div>
                </>
              )}
          </motion.div>
      )}
    </main>
  );
};

export default Home;
