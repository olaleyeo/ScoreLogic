import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Moon, Sun, Activity, Clock, Home, Users, Bot, 
  User, Calendar, Menu, X, Flame, TrendingUp, ChevronRight 
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    title: 'Matches & In-Play',
    items: [
      { path: '/', label: 'Home', desc: 'All fixtures & custom bet slip builder', icon: Home, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60' },
      { path: '/todays-games', label: "Today's Games", desc: 'Match stats & pre-game analytics', icon: Calendar, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60' },
      { path: '/live-stats', label: 'Live Stats', desc: 'In-play momentum & real-time monitoring', icon: Activity, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60', isLive: true },
    ]
  },
  {
    title: 'AI & Smart Predictions',
    items: [
      { path: '/ai-prematch', label: 'AI Prematch', desc: 'Top global form & AI Bet Builder', icon: Bot, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60', isAi: true },
      { path: '/heatmap', label: 'Heatmap', desc: 'Daily market confidence matrix', icon: Flame, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60' },
    ]
  },
  {
    title: 'Tracking & Analytics',
    items: [
      { path: '/myteams', label: 'My Teams', desc: 'Tracked clubs & 14-day slip generator', icon: Users, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60' },
      { path: '/player-stats', label: 'Player Stats', desc: 'Top goalscorers & assists leaders', icon: User, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60' },
      { path: '/analytics', label: 'Analytics', desc: 'Strategy performance & win rate trends', icon: TrendingUp, color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60' },
      { path: '/history', label: 'History', desc: 'Past slips, results & bet archives', icon: Clock, color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800' },
    ]
  }
];

const FLAT_NAV_ITEMS = NAV_SECTIONS.flatMap(s => s.items);

const Navbar = ({ darkMode, setDarkMode }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu whenever route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-black text-base shadow-sm group-hover:scale-105 transition-transform">
                SL
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-600 dark:from-indigo-400 dark:via-purple-400 dark:to-violet-400 bg-clip-text text-transparent tracking-tight leading-none">
                  ScoreLogic
                </span>
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase mt-0.5">
                  Sports Analytics
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links (>= 1024px) */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5" aria-label="Main Navigation">
            {FLAT_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-2 rounded-xl text-xs xl:text-sm font-bold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={15} className={item.isLive && !active ? 'text-emerald-500 animate-pulse' : ''} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Controls: Dark Mode Toggle & Mobile Menu Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              aria-label="Toggle dark mode"
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Mobile Hamburger / Close Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className={`lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all border ${
                mobileMenuOpen
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-400'
                  : 'bg-gray-100 border-transparent text-gray-700 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {mobileMenuOpen ? (
                <>
                  <X size={18} />
                  <span>Close</span>
                </>
              ) : (
                <>
                  <Menu size={18} />
                  <span>Menu</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Expandable Categorized Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop for tapping outside to close */}
          <div 
            className="lg:hidden fixed inset-0 top-16 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="lg:hidden relative z-50 border-t border-gray-200 dark:border-gray-800 bg-white/98 dark:bg-gray-900/98 backdrop-blur-md max-h-[calc(100dvh-4rem)] overflow-y-auto animate-fade-in shadow-2xl transition-all">
            <div className="max-w-xl mx-auto px-4 py-5 space-y-6">
            {NAV_SECTIONS.map((section, sIdx) => (
              <div key={sIdx} className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2">
                  {section.title}
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between p-3.5 rounded-2xl transition-all border ${
                          active 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                            : 'bg-gray-50/70 hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800 border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                            active ? 'bg-white/20 text-white' : item.color
                          }`}>
                            <Icon size={20} />
                          </div>
                          
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm sm:text-base leading-tight truncate">{item.label}</span>
                              {item.isLive && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  active ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white animate-pulse'
                                }`}>
                                  Live
                                </span>
                              )}
                              {item.isAi && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  active ? 'bg-white text-purple-600' : 'bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300'
                                }`}>
                                  AI
                                </span>
                              )}
                            </div>
                            <p className={`text-xs mt-0.5 truncate ${
                              active ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {item.desc}
                            </p>
                          </div>
                        </div>

                        <ChevronRight size={18} className={`shrink-0 ml-2 ${
                          active ? 'text-white' : 'text-gray-400 dark:text-gray-500'
                        }`} />
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Bottom Status Card inside Menu */}
            <div className="pt-2">
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 text-center flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">ScoreLogic AI Suite</span>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">v1.0 Ready</span>
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </header>
  );
};

export default Navbar;
