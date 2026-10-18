import React, { useState, useEffect } from 'react';
import { Users, Goal, UserCheck, Activity } from 'lucide-react';
import { API_BASE_URL } from '../config';

const LEAGUES = [
    { id: 39, name: 'English Premier League' },
    { id: 140, name: 'LaLiga' },
    { id: 135, name: 'Serie A' },
    { id: 78, name: 'Bundesliga' },
    { id: 61, name: 'Ligue 1' },
    { id: 2, name: 'UEFA Champions League' },
    { id: 3, name: 'UEFA Europa League' },
    { id: 848, name: 'UEFA Conference League' },
    { id: 48, name: 'EFL Cup' },
    { id: 88, name: 'Eredivisie' },
    { id: 203, name: 'Super Lig' },
    { id: 103, name: 'Eliteserien' },
    { id: 113, name: 'Allsvenskan' },
    { id: 169, name: 'Chinese Super League' },
    { id: 98, name: 'J1 League' },
    { id: 292, name: 'K-League 1' },
    { id: 1, name: 'World Cup' },
    { id: 4, name: 'Euro Championship' },
    { id: 5, name: 'UEFA Nations League' },
    { id: 9, name: 'Copa America' },
    { id: 10, name: 'Friendlies' }
];

const PlayerStats = () => {
    const [selectedLeagueId, setSelectedLeagueId] = useState(39);
    const [stats, setStats] = useState({ topScorers: [], topAssists: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('scorers'); // 'scorers' or 'assists'

    useEffect(() => {
        fetchPlayerStats(selectedLeagueId);
    }, [selectedLeagueId]);

    const fetchPlayerStats = async (leagueId) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/player-stats/${leagueId}`);
            if (!res.ok) throw new Error('Failed to fetch player stats');
            const data = await res.json();
            setStats(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderPlayerCard = (playerData, type, index) => {
        const p = playerData.player;
        const s = playerData.statistics[0];
        
        return (
            <div key={p.id} className="flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                <div className="flex items-center p-3.5 sm:p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="text-xl sm:text-2xl font-black text-gray-300 dark:text-gray-600 mr-3 sm:mr-4 w-6 sm:w-8 text-center shrink-0">{index + 1}</div>
                    <img src={p.photo} alt={p.name} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm shrink-0" />
                    <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg truncate">{p.name}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
                            <img src={s.team.logo} alt={s.team.name} className="w-4 h-4 object-contain shrink-0" />
                            <span className="text-xs font-semibold text-gray-500 truncate">{s.team.name}</span>
                        </div>
                    </div>
                </div>
                
                <div className="p-3.5 sm:p-4 grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="text-center p-2.5 sm:p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400">
                        <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 opacity-70">
                            {type === 'scorers' ? 'Goals' : 'Assists'}
                        </div>
                        <div className="text-xl sm:text-2xl font-black">
                            {type === 'scorers' ? s.goals.total : s.goals.assists}
                        </div>
                    </div>
                    <div className="text-center p-2.5 sm:p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1 opacity-70">Matches</div>
                        <div className="text-xl sm:text-2xl font-black">{s.games.appearences}</div>
                    </div>
                    
                    <div className="col-span-2 flex justify-between items-center text-xs font-medium text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-yellow-400"></span> {s.cards.yellow}
                            <span className="w-2 h-2 rounded-full bg-red-500 ml-2"></span> {s.cards.red}
                        </div>
                        <div>
                            Rating: <span className="font-bold text-gray-900 dark:text-gray-200">{parseFloat(s.games.rating || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="p-2.5 sm:p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-800 shrink-0">
                    <Users className="text-indigo-600 dark:text-indigo-400" size={26} />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">Player Stats</h1>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Explore top performers across the biggest leagues.</p>
                </div>
            </div>

            <div className="mb-6 sm:mb-8">
                <label htmlFor="league-select" className="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2">Select Competition</label>
                <div className="relative w-full max-w-md">
                    <select
                        id="league-select"
                        value={selectedLeagueId}
                        onChange={(e) => setSelectedLeagueId(Number(e.target.value))}
                        className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold py-3 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-colors cursor-pointer text-sm sm:text-base"
                    >
                        {LEAGUES.map((league) => (
                            <option key={league.id} value={league.id}>
                                {league.name}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                        <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                    </div>
                </div>
            </div>

            {/* Tab Selection */}
            <div className="flex space-x-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-2 overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setActiveTab('scorers')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                        activeTab === 'scorers' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                    <Goal size={16} />
                    Top Scorers
                </button>
                <button
                    onClick={() => setActiveTab('assists')}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all ${
                        activeTab === 'assists' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                    <UserCheck size={16} />
                    Top Assists
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Activity size={32} className="animate-spin text-indigo-500 mb-4" />
                    <p className="font-medium text-sm">Fetching the latest player statistics...</p>
                </div>
            ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 sm:p-6 rounded-2xl font-medium border border-red-200 dark:border-red-800 text-sm">
                    {error}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 animate-fade-in-up">
                    {activeTab === 'scorers' && stats.topScorers.length === 0 && (
                        <div className="col-span-full py-10 text-center text-gray-500 text-sm">No goalscorer data available for this competition.</div>
                    )}
                    {activeTab === 'scorers' && stats.topScorers.map((p, idx) => renderPlayerCard(p, 'scorers', idx))}

                    {activeTab === 'assists' && stats.topAssists.length === 0 && (
                        <div className="col-span-full py-10 text-center text-gray-500 text-sm">No assists data available for this competition.</div>
                    )}
                    {activeTab === 'assists' && stats.topAssists.map((p, idx) => renderPlayerCard(p, 'assists', idx))}
                </div>
            )}
        </main>
    );
};

export default PlayerStats;
