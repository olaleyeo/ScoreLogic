import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { API_BASE_URL } from '../config';
import ConfidenceFilter, { getNumericConfidence, getConfidenceTier } from '../components/ConfidenceFilter';

const Heatmap = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPredIndex, setSelectedPredIndex] = useState(null);

  // Confidence Filter states
  const [minConfidence, setMinConfidence] = useState(0);
  const [selectedConfidenceTiers, setSelectedConfidenceTiers] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/predictions?date=today`)
      .then(res => res.json())
      .then(data => {
        setPredictions(data.predictions || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const tierCounts = useMemo(() => {
    const counts = {
      all: predictions.length,
      '50-59': 0,
      '60-69': 0,
      '70-79': 0,
      '80+': 0
    };
    predictions.forEach(p => {
      const tier = getConfidenceTier(p.confidence);
      if (counts[tier] !== undefined) {
        counts[tier]++;
      }
    });
    return counts;
  }, [predictions]);

  const handleSliderChange = (newVal) => {
    const val = Number(newVal);
    setMinConfidence(val);

    if (val > 0 && selectedConfidenceTiers.length > 0) {
      const tierMaxValues = {
        '50-59': 59.99,
        '60-69': 69.99,
        '70-79': 79.99,
        '80+': 100
      };
      const highestSelectedTierMax = Math.max(
        ...selectedConfidenceTiers.map(t => tierMaxValues[t] || 0)
      );
      if (val > highestSelectedTierMax) {
        setSelectedConfidenceTiers([]);
      }
    }
  };

  const handleToggleTier = (tierId) => {
    setSelectedConfidenceTiers(prev => {
      const next = prev.includes(tierId)
        ? prev.filter(t => t !== tierId)
        : [...prev, tierId];

      if (next.length > 0) {
        const tierMinValues = {
          '50-59': 50,
          '60-69': 60,
          '70-79': 70,
          '80+': 80
        };
        const lowestSelectedMin = Math.min(...next.map(t => tierMinValues[t] || 0));
        if (minConfidence > lowestSelectedMin) {
          setMinConfidence(0);
        }
      }
      return next;
    });
  };

  const handleResetConfidenceFilter = () => {
    setMinConfidence(0);
    setSelectedConfidenceTiers([]);
  };

  const displayedPredictions = predictions.filter(p => {
    const conf = getNumericConfidence(p.confidence);
    if (minConfidence > 0 && conf < minConfidence) return false;
    if (selectedConfidenceTiers.length > 0) {
      const tier = getConfidenceTier(p.confidence);
      if (!selectedConfidenceTiers.includes(tier)) return false;
    }
    return true;
  });

  const getHeatmapColor = (confidence) => {
    if (typeof confidence === 'string' && isNaN(Number(confidence))) {
        switch (confidence) {
          case 'Very High': return 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]';
          case 'High': return 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
          case 'Medium': return 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] text-yellow-900';
          case 'Low': return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
          default: return 'bg-gray-500';
        }
    }
    
    const num = Number(confidence);
    if (num >= 80) return 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]';
    if (num >= 60) return 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]';
    if (num >= 40) return 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)] text-yellow-900';
    return 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Daily Prediction Heatmap</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:hidden">Tap any card to view detailed match odds</p>
        </div>
        <div className="flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1.5 text-xs font-medium">
          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500"></div> Very High</span>
          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> High</span>
          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div> Medium</span>
          <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Low</span>
        </div>
      </div>

      {/* Confidence Filter Bar */}
      <ConfidenceFilter
        minConfidence={minConfidence}
        onMinConfidenceChange={handleSliderChange}
        selectedTiers={selectedConfidenceTiers}
        onToggleTier={handleToggleTier}
        onReset={handleResetConfidenceFilter}
        tierCounts={tierCounts}
        totalMatches={predictions.length}
        filteredCount={displayedPredictions.length}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-4">
        {predictions.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-12 text-sm">No predictions found for today.</div>
        ) : displayedPredictions.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 py-12 px-4 flex flex-col items-center">
            <p className="font-bold text-sm mb-1 text-gray-800 dark:text-gray-200">No predictions match your confidence criteria</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Try adjusting the percentage dragger or selecting other confidence tiers.</p>
            <button
              onClick={handleResetConfidenceFilter}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Reset Confidence Filter
            </button>
          </div>
        ) : (
          displayedPredictions.map((pred, i) => (
            <motion.div 
              key={pred.matchId || i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.03, 0.5), duration: 0.3 }}
              onClick={() => setSelectedPredIndex(selectedPredIndex === i ? null : i)}
              className={`relative group aspect-square rounded-xl p-2.5 sm:p-3 flex flex-col justify-center items-center text-center cursor-pointer transition-all duration-200 text-white select-none ${getHeatmapColor(pred.confidence)}`}
            >
              <div className="font-bold text-xs sm:text-sm mb-1 line-clamp-2 leading-tight">
                {pred.homeTeam} <br/> <span className="text-[10px] sm:text-xs font-normal opacity-75">vs</span> <br/> {pred.awayTeam}
              </div>
              <div className="text-base sm:text-xl font-black truncate max-w-full">{pred.selectedMarket}</div>
              
              {/* Tooltip Overlay (Hover on Desktop, Tap-toggle on Mobile) */}
              <div 
                className={`absolute inset-0 flex flex-col justify-center transition-opacity duration-200 bg-gray-900/95 text-white text-[11px] sm:text-xs rounded-xl p-2.5 sm:p-3 z-10 shadow-xl border border-gray-700 ${
                  selectedPredIndex === i ? 'opacity-100 pointer-events-auto ring-2 ring-white/50' : 'opacity-0 group-hover:opacity-100 pointer-events-none'
                }`}
              >
                <div className="font-semibold text-indigo-300 mb-0.5 line-clamp-1">{pred.league}</div>
                <div className="line-clamp-2 leading-tight mb-1 text-[10px] sm:text-xs text-gray-300">{pred.homeTeam} vs {pred.awayTeam}</div>
                <div>0:0 Odds: <span className="font-bold text-white">{pred.zeroZeroOdds?.toFixed(2) || 'N/A'}</span></div>
                <div>Pred: <span className="font-bold text-indigo-300">{pred.selectedMarket}</span></div>
                <div className="font-bold mt-1 text-green-400">Conf: {pred.confidence}</div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </main>
  );
};

export default Heatmap;
