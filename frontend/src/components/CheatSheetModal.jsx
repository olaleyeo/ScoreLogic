import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, Shield, Sword, Target, Goal, X } from 'lucide-react';
import { API_BASE_URL } from '../config';

const CheatSheetModal = ({ match, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mobilePlayerTab, setMobilePlayerTab] = useState('home'); // 'home' or 'away' for mobile

    useEffect(() => {
        const fetchCheatSheet = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/ai-prematch/cheat-sheet?homeId=${match.homeId}&awayId=${match.awayId}&leagueId=${match.leagueId}`);
                if (!res.ok) throw new Error('Failed to load Cheat Sheet');
                const json = await res.json();
                setData(json);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchCheatSheet();
    }, [match]);

    if (!match) return null;

    // Helper for generating hit rate dots
    const renderDots = (value, threshold) => {
        const dots = [];
        const hitProbability = Math.min((value / threshold) * 5, 5); // 0 to 5
        for (let i = 0; i < 5; i++) {
            if (i < hitProbability) {
                dots.push(<div key={i} className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-green-500 shadow-sm" />);
            } else {
                dots.push(<div key={i} className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-red-500 shadow-sm" />);
            }
        }
        return <div className="flex gap-1 justify-center">{dots}</div>;
    };

    const renderPlayerTable = (players, type) => (
        <div className="w-full overflow-x-auto no-scrollbar text-xs font-medium">
            <div className="min-w-[340px]">
                <div className="grid grid-cols-6 bg-white/50 dark:bg-gray-800/50 py-2 px-1 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-center uppercase tracking-wider text-[10px]">
                    <div className="col-span-2 text-left px-2">Player</div>
                    <div>Mins</div>
                    {type === 'defensive' && <><div>Fouls</div><div>Tackles</div><div>Cards</div></>}
                    {type === 'offensive' && <><div>Fouls Won</div><div>Assists</div><div>Rating</div></>}
                    {type === 'shooting' && <><div>Shots</div><div>SoT</div><div>Rating</div></>}
                    {type === 'goalscoring' && <><div>Goals</div><div>Assists</div><div>Rating</div></>}
                </div>
                <div className="flex flex-col">
                    {players.map((p, i) => (
                        <div key={i} className="grid grid-cols-6 py-2 px-1 border-b border-gray-100 dark:border-gray-800 hover:bg-white/50 dark:hover:bg-gray-800 transition-colors text-center items-center">
                            <div className="col-span-2 text-left px-2 truncate font-bold text-gray-900 dark:text-gray-100">{p.name}</div>
                            <div className="text-gray-700 dark:text-gray-300">{p.minutes}</div>
                            {type === 'defensive' && <><div className="text-gray-700 dark:text-gray-300">{p.foulsCommitted}</div><div className="text-gray-700 dark:text-gray-300">{p.tackles}</div><div className="text-gray-700 dark:text-gray-300">{p.yellowCards}Y {p.redCards}R</div></>}
                            {type === 'offensive' && <><div className="text-gray-700 dark:text-gray-300">{p.foulsDrawn}</div><div className="text-gray-700 dark:text-gray-300">{p.assists}</div><div className="text-gray-700 dark:text-gray-300 font-bold">{p.rating}</div></>}
                            {type === 'shooting' && <><div className="text-gray-700 dark:text-gray-300">{p.shots}</div><div className="text-gray-700 dark:text-gray-300 font-bold">{p.shotsOnTarget}</div><div className="text-gray-700 dark:text-gray-300">{p.rating}</div></>}
                            {type === 'goalscoring' && <><div className="text-gray-700 dark:text-gray-300 font-black text-indigo-600 dark:text-indigo-400">{p.goals}</div><div className="text-gray-700 dark:text-gray-300">{p.assists}</div><div className="text-gray-700 dark:text-gray-300">{p.rating}</div></>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-100 dark:bg-gray-900 w-full max-w-7xl h-[100dvh] sm:h-[95vh] rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-0 sm:border border-gray-200 dark:border-gray-700">
                
                {/* Header */}
                <div className="flex justify-between items-center p-3 sm:p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <h2 className="text-base sm:text-xl font-black uppercase tracking-wider sm:tracking-widest text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        <Activity className="text-purple-500 shrink-0" size={20} /> 
                        <span className="truncate">Match Cheat Sheet</span>
                    </h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors shrink-0"
                        aria-label="Close Cheat Sheet"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center py-20">
                            <Activity size={48} className="text-blue-500 animate-spin mb-4" />
                            <p className="font-bold text-gray-600 dark:text-gray-300">Compiling Massive Data Set...</p>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center text-red-500 py-20">
                            <AlertTriangle size={64} className="mb-4" />
                            <p className="font-bold text-xl">{error}</p>
                        </div>
                    ) : data && (
                        <div className="flex flex-col gap-4">
                            
                            {/* Top Teams Header Banner */}
                            <div className="flex w-full rounded-xl overflow-hidden shadow-sm">
                                <div className="flex-1 bg-blue-500 dark:bg-blue-600 text-white p-2.5 sm:p-4 flex items-center justify-center gap-2 sm:gap-4 font-black text-xs sm:text-lg md:text-2xl uppercase tracking-wider text-center">
                                    <img src={match.homeLogo} alt="" className="w-6 h-6 sm:w-10 sm:h-10 object-contain drop-shadow-md shrink-0" />
                                    <span className="truncate">{match.home}</span>
                                </div>
                                <div className="flex-1 bg-red-500 dark:bg-red-600 text-white p-2.5 sm:p-4 flex items-center justify-center gap-2 sm:gap-4 font-black text-xs sm:text-lg md:text-2xl uppercase tracking-wider text-center">
                                    <img src={match.awayLogo} alt="" className="w-6 h-6 sm:w-10 sm:h-10 object-contain drop-shadow-md shrink-0" />
                                    <span className="truncate">{match.away}</span>
                                </div>
                            </div>

                            {/* Team Averages & Hit Rates */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                {/* Home Team Stats */}
                                <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-3 sm:p-4">
                                    <div className="flex items-center gap-2 mb-3 font-bold text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                                        <img src={match.homeLogo} alt="" className="w-4 h-4 object-contain" />
                                        <span>{match.home} Averages</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                                            <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-1">Goals For</div>
                                            <div className="font-black text-base sm:text-lg">{data.homeTeam.goalsFor}</div>
                                        </div>
                                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                                            <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-1">Goals Against</div>
                                            <div className="font-black text-base sm:text-lg">{data.homeTeam.goalsAgainst}</div>
                                        </div>
                                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg col-span-2">
                                            <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-1">Over 2.5 Hit Rate</div>
                                            <div className="mt-1.5">{renderDots(parseFloat(data.homeTeam.goalsFor) + parseFloat(data.homeTeam.goalsAgainst), 2.5)}</div>
                                        </div>
                                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                                            <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-1">Clean Sheets</div>
                                            <div className="font-black text-base sm:text-lg">{data.homeTeam.cleanSheets}</div>
                                        </div>
                                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                                            <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-1">Cards p/g</div>
                                            <div className="font-black text-base sm:text-lg">{data.homeTeam.cards}</div>
                                        </div>
                                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg col-span-2">
                                            <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 mb-1">Over 4.5 Cards Hit Rate</div>
                                            <div className="mt-1.5">{renderDots(parseFloat(data.homeTeam.cards) * 2, 4.5)}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Away Team Stats */}
                                <div className="bg-red-50/50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-3 sm:p-4">
                                    <div className="flex items-center gap-2 mb-3 font-bold text-xs sm:text-sm text-red-700 dark:text-red-300">
                                        <img src={match.awayLogo} alt="" className="w-4 h-4 object-contain" />
                                        <span>{match.away} Averages</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                                        <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg">
                                            <div className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 mb-1">Goals For</div>
                                            <div className="font-black text-base sm:text-lg">{data.awayTeam.goalsFor}</div>
                                        </div>
                                        <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg">
                                            <div className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 mb-1">Goals Against</div>
                                            <div className="font-black text-base sm:text-lg">{data.awayTeam.goalsAgainst}</div>
                                        </div>
                                        <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg col-span-2">
                                            <div className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 mb-1">Over 2.5 Hit Rate</div>
                                            <div className="mt-1.5">{renderDots(parseFloat(data.awayTeam.goalsFor) + parseFloat(data.awayTeam.goalsAgainst), 2.5)}</div>
                                        </div>
                                        <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg">
                                            <div className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 mb-1">Clean Sheets</div>
                                            <div className="font-black text-base sm:text-lg">{data.awayTeam.cleanSheets}</div>
                                        </div>
                                        <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg">
                                            <div className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 mb-1">Cards p/g</div>
                                            <div className="font-black text-base sm:text-lg">{data.awayTeam.cards}</div>
                                        </div>
                                        <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-lg col-span-2">
                                            <div className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 mb-1">Over 4.5 Cards Hit Rate</div>
                                            <div className="mt-1.5">{renderDots(parseFloat(data.awayTeam.cards) * 2, 4.5)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Mobile Team Switcher for Player Categories */}
                            <div className="md:hidden flex rounded-xl p-1 bg-gray-200 dark:bg-gray-800 gap-1 mt-2">
                                <button
                                    onClick={() => setMobilePlayerTab('home')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                                        mobilePlayerTab === 'home'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    <img src={match.homeLogo} alt="" className="w-4 h-4 object-contain" />
                                    <span className="truncate">{match.home} Players</span>
                                </button>
                                <button
                                    onClick={() => setMobilePlayerTab('away')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                                        mobilePlayerTab === 'away'
                                            ? 'bg-red-600 text-white shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    <img src={match.awayLogo} alt="" className="w-4 h-4 object-contain" />
                                    <span className="truncate">{match.away} Players</span>
                                </button>
                            </div>

                            {/* Player Categories */}
                            {[
                                { title: 'Defensive', type: 'defensive', icon: Shield, bg: 'bg-gray-200 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-200' },
                                { title: 'Offensive', type: 'offensive', icon: Sword, bg: 'bg-gray-200 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-200' },
                                { title: 'Shooting', type: 'shooting', icon: Target, bg: 'bg-gray-200 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-200' },
                                { title: 'Goalscoring', type: 'goalscoring', icon: Goal, bg: 'bg-gray-200 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-200' }
                            ].map((category, idx) => (
                                <div key={idx} className="flex flex-col rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
                                    <div className={`w-full text-center py-2 font-black uppercase tracking-[0.2em] text-xs sm:text-sm flex justify-center items-center gap-2 ${category.bg} ${category.text}`}>
                                        <category.icon size={16} /> {category.title}
                                    </div>
                                    
                                    {/* Desktop View: Side by side Home and Away */}
                                    <div className="hidden md:flex divide-x divide-gray-200 dark:divide-gray-700">
                                        <div className="flex-1 bg-blue-50/30 dark:bg-blue-900/10">
                                            {renderPlayerTable(data.players[category.type].home, category.type)}
                                        </div>
                                        <div className="flex-1 bg-red-50/30 dark:bg-red-900/10">
                                            {renderPlayerTable(data.players[category.type].away, category.type)}
                                        </div>
                                    </div>

                                    {/* Mobile View: Shows selected team tab */}
                                    <div className="block md:hidden">
                                        {mobilePlayerTab === 'home' ? (
                                            <div className="bg-blue-50/30 dark:bg-blue-900/10">
                                                {renderPlayerTable(data.players[category.type].home, category.type)}
                                            </div>
                                        ) : (
                                            <div className="bg-red-50/30 dark:bg-red-900/10">
                                                {renderPlayerTable(data.players[category.type].away, category.type)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheatSheetModal;
