import React from 'react';
import { SlidersHorizontal, RotateCcw, Check, Percent, Sparkles } from 'lucide-react';

export const getNumericConfidence = (conf) => {
  if (typeof conf === 'number' && !isNaN(conf)) return conf;
  if (typeof conf === 'string') {
    const num = parseFloat(conf);
    if (!isNaN(num)) return num;
    const lower = conf.toLowerCase();
    if (lower.includes('very high')) return 85;
    if (lower.includes('high')) return 75;
    if (lower.includes('medium')) return 65;
    if (lower.includes('low')) return 50;
  }
  return 0;
};

export const getConfidenceTier = (conf) => {
  const num = getNumericConfidence(conf);
  if (num >= 80) return '80+';
  if (num >= 70) return '70-79';
  if (num >= 60) return '60-69';
  if (num >= 50) return '50-59';
  return '<50';
};

export const getConfidenceColor = (confidence) => {
  const val = getNumericConfidence(confidence);
  if (val >= 80) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  if (val >= 70) return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  if (val >= 60) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  if (val >= 50) return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800';
  return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800';
};

const TIERS = [
  {
    id: '50-59',
    label: '50 - 59%',
    min: 50,
    max: 59.99,
    dotColor: 'bg-orange-500',
    activeClass: 'bg-orange-50 text-orange-800 border-orange-500 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-500 ring-2 ring-orange-500/20'
  },
  {
    id: '60-69',
    label: '60 - 69%',
    min: 60,
    max: 69.99,
    dotColor: 'bg-amber-500',
    activeClass: 'bg-amber-50 text-amber-800 border-amber-500 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-500 ring-2 ring-amber-500/20'
  },
  {
    id: '70-79',
    label: '70 - 79%',
    min: 70,
    max: 79.99,
    dotColor: 'bg-blue-500',
    activeClass: 'bg-blue-50 text-blue-800 border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-500 ring-2 ring-blue-500/20'
  },
  {
    id: '80+',
    label: '80%+',
    min: 80,
    max: 100,
    dotColor: 'bg-emerald-500',
    activeClass: 'bg-emerald-50 text-emerald-800 border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500 ring-2 ring-emerald-500/20'
  }
];

const PRESETS = [0, 50, 60, 70, 80];

const ConfidenceFilter = ({
  minConfidence = 0,
  onMinConfidenceChange,
  selectedTiers = [],
  onToggleTier,
  onReset,
  tierCounts = { all: 0, '50-59': 0, '60-69': 0, '70-79': 0, '80+': 0 },
  totalMatches = 0,
  filteredCount = 0
}) => {
  const isFiltered = minConfidence > 0 || selectedTiers.length > 0;
  const sliderPercentage = (minConfidence / 95) * 100;

  return (
    <div className="bg-gradient-to-r from-gray-50/80 via-indigo-50/20 to-gray-50/80 dark:from-gray-900/60 dark:via-indigo-950/20 dark:to-gray-900/60 p-3.5 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs flex flex-col gap-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <SlidersHorizontal size={15} />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              Confidence Filter
              {isFiltered && (
                <span className="text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </span>
          </div>
        </div>

        {isFiltered && (
          <button
            type="button"
            id="reset-confidence-filter-btn"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Reset Confidence</span>
          </button>
        )}
      </div>

      {/* 1. Percentage Dragger / Slider */}
      <div className="flex flex-col gap-1.5 bg-white dark:bg-gray-800/90 p-3 sm:p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Percent size={13} className="text-gray-400 dark:text-gray-500" />
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Percentage Dragger
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">Min:</span>
            <span
              className={`text-xs font-black px-2 py-0.5 rounded-md border ${
                minConfidence === 0
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                  : getConfidenceColor(minConfidence)
              }`}
            >
              {minConfidence === 0 ? 'All (0%)' : `≥ ${minConfidence}%`}
            </span>
          </div>
        </div>

        {/* Range Input Slider */}
        <div className="pt-2 pb-1 relative">
          <input
            type="range"
            id="confidence-percentage-slider"
            aria-label="Confidence percentage dragger"
            min="0"
            max="95"
            step="1"
            value={minConfidence}
            onChange={(e) => onMinConfidenceChange(Number(e.target.value))}
            className="confidence-range-slider"
            style={{
              background: `linear-gradient(to right, #4f46e5 0%, #7c3aed ${sliderPercentage}%, #e2e8f0 ${sliderPercentage}%, #e2e8f0 100%)`
            }}
          />
        </div>

        {/* Preset Tick Markers */}
        <div className="flex justify-between items-center text-[10px] sm:text-[11px] font-semibold text-gray-400 dark:text-gray-500 px-1 select-none">
          {PRESETS.map((val) => {
            const isCurrent = minConfidence === val;
            return (
              <button
                key={val}
                type="button"
                id={`preset-conf-${val}`}
                onClick={() => onMinConfidenceChange(val)}
                className={`transition-colors py-0.5 px-1.5 rounded hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer ${
                  isCurrent ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''
                }`}
              >
                {val === 0 ? 'All' : `${val}%`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. "Include" Confidence Tiers */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <span>Include Tiers:</span>
            <span className="text-[10px] font-normal text-gray-400 dark:text-gray-500 hidden sm:inline">
              (Multi-select brackets to isolate)
            </span>
          </span>
          {selectedTiers.length > 0 && (
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              {selectedTiers.length} selected
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* "All" button */}
          <button
            type="button"
            id="include-tier-all"
            onClick={() => {
              if (selectedTiers.length > 0 || minConfidence > 0) {
                onReset();
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
              selectedTiers.length === 0 && minConfidence === 0
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500'
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedTiers.length === 0 && minConfidence === 0
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {tierCounts.all ?? totalMatches}
            </span>
          </button>

          {/* Tier buttons */}
          {TIERS.map((tier) => {
            const isSelected = selectedTiers.includes(tier.id);
            const count = tierCounts[tier.id] || 0;

            return (
              <button
                key={tier.id}
                type="button"
                id={`include-tier-${tier.id}`}
                onClick={() => onToggleTier(tier.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none active:scale-95 ${
                  isSelected
                    ? tier.activeClass
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {isSelected ? (
                  <Check size={12} strokeWidth={3} className="shrink-0" />
                ) : (
                  <span className={`w-2 h-2 rounded-full shrink-0 ${tier.dotColor}`} />
                )}
                <span>{tier.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isSelected
                      ? 'bg-black/10 dark:bg-white/10'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Status Line */}
      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 font-medium pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
        <span className="flex items-center gap-1">
          <Sparkles size={11} className="text-indigo-500 shrink-0" />
          <span>
            Showing <strong className="text-gray-800 dark:text-gray-200 font-bold">{filteredCount}</strong> of{' '}
            <strong className="text-gray-800 dark:text-gray-200 font-bold">{totalMatches}</strong> matches
          </span>
        </span>
        {isFiltered && (
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold truncate max-w-[200px]">
            {minConfidence > 0 ? `≥${minConfidence}%` : ''}
            {minConfidence > 0 && selectedTiers.length > 0 ? ' & ' : ''}
            {selectedTiers.length > 0 ? `Tiers: ${selectedTiers.join(', ')}` : ''}
          </span>
        )}
      </div>
    </div>
  );
};

export default ConfidenceFilter;
