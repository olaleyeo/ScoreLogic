import React, { useRef } from 'react';
import { toPng } from 'html-to-image';
import { motion } from 'framer-motion';

const SlipCard = ({ title, slip, delay = 0, excludedMatches = [], onToggleExclude = null, onDelete = null }) => {
    const cardRef = useRef(null);

    if (!slip || !slip.matches) return null;

    const getConfidenceColor = (confidence) => {
        if (typeof confidence === 'string') {
            switch (confidence) {
                case 'Very High': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800 dark:shadow-[0_0_8px_rgba(74,222,128,0.4)]';
                case 'High': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 dark:shadow-[0_0_8px_rgba(96,165,250,0.4)]';
                case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800 dark:shadow-[0_0_8px_rgba(250,204,21,0.4)]';
                case 'Low': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 dark:shadow-[0_0_8px_rgba(248,113,113,0.4)]';
                default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
            }
        }
        
        if (confidence >= 80) return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800 dark:shadow-[0_0_8px_rgba(74,222,128,0.4)]';
        if (confidence >= 60) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800 dark:shadow-[0_0_8px_rgba(96,165,250,0.4)]';
        if (confidence >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:border-yellow-800 dark:shadow-[0_0_8px_rgba(250,204,21,0.4)]';
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 dark:shadow-[0_0_8px_rgba(248,113,113,0.4)]';
    };

    const handleCopyText = () => {
        let text = `${title}\n------------------\n`;
        slip.matches.forEach(m => {
            text += `${m.homeTeam} vs ${m.awayTeam} (${m.league})\n`;
            text += `Market: ${m.selectedMarket}\n`;
            text += `0:0 Odds: ${m.zeroZeroOdds.toFixed(2)}\n`;
            text += `Market Odds: ${m.marketOdds.toFixed(2)}\n\n`;
        });
        text += `Total Slip Odds: ${slip.totalOdds.toFixed(2)}`;
        
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    const handleWhatsApp = () => {
        let text = `${title.toUpperCase()}\n`;
        slip.matches.forEach(m => {
            text += `${m.homeTeam} vs ${m.awayTeam} - ${m.selectedMarket} (${m.marketOdds.toFixed(2)})\n`;
        });
        text += `Total Odds: ${slip.totalOdds.toFixed(2)}`;
        
        const encodedText = encodeURIComponent(text);
        window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    };

    const handleScreenshot = async () => {
        if (!cardRef.current) return;
        try {
            const dataUrl = await toPng(cardRef.current, { cacheBust: true, backgroundColor: null });
            const link = document.createElement('a');
            link.download = `${title.replace(/\s+/g, '-')}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to take screenshot', err);
            alert(`Screenshot failed: ${err.message || 'Unknown error'}`);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="flex flex-col h-fit gap-4"
        >
            <motion.div whileHover={{ scale: 1.02 }} ref={cardRef} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col transition-all duration-300 relative">
                
                {/* Status Overlays */}
                {slip.status === 'won' && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none opacity-20 rotate-[-15deg]">
                        <span className="text-8xl font-black text-green-500 tracking-widest drop-shadow-2xl">BOOM!</span>
                    </div>
                )}
                {slip.status === 'lost' && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none opacity-20">
                        <span className="text-9xl font-black text-red-500 drop-shadow-2xl">X</span>
                    </div>
                )}

                <div className="bg-indigo-600 dark:bg-indigo-700 px-4 sm:px-6 py-3.5 sm:py-4 relative z-20">
                    <h3 className="text-lg sm:text-xl font-bold text-white flex justify-between items-center">
                        <span className="truncate mr-2">{title}</span>
                        <span className="text-indigo-200 dark:text-indigo-300 text-xs sm:text-sm font-medium shrink-0">Target: {slip.targetOdds}</span>
                    </h3>
                </div>
                
                <div className="flex-1 p-4 sm:p-6 space-y-3 sm:space-y-4 relative z-20">
                    {slip.matches.length === 0 ? (
                        <div className="text-gray-500 dark:text-gray-400 italic text-center py-4 text-sm">No matches available to build this slip.</div>
                    ) : (
                        slip.matches.map((match, idx) => (
                            <div key={match.matchId} className={`border-b border-gray-100 dark:border-gray-700 pb-3 sm:pb-4 last:border-0 last:pb-0 relative transition-opacity ${excludedMatches.includes(match.matchId) ? 'opacity-40 grayscale' : ''}`}>
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider truncate">{match.league}</span>
                                    <div className="text-right flex flex-col items-end gap-1 shrink-0">
                                        {onToggleExclude && (
                                            <label className="flex items-center gap-1.5 cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 px-2 py-0.5 rounded-full transition-colors mb-1">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-gray-400 text-red-500 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50 h-3 w-3"
                                                    checked={excludedMatches.includes(match.matchId)}
                                                    onChange={() => onToggleExclude(match.matchId)}
                                                />
                                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Remove</span>
                                            </label>
                                        )}
                                        <span className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 block">0:0 @ {match.zeroZeroOdds?.toFixed(2)}</span>
                                        {match.score && (
                                            <div className="flex items-center gap-1 mt-1 justify-end">
                                                {match.status === 'live' && (
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                    </span>
                                                )}
                                                <span className={`block text-xs font-bold ${match.status === 'won' ? 'text-green-500' : match.status === 'lost' ? 'text-red-500' : match.status === 'live' ? 'text-red-500' : 'text-gray-500'}`}>
                                                    Score: {match.score} {(match.status === 'won' || match.status === 'lost') && 'Ft'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <h4 className="font-semibold text-sm sm:text-base text-gray-800 dark:text-gray-200 mb-1.5 leading-snug">{match.homeTeam} <span className="text-gray-400 dark:text-gray-500 text-xs">vs</span> {match.awayTeam}</h4>
                                
                                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-2 sm:p-2.5 rounded-lg mb-2 border border-transparent dark:border-gray-700">
                                    <span className="font-semibold text-xs sm:text-sm text-gray-700 dark:text-gray-300">{match.selectedMarket}</span>
                                    <span className="font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-400">{match.marketOdds?.toFixed(2)}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400">Confidence:</span>
                                    <span className={`text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded border transition-colors ${getConfidenceColor(match.confidence)}`}>
                                        {typeof match.confidence === 'number' ? `${match.confidence}%` : match.confidence}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {slip.matches.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-gray-100 dark:border-gray-700 mt-auto transition-colors relative z-20">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400 font-medium text-sm sm:text-base">Total Odds</span>
                            <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">{slip.totalOdds?.toFixed(2)}</span>
                        </div>
                    </div>
                )}
            </motion.div>

            {slip.matches.length > 0 && (
                <div className={`grid ${onDelete ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'} gap-2`}>
                    <button onClick={handleCopyText} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 text-gray-700 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center">
                        Copy
                    </button>
                    <button onClick={handleWhatsApp} className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center">
                        WhatsApp
                    </button>
                    <button onClick={handleScreenshot} className="bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-800 dark:text-indigo-200 text-indigo-700 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center">
                        Screenshot
                    </button>
                    {onDelete && (
                        <button onClick={onDelete} className="bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:hover:bg-red-800 dark:text-red-200 text-red-700 py-2.5 px-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center">
                            Delete
                        </button>
                    )}
                </div>
            )}
        </motion.div>
    );
};

export default SlipCard;
