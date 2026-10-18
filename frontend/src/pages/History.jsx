import React, { useState, useEffect } from 'react';
import SlipCard from '../components/SlipCard';
import { Calendar } from 'lucide-react';
import { API_BASE_URL } from '../config';

const History = () => {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/history/list`)
      .then(res => res.json())
      .then(data => {
        if (data.dates && data.dates.length > 0) {
          setDates(data.dates);
          setSelectedDate(data.dates[0]); // Select most recent by default
        }
      })
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    
    setLoading(true);
    fetch(`${API_BASE_URL}/api/history?date=${selectedDate}`)
      .then(res => res.json())
      .then(data => {
        setHistoryData(data.slips || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate || !historyData) return;

    const hasActiveSlips = historyData.some(slip => slip.status === 'pending' || slip.status === 'live');
    if (!hasActiveSlips) return;

    const intervalId = setInterval(() => {
        fetch(`${API_BASE_URL}/api/history/refresh?date=${selectedDate}`)
            .then(res => res.json())
            .then(data => {
                if (data.slips) {
                    setHistoryData(data.slips);
                }
            })
            .catch(err => console.error("Error refreshing history:", err));
    }, 60000);

    return () => clearInterval(intervalId);
  }, [selectedDate, historyData]);

  const handleDeleteSlip = async (slipId) => {
    if (!window.confirm('Are you sure you want to delete this slip?')) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/slips/${slipId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setHistoryData(prev => prev.filter(s => s.id !== slipId));
        // Also update dates if this was the last slip for the day
        if (historyData.length === 1) {
            setDates(prev => prev.filter(d => d !== selectedDate));
            if (dates.length > 1) {
                const nextDate = dates.find(d => d !== selectedDate);
                setSelectedDate(nextDate);
            } else {
                setSelectedDate('');
            }
        }
      } else {
        alert('Failed to delete slip');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting slip');
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 sm:mb-8 gap-3 sm:gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="text-indigo-500 shrink-0" size={24} />
          Slip History
        </h1>
        
        {dates.length > 0 ? (
          <select 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-bold rounded-xl px-4 py-2.5 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-colors cursor-pointer text-sm"
          >
            {dates.map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">No history available yet.</span>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
        </div>
      )}

      {!loading && historyData && historyData.length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-20 text-sm">
          No slips saved for this date.
        </div>
      )}

      {!loading && historyData && historyData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {historyData.map((slip, index) => (
            <SlipCard 
                key={slip.id} 
                title={`Custom Slip #${index + 1}`} 
                slip={slip} 
                delay={0.1 + (index * 0.05)} 
                onDelete={() => handleDeleteSlip(slip.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
};

export default History;
