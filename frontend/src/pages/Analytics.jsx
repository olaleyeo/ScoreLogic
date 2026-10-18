import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart, Line } from 'recharts';
import { API_BASE_URL } from '../config';

const Analytics = () => {
  const [data, setData] = useState({ strategies: [], overall: {}, monthly: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We will simulate fetching analytics data or fetch from /api/history
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/api/analytics`);
        const data = await res.json();
        
        setData({
            strategies: data.strategies || [],
            overall: data.overall || { totalBets: 0, wins: 0, losses: 0, winRate: 0 },
            monthly: data.monthly || []
        });
        
        setLoading(false);
    } catch (e) {
        console.error(e);
        setLoading(false);
    }
  };

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'];

  if (loading) return <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const pieData = [
    { name: 'Wins', value: data.overall.wins },
    { name: 'Losses', value: data.overall.losses }
  ];

  const monthName = new Date().toLocaleString('default', { month: 'long' });
  const yearName = new Date().getFullYear();

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20 sm:pb-32">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-gray-900 dark:text-white">Performance Analytics</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-gray-200">Overall Win Rate</h3>
                <div className="flex items-center justify-center h-56 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value">
                                <Cell fill="#10b981" />
                                <Cell fill="#ef4444" />
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="text-center mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Total Predictions: <span className="font-bold text-gray-900 dark:text-white">{data.overall.totalBets}</span>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-gray-200">Win Rate by Strategy</h3>
                <div className="h-56 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.strategies} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                            <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', fontSize: '12px' }} />
                            <Bar dataKey="winRate" name="Win Rate (%)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800 dark:text-gray-200">Monthly Trend ({monthName} {yearName})</h3>
            <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.monthly} margin={{ top: 10, right: -10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                        <XAxis dataKey="day" stroke="#6b7280" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                        <YAxis yAxisId="left" stroke="#6b7280" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#4f46e5" tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar yAxisId="left" dataKey="wins" name="Wins" fill="#10b981" stackId="a" />
                        <Bar yAxisId="left" dataKey="losses" name="Losses" fill="#ef4444" stackId="a" />
                        <Line yAxisId="right" type="monotone" dataKey="winRate" name="Win Rate (%)" stroke="#4f46e5" strokeWidth={2} dot={{ r: 2.5 }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};

export default Analytics;
