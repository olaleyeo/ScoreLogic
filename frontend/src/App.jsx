import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Heatmap from './pages/Heatmap';
import History from './pages/History';
import Analytics from './pages/Analytics';
import MyTeams from './pages/MyTeams';
import AiPrematch from './pages/AiPrematch';
import LiveStats from './pages/LiveStats';
import PlayerStats from './pages/PlayerStats';
import TodaysGames from './pages/TodaysGames';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 text-gray-900 dark:text-gray-100">
        <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/heatmap" element={<Heatmap />} />
          <Route path="/history" element={<History />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/myteams" element={<MyTeams />} />
          <Route path="/ai-prematch" element={<AiPrematch />} />
          <Route path="/live-stats" element={<LiveStats />} />
          <Route path="/player-stats" element={<PlayerStats />} />
          <Route path="/todays-games" element={<TodaysGames />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
