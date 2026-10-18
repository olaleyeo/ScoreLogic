import React, { useState, useEffect } from 'react';
import { Bot, Activity, Sparkles, AlertTriangle, Calendar, Trophy, FileText } from 'lucide-react';
import CheatSheetModal from '../components/CheatSheetModal';
import { API_BASE_URL } from '../config';

const AiPrematch = () => {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLeagueIndex, setSelectedLeagueIndex] = useState(0);
  const [predictions, setPredictions] = useState({}); // { teamId: { loading, text, fixture, error } }
  const [filterDate, setFilterDate] = useState('');
  
  // Bet Builder State
  const [isGeneratingBB, setIsGeneratingBB] = useState(false);
  const [bbResult, setBbResult] = useState(null);
  const [showBBModal, setShowBBModal] = useState(false);
  
  // Cheat Sheet State
  const [selectedCheatSheetMatch, setSelectedCheatSheetMatch] = useState(null);

  useEffect(() => {
    fetchStandings();
  }, []);

  const fetchStandings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai-prematch/standings`);
      if (!res.ok) throw new Error('Failed to fetch standings');
      const data = await res.json();
      setLeagues(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAiAnalysis = async (e, teamId) => {
    e.stopPropagation();
    
    // Toggle off if already showing
    if (predictions[teamId]?.text || predictions[teamId]?.error) {
        setPredictions(prev => {
            const next = { ...prev };
            delete next[teamId];
            return next;
        });
        return;
    }

    setPredictions(prev => ({ ...prev, [teamId]: { loading: true, text: null, fixture: null, error: null } }));
    try {
        const res = await fetch(`${API_BASE_URL}/api/ai-prematch/analyze/${teamId}?leagueId=${selectedLeague.leagueId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.details || 'Failed to generate AI analysis');
        
        setPredictions(prev => ({ 
            ...prev, 
            [teamId]: { loading: false, text: data.analysis, fixture: data.fixture, error: null } 
        }));
    } catch (err) {
        setPredictions(prev => ({ 
            ...prev, 
            [teamId]: { loading: false, text: null, fixture: null, error: err.message } 
        }));
    }
  };

  const handleGenerateBB = async () => {
    if (!teamsToDisplay || teamsToDisplay.length === 0) return;
    
    setIsGeneratingBB(true);
    setBbResult(null);
    setShowBBModal(true);

    try {
        const teamIds = teamsToDisplay.map(t => t.id);
        const res = await fetch(`${API_BASE_URL}/api/ai-prematch/bet-builder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamIds, leagueId: selectedLeague.leagueId })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || data.details || 'Failed to generate Bet Builder');
        setBbResult(data);
    } catch (err) {
        setBbResult({ error: err.message });
    } finally {
        setIsGeneratingBB(false);
    }
  };

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
              <Activity size={40} className="text-purple-500 animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Fetching global standings and ranking top teams...</p>
          </div>
      );
  }

  if (error) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
              <AlertTriangle size={40} className="mb-4" />
              <p className="font-bold">Error loading standings</p>
              <p className="text-sm">{error}</p>
          </div>
      );
  }

  if (leagues.length === 0) {
      return (
          <div className="text-center py-20 text-gray-500 font-medium">
              No league data available at the moment.
          </div>
      );
  }

  const selectedLeague = leagues[selectedLeagueIndex];
  
  // Filter teams by selected date (if any)
  const teamsToDisplay = selectedLeague.teams.filter(team => {
      if (!filterDate) return true;
      return team.nextMatchDate === filterDate;
  });

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="p-2.5 sm:p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl shadow-sm border border-purple-200 dark:border-purple-800 shrink-0">
          <Bot className="text-purple-600 dark:text-purple-400" size={26} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">AI Prematch</h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Predicting outcomes for the absolute best 6 teams globally.</p>
        </div>
      </div>

      {/* Selectors Row */}
      <div className="mb-6 flex flex-col md:flex-row gap-3 sm:gap-4">
        <div className="w-full md:flex-1 md:max-w-md">
          <label htmlFor="league-select" className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Select League</label>
          <div className="relative">
            <select
                id="league-select"
                value={selectedLeagueIndex}
                onChange={(e) => setSelectedLeagueIndex(Number(e.target.value))}
                className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold py-3 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-colors cursor-pointer text-sm sm:text-base"
            >
                {leagues.map((league, idx) => (
                    <option key={league.leagueId} value={idx}>
                        {league.league}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
          </div>
        </div>

        <div className="w-full md:flex-1 md:max-w-md flex items-end gap-2">
          <div className="flex-1 min-w-0">
            <label htmlFor="date-filter" className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Filter by Match Date</label>
            <input
                id="date-filter"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold py-3 px-3 sm:px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-colors cursor-pointer text-sm sm:text-base"
            />
          </div>
          <button
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-3.5 sm:px-5 rounded-xl shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 h-[50px] mb-[1px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0"
              onClick={handleGenerateBB}
              disabled={isGeneratingBB || teamsToDisplay.length === 0}
              title="Generate AI Bet Builder Slip"
          >
              {isGeneratingBB ? <Activity size={18} className="animate-spin" /> : <Sparkles size={18} />}
              <span className="text-xs sm:text-sm font-bold">BB Slip</span>
          </button>
        </div>
      </div>

      {/* Teams List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 flex items-center gap-2.5 text-gray-900 dark:text-white">
              <Trophy className="text-yellow-500 shrink-0" size={22} />
              <span className="truncate">Top 6 Form - {selectedLeague.league}</span>
          </h2>

          {teamsToDisplay.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                  No top teams are scheduled to play on {filterDate}.
              </div>
          ) : (
              <div className="flex flex-col gap-3 sm:gap-4">
                  {teamsToDisplay.map((team, idx) => (
                      <React.Fragment key={team.id}>
                      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors bg-gray-50 dark:bg-gray-900/50">
                          
                          <div className="w-6 sm:w-8 flex-shrink-0 text-center font-black text-base sm:text-xl text-gray-400">
                              {idx + 1}
                          </div>

                          <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-sm p-1.5 sm:p-2 shrink-0">
                              <img src={team.logo} alt={team.name} className="w-full h-full object-contain" />
                          </div>

                          <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate">{team.name}</h3>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">
                                  <span>PTS: <span className="text-gray-900 dark:text-gray-200">{team.points}</span></span>
                                  <span>GD: <span className="text-gray-900 dark:text-gray-200">{team.goalsDiff > 0 ? '+'+team.goalsDiff : team.goalsDiff}</span></span>
                                  <span>P: <span className="text-gray-900 dark:text-gray-200">{team.played}</span></span>
                                  
                                  {/* Mobile Form Badges */}
                                  <div className="flex sm:hidden gap-0.5 items-center ml-auto">
                                      {team.form && team.form.split('').slice(-5).map((res, i) => (
                                          <span key={i} className={`w-3.5 h-3.5 rounded-[3px] flex items-center justify-center text-[8px] font-black text-white ${
                                              res === 'W' ? 'bg-green-500' : res === 'D' ? 'bg-yellow-500' : res === 'L' ? 'bg-red-500' : 'bg-gray-400'
                                          }`}>
                                              {res}
                                          </span>
                                      ))}
                                  </div>
                              </div>
                          </div>

                          <div className="hidden sm:flex gap-1 items-center mr-2 lg:mr-4 shrink-0">
                              {team.form && team.form.split('').map((res, i) => (
                                  <div key={i} className={`w-5 h-5 rounded-sm flex items-center justify-center text-[10px] font-bold text-white ${
                                      res === 'W' ? 'bg-green-500' : res === 'D' ? 'bg-yellow-500' : res === 'L' ? 'bg-red-500' : 'bg-gray-400'
                                  }`}>
                                      {res}
                                  </div>
                              ))}
                          </div>

                          <button
                              onClick={(e) => handleAiAnalysis(e, team.id)}
                              className="relative group flex items-center justify-center p-2.5 sm:p-3 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-all active:scale-95 border border-purple-200 dark:border-purple-700 shrink-0"
                              aria-label="Predict Next Match"
                          >
                              {predictions[team.id]?.loading ? (
                                  <Activity size={18} className="animate-spin" />
                              ) : (
                                  <Sparkles size={18} className={(predictions[team.id]?.text || predictions[team.id]?.error) ? "fill-current" : ""} />
                              )}
                              <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 font-bold shadow-lg">Predict Next Match</span>
                          </button>
                      </div>

                      {/* AI Prediction Expansion */}
                      {(predictions[team.id]?.loading || predictions[team.id]?.text || predictions[team.id]?.error) && (
                          <div className="mx-1 sm:mx-2 -mt-2 sm:-mt-3 mb-2 p-3 sm:p-5 pt-6 sm:pt-8 bg-purple-50/70 dark:bg-purple-900/20 border border-t-0 border-purple-200 dark:border-purple-800 rounded-b-xl animate-fade-in-down flex flex-col gap-3">
                              
                              {predictions[team.id]?.loading ? (
                                  <div className="flex items-center gap-3 text-xs sm:text-sm text-purple-600 dark:text-purple-400 py-4 font-bold justify-center text-center">
                                      <Activity size={18} className="animate-spin shrink-0" />
                                      Analyzing form, extracting Head-to-Head data, and formulating predictions...
                                  </div>
                              ) : predictions[team.id]?.error ? (
                                  <div className="text-xs sm:text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/30 p-3 sm:p-4 rounded-xl border border-red-200 dark:border-red-800 flex items-start gap-2.5">
                                      <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                      {predictions[team.id].error}
                                  </div>
                              ) : (
                                  <>
                                      <div className="flex items-center justify-between border-b border-purple-200 dark:border-purple-800 pb-3 mb-1 flex-wrap gap-2">
                                          <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
                                              <Bot size={16} className="shrink-0" />
                                              <span className="text-xs sm:text-sm font-black uppercase tracking-wider">Gemini Pre-Match Engine</span>
                                          </div>
                                          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-gray-500 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm shrink-0">
                                              <Calendar size={12} />
                                              {new Date(predictions[team.id].fixture.date).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                          </div>
                                      </div>
                                      
                                      <div className="flex items-center justify-center gap-2 sm:gap-6 my-2 sm:my-4 bg-white dark:bg-gray-800 p-3 sm:py-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                                              <img src={predictions[team.id].fixture.homeLogo} alt="" className="w-8 h-8 sm:w-10 sm:h-10 object-contain shrink-0" />
                                              <span className="text-[11px] sm:text-xs font-bold text-center truncate w-full">{predictions[team.id].fixture.home}</span>
                                          </div>
                                          <div className="text-sm sm:text-xl font-black text-gray-300 dark:text-gray-600 px-2 shrink-0">VS</div>
                                          <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                                              <img src={predictions[team.id].fixture.awayLogo} alt="" className="w-8 h-8 sm:w-10 sm:h-10 object-contain shrink-0" />
                                              <span className="text-[11px] sm:text-xs font-bold text-center truncate w-full">{predictions[team.id].fixture.away}</span>
                                          </div>
                                      </div>

                                      <div className="text-xs sm:text-[15px] text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-medium">
                                          {predictions[team.id].text}
                                      </div>

                                      {predictions[team.id].fixture?.homeId && predictions[team.id].fixture?.awayId && (
                                          <button 
                                              className="mt-2 sm:mt-4 w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-2.5 sm:py-3 px-4 rounded-xl shadow-sm hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-xs sm:text-sm"
                                              onClick={() => setSelectedCheatSheetMatch(predictions[team.id].fixture)}
                                          >
                                              <FileText size={16} /> View Match Cheat Sheet
                                          </button>
                                      )}
                                  </>
                              )}
                          </div>
                      )}
                      </React.Fragment>
                  ))}
              </div>
          )}
      </div>

      {/* Bet Builder Modal */}
      {showBBModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                  <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-purple-50 dark:bg-purple-900/20">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                              <Sparkles className="text-purple-600 dark:text-purple-300" size={20} />
                          </div>
                          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">AI Bet Builder Slip</h2>
                      </div>
                      <button 
                          onClick={() => setShowBBModal(false)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg"
                          aria-label="Close modal"
                      >
                          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                  </div>
                  
                  <div className="p-4 sm:p-6 overflow-y-auto">
                      {isGeneratingBB ? (
                          <div className="flex flex-col items-center justify-center py-10 sm:py-12">
                              <Activity size={40} className="text-purple-500 animate-spin mb-4" />
                              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2 text-center">Analyzing multiple matches...</p>
                              <p className="text-xs sm:text-sm text-gray-500 text-center max-w-sm">The AI is crunching the numbers for all visible teams to find the highest probability picks.</p>
                          </div>
                      ) : bbResult?.error ? (
                          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 sm:p-6 rounded-2xl text-center border border-red-200 dark:border-red-800">
                              <AlertTriangle size={28} className="mx-auto mb-2 sm:mb-3" />
                              <p className="font-bold text-sm sm:text-base">Generation Failed</p>
                              <p className="text-xs sm:text-sm mt-1">{bbResult.error}</p>
                          </div>
                      ) : bbResult?.betBuilder ? (
                          <div className="space-y-4 sm:space-y-6">
                              <div className="bg-gray-50 dark:bg-gray-900/50 p-3.5 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium whitespace-pre-wrap leading-relaxed font-mono text-xs sm:text-sm">
                                  {bbResult.betBuilder}
                              </div>
                              <div className="flex justify-end pt-2 sm:pt-4">
                                  <button 
                                      className="w-full sm:w-auto bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl shadow-md hover:bg-gray-800 dark:hover:bg-gray-100 transition-all text-sm"
                                      onClick={() => setShowBBModal(false)}
                                  >
                                      Close Slip
                                  </button>
                              </div>
                          </div>
                      ) : null}
                  </div>
              </div>
          </div>
      )}

      {/* Cheat Sheet Modal */}
      {selectedCheatSheetMatch && (
          <CheatSheetModal 
              match={selectedCheatSheetMatch} 
              onClose={() => setSelectedCheatSheetMatch(null)} 
          />
      )}
    </main>
  );
};

export default AiPrematch;
