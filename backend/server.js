const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const OddsService = require('./services/OddsService');
const PredictionService = require('./services/PredictionService');
const SlipService = require('./services/SlipService');
const { initDB, Slip, SlipMatch, Prediction } = require('./database');
const { initCron } = require('./cron');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/api/slips', async (req, res) => {
    try {
        const { date, leagues, exclude, strategy } = req.query;
        // The vault should ONLY be used when evaluating strategies on the Home tab
        const useVault = !!strategy;
        let matches = await OddsService.fetchMatches({ date, leagues, useVault });
        
        if (exclude) {
            const excludeList = exclude.split(',').map(id => id.trim());
            matches = matches.filter(m => !excludeList.includes(m.matchId));
        }

        let predictions = PredictionService.predictMarkets(matches);
        
        if (strategy) {
            predictions = predictions.filter(p => p.strategy === strategy);
        }

        res.json({ strategy: strategy, matches: predictions });
    } catch (error) {
        console.error('Error fetching matches:', error.message);
        res.status(500).json({ error: error.message || 'Failed to fetch matches' });
    }
});

app.post('/api/slips/save', async (req, res) => {
    try {
        const { date, type, totalOdds, matches } = req.body;
        if (!date || !matches || matches.length === 0) {
            return res.status(400).json({ error: 'Missing required slip data' });
        }

        const slip = await Slip.create({ date, type: type || 'custom', totalOdds });
        const matchesToSave = matches.map(m => ({
            ...m,
            slipId: slip.id
        }));

        await SlipMatch.bulkCreate(matchesToSave);
        res.status(201).json({ success: true, slipId: slip.id });
    } catch (error) {
        console.error('Error saving slip:', error.message);
        res.status(500).json({ error: 'Failed to save slip' });
    }
});

app.delete('/api/slips/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const slip = await Slip.findByPk(id);
        if (!slip) {
            return res.status(404).json({ error: 'Slip not found' });
        }
        await SlipMatch.destroy({ where: { slipId: id } });
        await slip.destroy();
        res.json({ success: true, message: 'Slip deleted successfully' });
    } catch (error) {
        console.error('Error deleting slip:', error.message);
        res.status(500).json({ error: 'Failed to delete slip' });
    }
});

app.get('/api/slips/auto', async (req, res) => {
    try {
        let targetDate = req.query.date;
        if (!targetDate) {
            const latestSlip = await Slip.findOne({
                order: [['date', 'DESC']]
            });
            targetDate = latestSlip ? latestSlip.date : new Date().toISOString().split('T')[0];
        }
        
        const slips = await Slip.findAll({
            where: { date: targetDate },
            include: [{ model: SlipMatch, as: 'matches' }]
        });

        const formattedSlips = {
            twoOdds: slips.filter(s => s.type.startsWith('twoOdds')),
            threeOdds: slips.filter(s => s.type.startsWith('threeOdds')),
            fiveOdds: slips.find(s => s.type === 'fiveOdds') || { matches: [] },
            tenOdds: slips.find(s => s.type === 'tenOdds') || { matches: [] }
        };

        res.json({ slips: formattedSlips, date: targetDate });
    } catch (error) {
        console.error('Error fetching auto slips:', error.message);
        res.status(500).json({ error: 'Failed to fetch auto slips' });
    }
});

app.get('/api/predictions', async (req, res) => {
    try {
        let targetDate = req.query.date || new Date().toISOString().split('T')[0];
        if (targetDate === 'today') {
            targetDate = new Date().toISOString().split('T')[0];
        } else if (targetDate === 'tomorrow') {
            const tmr = new Date();
            tmr.setDate(tmr.getDate() + 1);
            targetDate = tmr.toISOString().split('T')[0];
        }
        
        let predictions = await Prediction.findAll({
            where: { date: targetDate }
        });

        // If not found in DB, fallback to dynamic fetching
        if (predictions.length === 0 && targetDate === new Date().toISOString().split('T')[0]) {
            const matches = await OddsService.fetchMatches({ date: targetDate });
            predictions = PredictionService.predictMarkets(matches);
        }

        if (req.query.leagues) {
            const leagueList = req.query.leagues.split(',').map(l => l.trim().toLowerCase());
            predictions = predictions.filter(p => leagueList.includes(p.league.toLowerCase()));
        }

        res.json({ predictions });
    } catch (error) {
        console.error('Error fetching predictions:', error.message);
        res.status(500).json({ error: 'Failed to fetch predictions' });
    }
});

app.get('/api/matches/today', async (req, res) => {
    try {
        const axios = require('axios');
        const apiKey = process.env.API_FOOTBALL_KEY;
        const timezone = req.query.timezone || 'UTC';
        const targetDate = req.query.date || new Date().toISOString().split('T')[0];
        
        if (!apiKey || apiKey === 'your_api_key_here') {
            // Return mock data if no API key
            return res.json({ matches: [] });
        }

        const fixturesRes = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
            headers: { 'x-apisports-key': apiKey },
            params: { date: targetDate, timezone: timezone }
        });

        if (fixturesRes.data?.errors && Object.keys(fixturesRes.data.errors).length > 0) {
            throw new Error('API-Sports returned an error: ' + JSON.stringify(fixturesRes.data.errors));
        }

        const matches = fixturesRes.data.response || [];
        
        // Sort matches: Live first, then scheduled, then finished
        const sortedMatches = matches.sort((a, b) => {
            const isLiveA = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(a.fixture.status.short);
            const isLiveB = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(b.fixture.status.short);
            if (isLiveA && !isLiveB) return -1;
            if (!isLiveA && isLiveB) return 1;
            return new Date(a.fixture.date) - new Date(b.fixture.date);
        });

        res.json({ matches: sortedMatches });
    } catch (error) {
        console.error('Error fetching today\'s matches:', error.message);
        res.status(500).json({ error: 'Failed to fetch today\'s matches' });
    }
});

app.get('/api/matches/live', async (req, res) => {
    try {
        const axios = require('axios');
        const apiKey = process.env.API_FOOTBALL_KEY;
        
        if (!apiKey || apiKey === 'your_api_key_here') {
            return res.json({ matches: [] });
        }

        const fixturesRes = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
            headers: { 'x-apisports-key': apiKey },
            params: { live: 'all' }
        });

        if (fixturesRes.data?.errors && Object.keys(fixturesRes.data.errors).length > 0) {
            throw new Error('API-Sports returned an error: ' + JSON.stringify(fixturesRes.data.errors));
        }

        const matches = fixturesRes.data.response || [];
        res.json({ matches });
    } catch (error) {
        console.error('Error fetching live matches:', error.message);
        res.status(500).json({ error: 'Failed to fetch live matches' });
    }
});

app.get('/api/matches/:id/predict', async (req, res) => {
    try {
        const { id } = req.params;
        const AiPrematchService = require('./services/AiPrematchService');
        const prediction = await AiPrematchService.getMatchPredictionByFixture(id);
        res.json(prediction);
    } catch (error) {
        console.error('Error in match prediction:', error.message);
        res.status(500).json({ error: 'Failed to generate prediction' });
    }
});

app.get('/api/matches/:id/stats', async (req, res) => {
    try {
        const axios = require('axios');
        const apiKey = process.env.API_FOOTBALL_KEY;
        if (!apiKey) throw new Error("API_FOOTBALL_KEY is missing");

        const fixtureId = req.params.id;
        const statsRes = await axios.get(`https://v3.football.api-sports.io/fixtures/statistics`, {
            headers: { 'x-apisports-key': apiKey },
            params: { fixture: fixtureId }
        });

        res.json({ statistics: statsRes.data.response || [] });
    } catch (error) {
        console.error('Error fetching stats:', error.message);
        res.status(500).json({ error: 'Failed to fetch match statistics' });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const targetDate = req.query.date;
        if (!targetDate) return res.status(400).json({ error: 'Date is required' });

        const slips = await Slip.findAll({
            where: { date: targetDate, type: 'custom' },
            include: [{ model: SlipMatch, as: 'matches' }]
        });

        const predictions = await Prediction.findAll({
            where: { date: targetDate }
        });

        res.json({ slips, predictions, date: targetDate });
    } catch (error) {
        console.error('Error fetching history:', error.message);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

app.get('/api/history/refresh', async (req, res) => {
    try {
        const targetDate = req.query.date || new Date().toISOString().split('T')[0];
        const ResultService = require('./services/ResultService');
        await ResultService.evaluatePendingMatches(targetDate);

        const slips = await Slip.findAll({
            where: { date: targetDate, type: 'custom' },
            include: [{ model: SlipMatch, as: 'matches' }]
        });

        res.json({ slips, date: targetDate });
    } catch (error) {
        console.error('Error refreshing history:', error.message);
        res.status(500).json({ error: 'Failed to refresh history' });
    }
});

app.get('/api/history/list', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { Op } = require('sequelize');
        const uniqueDates = await Slip.findAll({
            attributes: ['date'],
            where: {
                date: {
                    [Op.lte]: today
                },
                type: 'custom'
            },
            group: ['date'],
            order: [['date', 'DESC']]
        });
        res.json({ dates: uniqueDates.map(d => d.date) });
    } catch (error) {
        console.error('Error fetching history list:', error.message);
        res.status(500).json({ error: 'Failed to fetch history list' });
    }
});

app.get('/api/analytics', async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const completedMatches = await SlipMatch.findAll({
            where: { status: { [Op.in]: ['won', 'lost'] } }
        });

        const overall = { totalBets: completedMatches.length, wins: 0, losses: 0, winRate: 0 };
        const stratMap = {};

        // For Monthly Trend
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        const monthlyDataMap = {};
        for (let i = 1; i <= daysInMonth; i++) {
            monthlyDataMap[i] = { day: `${i}`, wins: 0, losses: 0, total: 0 };
        }

        completedMatches.forEach(m => {
            const isWin = m.status === 'won';
            if (isWin) overall.wins++;
            else overall.losses++;

            // Categorize strategy
            let sName = m.selectedMarket;
            if (sName === 'Home Win' || sName === 'Away Win') {
                if (m.marketOdds >= 1.70) sName = 'SW (1.72)';
                else if (m.marketOdds >= 1.30) sName = 'SW (1.30)';
                else sName = 'SW (1.22)';
            }
            if (sName && sName.includes('Draw In Half')) sName = 'Draw In Half';

            if (!stratMap[sName]) stratMap[sName] = { name: sName, total: 0, wins: 0 };
            stratMap[sName].total++;
            if (isWin) stratMap[sName].wins++;

            // Aggregate Monthly Data
            if (m.createdAt) {
                const mDate = new Date(m.createdAt);
                if (mDate.getMonth() === currentMonth && mDate.getFullYear() === currentYear) {
                    const day = mDate.getDate();
                    monthlyDataMap[day].total++;
                    if (isWin) monthlyDataMap[day].wins++;
                    else monthlyDataMap[day].losses++;
                }
            }
        });

        overall.winRate = overall.totalBets > 0 ? parseFloat(((overall.wins / overall.totalBets) * 100).toFixed(1)) : 0;

        const strategies = Object.values(stratMap).map(s => ({
            name: s.name,
            total: s.total,
            winRate: s.total > 0 ? parseFloat(((s.wins / s.total) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.total - a.total);

        const monthly = Object.values(monthlyDataMap).map(d => ({
            ...d,
            winRate: d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0
        }));

        res.json({ overall, strategies, monthly });
    } catch (error) {
        console.error('Error fetching analytics:', error.message);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

app.get('/api/teams/:name/matches', async (req, res) => {
    try {
        const { name } = req.params;
        const apiKey = process.env.API_FOOTBALL_KEY;
        
        if (!apiKey || apiKey === 'your_api_key_here') {
            return res.json({ matches: [
                { id: 1, home: name, away: 'Mock FC', date: new Date(Date.now() + 86400000).toISOString() },
                { id: 2, home: 'Test United', away: name, date: new Date(Date.now() + 172800000).toISOString() }
            ]});
        }

        const axios = require('axios');
        
        // 1. Find team ID
        const teamRes = await axios.get(`https://v3.football.api-sports.io/teams`, {
            headers: { 'x-apisports-key': apiKey },
            params: { search: name }
        });

        const teams = teamRes.data?.response;
        if (!teams || teams.length === 0) {
            return res.status(404).json({ error: 'Team not found in API' });
        }
        
        const teamId = teams[0].team.id;

        // 2. Get next 2 fixtures
        const fixtureRes = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
            headers: { 'x-apisports-key': apiKey },
            params: { team: teamId, next: 2 }
        });

        const matches = (fixtureRes.data?.response || []).map(item => ({
            id: item.fixture.id,
            home: item.teams.home.name,
            away: item.teams.away.name,
            date: item.fixture.date,
            league: item.league.name
        }));

        res.json({ matches });
    } catch (error) {
        console.error('Error fetching team matches:', error.message);
        res.status(500).json({ error: 'Failed to fetch matches' });
    }
});

app.post('/api/my-teams/generate-slip', async (req, res) => {
    try {
        const { teams, minConfidence, maxGames } = req.body || {};
        if (!Array.isArray(teams) || teams.length === 0) {
            return res.status(400).json({ error: 'Tracked teams array is required' });
        }

        const AiPrematchService = require('./services/AiPrematchService');
        const result = await AiPrematchService.generateMyTeams14DayAiSlip(teams, {
            minConfidence,
            maxGames: maxGames || 20
        });
        res.json(result);
    } catch (error) {
        console.error('Error generating AI 14-day slip:', error.message);
        res.status(500).json({ error: error.message || 'Failed to generate AI 14-day slip' });
    }
});

app.post('/api/matches/today/generate-slip', async (req, res) => {
    try {
        const { date, timezone, minConfidence, maxGames } = req.body || {};
        const AiPrematchService = require('./services/AiPrematchService');
        const result = await AiPrematchService.generateTodaysAiSlip({
            date,
            timezone,
            minConfidence,
            maxGames: maxGames || 20
        });
        res.json(result);
    } catch (error) {
        console.error("Error generating Today's AI slip:", error.message);
        res.status(500).json({ error: error.message || "Failed to generate Today's AI slip" });
    }
});

app.get('/api/sofascore/search', async (req, res) => {
    try {
        const axios = require('axios');
        const { q } = req.query;
        const response = await axios.get(`https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(q)}`);
        res.json(response.data);
    } catch (error) {
        console.error('Sofascore search error:', error.message);
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: 'Failed to search on Sofascore', details: error.message });
    }
});

app.get('/api/sofascore/team/:id/events/next', async (req, res) => {
    try {
        const axios = require('axios');
        const { id } = req.params;
        const response = await axios.get(`https://api.sofascore.com/api/v1/team/${id}/events/next/0`);
        res.json(response.data);
    } catch (error) {
        console.error('Sofascore events error:', error.message);
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: 'Failed to fetch next event on Sofascore', details: error.message });
    }
});

app.get('/api/sofascore/event/:id/statistics', async (req, res) => {
    try {
        const axios = require('axios');
        const { id } = req.params;
        const response = await axios.get(`https://api.sofascore.com/api/v1/event/${id}/statistics`);
        res.json(response.data);
    } catch (error) {
        console.error('Sofascore stats error:', error.message);
        const status = error.response ? error.response.status : 500;
        res.status(status).json({ error: 'Failed to fetch event stats on Sofascore', details: error.message });
    }
});

app.post('/api/ai/analyze', require('express').json({ limit: '10mb' }), async (req, res) => {
    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'GROQ_API_KEY is missing in backend .env' });
        }

        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey });

        const { match, stats, incidents } = req.body;

        if (!match || !match.homeTeam) {
            return res.status(400).json({ error: 'Valid match data is required' });
        }

        const allStats = (stats || []).find(s => s.period === 'ALL')?.groups || [];
        const compactStats = allStats.flatMap(g => g.statisticsItems.map(item => `${item.name}: ${item.home} - ${item.away}`)).join(' | ');
        const compactIncidents = (incidents || []).slice(-10).map(inc => `${inc.time}' ${inc.incidentType} (${inc.playerName || inc.player?.name || ''})`).join(' | ');

        const status = match.status?.type; // 'inprogress', 'notstarted', 'finished'
        let prompt = '';

        if (status === 'inprogress') {
            prompt = `
Act as an expert football data analyst. Analyze this live ongoing match:
Match: ${match.homeTeam?.name} vs ${match.awayTeam?.name}
Current Score: ${match.homeScore?.current || 0} - ${match.awayScore?.current || 0}
Current Minute: ${match.status?.description || 'N/A'}

Recent Incidents (Cards, Subs, Goals):
${compactIncidents}

Statistics (Home - Away):
${compactStats}

Provide a very concise, punchy analysis (2-3 short paragraphs max).
Focus on:
1. Who has the momentum?
2. Expected outcomes (goals, corners, cards, shots, shots on target). You MUST predict the individual numbers for BOTH teams separately. For each expected outcome, provide a brief 1-sentence summary of the reasoning based on the live stats.
3. Value bets or live predictions based on the stats.
Do NOT use markdown formatting (no asterisks). Use plain text and capitalization for emphasis.
`;
        } else if (status === 'notstarted') {
            prompt = `
Act as an expert football data analyst. Analyze this upcoming match:
Match: ${match.homeTeam?.name} vs ${match.awayTeam?.name}
Tournament: ${match.tournament?.name || 'N/A'}

Provide a very concise, punchy pre-match analysis (2-3 short paragraphs max).
Focus on:
1. Expected match dynamics.
2. Expected outcomes (goals, corners, cards, shots, shots on target). You MUST predict the individual numbers for BOTH teams separately. For each expected outcome, provide a brief 1-sentence summary of the reasoning.
3. Value bets or predictions.
Do NOT use markdown formatting (no asterisks). Use plain text and capitalization for emphasis.
`;
        } else {
            prompt = `
Act as an expert football data analyst. Analyze this finished match:
Match: ${match.homeTeam?.name} vs ${match.awayTeam?.name}
Final Score: ${match.homeScore?.current || 0} - ${match.awayScore?.current || 0}

Incidents:
${compactIncidents}

Statistics (Home - Away):
${compactStats}

Provide a very concise, punchy post-match summary (2-3 short paragraphs max).
Focus on:
1. Who deserved to win based on stats?
2. Key turning points or standout metrics.
Do NOT use markdown formatting (no asterisks). Use plain text and capitalization for emphasis.
`;
        }

        const response = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'openai/gpt-oss-120b',
        });

        res.json({ analysis: response.choices[0]?.message?.content || 'Analysis failed' });
    } catch (error) {
        console.error('AI Analysis error:', error.message);
        res.status(500).json({ error: 'Failed to generate AI analysis' });
    }
});
app.get('/api/ai-prematch/standings', async (req, res) => {
    try {
        const AiPrematchService = require('./services/AiPrematchService');
        const standings = await AiPrematchService.getTopTeams();
        res.json(standings);
    } catch (error) {
        console.error('AiPrematch standings error:', error.message);
        res.status(500).json({ error: 'Failed to fetch AI Prematch standings' });
    }
});

app.get('/api/ai-prematch/analyze/:teamId', async (req, res) => {
    try {
        const teamId = req.params.teamId;
        const leagueId = req.query.leagueId;
        const AiPrematchService = require('./services/AiPrematchService');
        const result = await AiPrematchService.getTeamPrediction(teamId, leagueId);
        res.json(result);
    } catch (err) {
        console.error("Analysis route error:", err);
        res.status(500).json({ error: 'Failed to generate analysis', details: err.message });
    }
});

app.get('/api/ai-prematch/cheat-sheet', async (req, res) => {
    try {
        const { homeId, awayId, leagueId } = req.query;
        if (!homeId || !awayId || !leagueId) {
            return res.status(400).json({ error: 'homeId, awayId, and leagueId are required' });
        }
        const AiPrematchService = require('./services/AiPrematchService');
        const result = await AiPrematchService.getMatchCheatSheet(homeId, awayId, leagueId);
        res.json(result);
    } catch (err) {
        console.error("Cheat Sheet route error:", err);
        res.status(500).json({ error: 'Failed to generate Cheat Sheet', details: err.message });
    }
});

// New Bet Builder Route
app.post('/api/ai-prematch/bet-builder', async (req, res) => {
    try {
        const { teamIds, leagueId } = req.body;
        if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
            return res.status(400).json({ error: 'Valid teamIds array is required' });
        }
        const AiPrematchService = require('./services/AiPrematchService');
        const result = await AiPrematchService.generateBetBuilder(teamIds, leagueId);
        res.json(result);
    } catch (err) {
        console.error("Bet Builder route error:", err);
        res.status(500).json({ error: 'Failed to generate Bet Builder', details: err.message });
    }
});

app.get('/api/player-stats/:leagueId', async (req, res) => {
    try {
        const { leagueId } = req.params;
        const PlayerStatsService = require('./services/PlayerStatsService');
        const stats = await PlayerStatsService.getStats(leagueId);
        res.json(stats);
    } catch (error) {
        console.error('Player stats error:', error.message);
        res.status(500).json({ error: 'Failed to fetch player stats', details: error.message });
    }
});

// Serve static frontend files in production
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.use((req, res, next) => {
        if (req.method === 'GET' && !req.path.startsWith('/api')) {
            return res.sendFile(path.join(frontendDist, 'index.html'));
        }
        next();
    });
}

initDB().then(async () => {
    initCron();
    try {
        const ResultService = require('./services/ResultService');
        await ResultService.evaluatePendingMatches();

        // Ensure today's slips exist in case the server was off at 10 PM yesterday
        // (Disabled per user request to discontinue auto-slips)
        // const { Slip } = require('./database');
        // const todayStr = new Date().toISOString().split('T')[0];
        // const todayCount = await Slip.count({ where: { date: todayStr } });
        // if (todayCount === 0) { ... }

    } catch (e) {
        console.error('Failed to execute startup routines:', e.message);
    }
    app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
    });
});
