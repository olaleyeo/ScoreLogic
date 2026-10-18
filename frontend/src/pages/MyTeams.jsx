import React, { useState } from 'react';
import { Users, Search, GripHorizontal, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import teamLogos from '../assets/teamLogos.json';
import { API_BASE_URL } from '../config';

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

  // Generated slip states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMatches, setGeneratedMatches] = useState([]);
  const [showGeneratedSlip, setShowGeneratedSlip] = useState(false);
  const [savingSlip, setSavingSlip] = useState(false);

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

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedMatches([]);
    setShowGeneratedSlip(false);

    try {
      let allMatches = [];
      const today = new Date();
      
      // Fetch the next 14 days sequentially to ensure we capture the 2 upcoming matches for most teams
      for (let i = 0; i < 14; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/slips?strategy=Over15&date=${dateStr}`);
            if (response.ok) {
                const data = await response.json();
                allMatches = allMatches.concat(data.matches || []);
            }
        } catch (e) {
            console.error(`Error fetching date ${dateStr}:`, e);
        }
      }

      // Filter matches to include only those involving any of the tracked teams
      const myTeamsLower = MY_TEAMS.map(t => t.toLowerCase());
      
      const filtered = allMatches.filter(match => {
        const homeLower = match.homeTeam.toLowerCase();
        const awayLower = match.awayTeam.toLowerCase();
        
        // Exact or substring match in case team names slightly differ from the API names
        return myTeamsLower.some(t => homeLower.includes(t) || awayLower.includes(t) || t.includes(homeLower) || t.includes(awayLower));
      });

      // Deduplicate matches just in case
      const uniqueMatches = Array.from(new Map(filtered.map(m => [m.matchId, m])).values());

      setGeneratedMatches(uniqueMatches);
      setShowGeneratedSlip(true);
    } catch (err) {
      console.error('Error generating slip:', err);
      alert('Failed to generate slip: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSlip = async () => {
    if (generatedMatches.length === 0) return;
    setSavingSlip(true);
    try {
      const todayFormatted = new Date().toISOString().split('T')[0];
      const totalOdds = generatedMatches.reduce((acc, m) => acc * (m.marketOdds || 1.0), 1);
      
      const payload = {
          date: todayFormatted,
          type: 'custom',
          totalOdds: parseFloat(totalOdds.toFixed(2)),
          matches: generatedMatches
      };
      
      const response = await fetch(`${API_BASE_URL}/api/slips/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      
      if (!response.ok) throw new Error('Failed to save slip');
      alert('Generated Slip saved successfully! You can view it in the History page.');
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md max-h-[88vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 border border-gray-100 dark:border-gray-700"
            >
              <div className="p-5 sm:p-6 flex flex-col items-center">
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
                    <div className="space-y-2.5 max-h-[40vh] overflow-y-auto pr-1">
                      {upcomingMatches.map((match) => (
                        <div key={match.id} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-indigo-500 uppercase">{match.league}</span>
                            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                              {new Date(match.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className={`text-xs sm:text-sm ${match.home === selectedTeam ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-600 dark:text-gray-300'}`}>{match.home}</span>
                            <span className="text-xs text-gray-400 mx-2">vs</span>
                            <span className={`text-xs sm:text-sm ${match.away === selectedTeam ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-600 dark:text-gray-300'}`}>{match.away}</span>
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
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-xs sm:text-sm"
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
              className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-6 sm:right-6 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] sm:max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
          >
              <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-3 sm:p-3.5 flex justify-between items-center select-none">
                  <div className="flex items-center gap-2 text-white">
                      <GripHorizontal size={18} className="opacity-70 hidden sm:block cursor-grab" />
                      <span className="font-bold text-sm">Generated Slip ({generatedMatches.length})</span>
                  </div>
                  <button onClick={() => setShowGeneratedSlip(false)} className="text-white opacity-70 hover:opacity-100 p-1 transition-opacity">
                      <X size={18} />
                  </button>
              </div>

              <div className="p-3 sm:p-4 overflow-y-auto flex-1 bg-gray-50/50 dark:bg-gray-800/50 max-h-[45vh]">
                  {generatedMatches.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                          No matches available today for your tracked teams using the Over 1.5 strategy.
                      </div>
                  ) : (
                      <div className="space-y-2.5">
                          {generatedMatches.map(match => (
                              <div key={match.matchId} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 shadow-xs relative">
                                  <div className="flex justify-between items-start mb-1.5 pr-4">
                                      <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">{match.league}</span>
                                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{match.marketOdds?.toFixed(2)}</span>
                                  </div>
                                  <h4 className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 mb-1">{match.homeTeam} <span className="text-gray-400 font-normal">vs</span> {match.awayTeam}</h4>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400">Market: {match.selectedMarket}</p>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {generatedMatches.length > 0 && (
                  <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                      <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Odds</span>
                          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                              {generatedMatches.reduce((acc, m) => acc * (m.marketOdds || 1.0), 1).toFixed(2)}
                          </span>
                      </div>
                      <button 
                          onClick={handleSaveSlip}
                          disabled={savingSlip}
                          className={`w-full py-2.5 rounded-xl font-bold text-white shadow-md transition-colors text-xs sm:text-sm flex items-center justify-center gap-2 ${savingSlip ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      >
                          {savingSlip ? 'Saving...' : 'Save Slip'}
                      </button>
                  </div>
              )}
          </motion.div>
      )}

    </main>
  );
};

export default MyTeams;
