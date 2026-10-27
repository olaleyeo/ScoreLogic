const axios = require('axios');

const LEAGUES = [
    { id: 39, name: 'English Premier League' },
    { id: 48, name: 'EFL Cup' },
    { id: 140, name: 'LaLiga' },
    { id: 3, name: 'UEFA Europa League' },
    { id: 135, name: 'Serie A' },
    { id: 78, name: 'Bundesliga' },
    { id: 61, name: 'Ligue 1' },
    { id: 88, name: 'Eredivisie' },
    { id: 203, name: 'Super Lig' },
    { id: 103, name: 'Eliteserien' },
    { id: 113, name: 'Allsvenskan' },
    { id: 169, name: 'Chinese Super League' },
    { id: 98, name: 'J1 League' },
    { id: 292, name: 'K-League 1' },
    { id: 2, name: 'UEFA Champions League' },
    { id: 848, name: 'UEFA Conference League' },
    { id: 1, name: 'World Cup' },
    { id: 4, name: 'Euro Championship' },
    { id: 5, name: 'UEFA Nations League' },
    { id: 9, name: 'Copa America' },
    { id: 10, name: 'Friendlies' }
];

class AiPrematchService {
    static standingsCache = null;
    static standingsCacheTime = null;
    static CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
    static fixturesDateCache = {}; // { 'YYYY-MM-DD': { data, timestamp } }
    static enrichmentCache = {}; // { fixtureId: { data, timestamp } }
    static FIXTURE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

    static async getTopTeams() {
        if (this.standingsCache && this.standingsCacheTime && (Date.now() - this.standingsCacheTime < this.CACHE_DURATION_MS)) {
            console.log('Serving AiPrematch standings from cache...');
            return this.standingsCache;
        }

        const apiKey = process.env.API_FOOTBALL_KEY;
        if (!apiKey) throw new Error("API_FOOTBALL_KEY is missing");

        const year = new Date().getFullYear();
        const results = [];

        console.log('Fetching AiPrematch standings from API-Sports...');
        
        const sleep = ms => new Promise(r => setTimeout(r, ms));

        for (const league of LEAGUES) {
            try {
                // Determine season year (for summer leagues like Eliteserien vs winter leagues)
                // API-Sports typically uses the starting year of the season. 
                // E.g., for 2023-2024 season, the season year is 2023.
                // It's safer to check the current season from /leagues endpoint or just query the most recent standings.
                // For simplicity, we just use the current year, but if it fails we could fall back to year-1.
                // Actually, API-Sports /standings endpoint with no season fetches the current season.
                
                await sleep(150); // Rate limit protection
                
                const res = await axios.get(`https://v3.football.api-sports.io/standings`, {
                    headers: { 'x-apisports-key': apiKey },
                    params: { league: league.id, season: year }
                });

                let responseData = res.data.response;
                
                // Fallback to previous year if current year standings are empty (e.g. season hasn't started)
                if (!responseData || responseData.length === 0) {
                    const resPrev = await axios.get(`https://v3.football.api-sports.io/standings`, {
                        headers: { 'x-apisports-key': apiKey },
                        params: { league: league.id, season: year - 1 }
                    });
                    responseData = resPrev.data.response;
                }

                if (responseData && responseData.length > 0) {
                    const leagueData = responseData[0].league;
                    const standingsMatrix = leagueData.standings; // Array of arrays (e.g. groups)
                    
                    // Flatten groups
                    let allTeams = [];
                    standingsMatrix.forEach(group => {
                        allTeams = allTeams.concat(group);
                    });

                    // Sort by points, then goal diff, then goals for
                    allTeams.sort((a, b) => {
                        if (b.points !== a.points) return b.points - a.points;
                        if (b.goalsDiff !== a.goalsDiff) return b.goalsDiff - a.goalsDiff;
                        return b.all.goals.for - a.all.goals.for;
                    });

                    // Get top 6
                    const top6 = allTeams.slice(0, 6).map(t => ({
                        id: t.team.id,
                        name: t.team.name,
                        logo: t.team.logo,
                        rank: t.rank,
                        points: t.points,
                        form: t.form,
                        played: t.all.played,
                        win: t.all.win,
                        draw: t.all.draw,
                        lose: t.all.lose,
                        goalsDiff: t.goalsDiff,
                        nextMatchDate: null
                    }));

                    // Fetch upcoming fixtures for the league to get next match dates
                    try {
                        const fixturesRes = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
                            headers: { 'x-apisports-key': apiKey },
                            params: { league: league.id, next: 50 }
                        });
                        const upcomingFixtures = fixturesRes.data.response || [];
                        
                        top6.forEach(team => {
                            // Find next fixture for this team in this league
                            const teamFixture = upcomingFixtures.find(f => f.teams.home.id === team.id || f.teams.away.id === team.id);
                            if (teamFixture) {
                                // Extract just the YYYY-MM-DD part
                                team.nextMatchDate = teamFixture.fixture.date.split('T')[0];
                            }
                        });
                    } catch (fixErr) {
                        console.error(`Error fetching upcoming fixtures for ${league.name}:`, fixErr.message);
                    }

                    results.push({
                        league: league.name,
                        leagueId: league.id,
                        country: leagueData.country,
                        logo: leagueData.logo,
                        teams: top6
                    });
                } else {
                    // Fallback for Cup competitions without standings
                    const fixRes = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
                        headers: { 'x-apisports-key': apiKey },
                        params: { league: league.id, next: 20 }
                    });
                    const fixtures = fixRes.data.response || [];
                    if (fixtures.length > 0) {
                        const uniqueTeamsMap = new Map();
                        fixtures.forEach(f => {
                            if (!uniqueTeamsMap.has(f.teams.home.id)) uniqueTeamsMap.set(f.teams.home.id, f.teams.home);
                            if (!uniqueTeamsMap.has(f.teams.away.id)) uniqueTeamsMap.set(f.teams.away.id, f.teams.away);
                        });
                        const allTeams = Array.from(uniqueTeamsMap.values());
                        const top6 = allTeams.slice(0, 6).map((t, idx) => {
                            const teamFixture = fixtures.find(f => f.teams.home.id === t.id || f.teams.away.id === t.id);
                            return {
                                id: t.id,
                                name: t.name,
                                logo: t.logo,
                                rank: idx + 1,
                                points: '-',
                                form: 'N/A',
                                played: '-',
                                win: '-',
                                draw: '-',
                                lose: '-',
                                goalsDiff: '-',
                                nextMatchDate: teamFixture ? teamFixture.fixture.date.split('T')[0] : null
                            };
                        });
                        
                        results.push({
                            league: league.name,
                            leagueId: league.id,
                            country: fixtures[0].league.country,
                            logo: fixtures[0].league.logo,
                            teams: top6
                        });
                    }
                }
            } catch (err) {
                console.error(`Error fetching standings for ${league.name}:`, err.message);
            }
        }

        this.standingsCache = results;
        this.standingsCacheTime = Date.now();
        return results;
    }

    static async getTeamPrediction(teamId, leagueId) {
        const apiKey = process.env.API_FOOTBALL_KEY;
        const groqKey = process.env.GROQ_API_KEY;
        if (!apiKey || !groqKey) throw new Error("Missing API keys");

        // 1. Fetch next fixture in this specific league
        const nextFixRes = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
            headers: { 'x-apisports-key': apiKey },
            params: { team: teamId, league: leagueId, next: 1 }
        });

        const nextFixtures = nextFixRes.data.response;
        if (!nextFixtures || nextFixtures.length === 0) {
            throw new Error("No upcoming fixtures found for this team.");
        }
        
        const fixture = nextFixtures[0];
        const homeTeam = fixture.teams.home;
        const awayTeam = fixture.teams.away;

        // 2. Fetch last 5 for home team in this specific league
        const homeLast5Res = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
            headers: { 'x-apisports-key': apiKey },
            params: { team: homeTeam.id, league: leagueId, last: 5 }
        });
        const homeLast5 = homeLast5Res.data.response.map(f => `${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name}`);

        // 3. Fetch last 5 for away team in this specific league
        const awayLast5Res = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
            headers: { 'x-apisports-key': apiKey },
            params: { team: awayTeam.id, league: leagueId, last: 5 }
        });
        const awayLast5 = awayLast5Res.data.response.map(f => `${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name}`);

        // 4. Fetch H2H
        const h2hRes = await axios.get(`https://v3.football.api-sports.io/fixtures/headtohead`, {
            headers: { 'x-apisports-key': apiKey },
            params: { h2h: `${homeTeam.id}-${awayTeam.id}` }
        });
        const h2h = h2hRes.data.response.slice(0, 5).map(f => `${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name} (${new Date(f.fixture.date).toLocaleDateString()})`);

        // 5. Generate prompt
        const prompt = `
Act as an expert football data analyst. Analyze this upcoming match:
Match: ${homeTeam.name} (Home) vs ${awayTeam.name} (Away)
Competition: ${fixture.league.name}
Date: ${new Date(fixture.fixture.date).toLocaleString()}

Recent Form - ${homeTeam.name} (Last 5):
${homeLast5.join('\n')}

Recent Form - ${awayTeam.name} (Last 5):
${awayLast5.join('\n')}

Head-to-Head (Last 5 meetings):
${h2h.join('\n')}

Provide a concise pre-match analysis and prediction.
Focus on summarizing expectations and list out predicted numbers for the following stats. For every stat, you MUST predict the individual numbers for BOTH teams separately (e.g., Home Team: X, Away Team: Y). For each expected stat, you MUST provide a brief 1-sentence summary of the reasoning behind the prediction based on the data:
1. Expected Goals
2. Expected Corners
3. Expected Cards
4. Expected Throw-ins
5. Expected Goal Kicks
6. Expected Shots
7. Expected Shots on Target (SOT)

Do NOT use markdown formatting (no asterisks). Use plain text and capitalization for emphasis.
`;

        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: groqKey });
        const response = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'openai/gpt-oss-120b',
        });

        return {
            fixture: {
                home: homeTeam.name,
                away: awayTeam.name,
                homeId: homeTeam.id,
                awayId: awayTeam.id,
                date: fixture.fixture.date,
                league: fixture.league.name,
                homeLogo: homeTeam.logo,
                awayLogo: awayTeam.logo
            },
            analysis: response.choices[0]?.message?.content || 'Analysis failed'
        };
    }
    static async generateBetBuilder(teamIds, leagueId) {
        const apiKey = process.env.API_FOOTBALL_KEY;
        const groqKey = process.env.GROQ_API_KEY;
        if (!apiKey || !groqKey) throw new Error("Missing API keys");

        // We fetch data for each team in parallel
        const matchPromises = teamIds.map(async (teamId) => {
            const nextFixRes = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
                headers: { 'x-apisports-key': apiKey },
                params: { team: teamId, league: leagueId, next: 1 }
            });

            const nextFixtures = nextFixRes.data.response;
            if (!nextFixtures || nextFixtures.length === 0) return null;
            
            const fixture = nextFixtures[0];
            const homeTeam = fixture.teams.home;
            const awayTeam = fixture.teams.away;

            // Instead of doing multiple queries for recent form for all 6 teams (which is 3 * 6 = 18 API calls),
            // We just provide the basic fixture to save API limits. AI will predict based on general knowledge or just basic match details.
            // Wait, we can fetch H2H to at least give some context, or just recent form.
            // To keep it light, let's just fetch H2H.
            let h2h = [];
            try {
                const h2hRes = await axios.get(`https://v3.football.api-sports.io/fixtures/headtohead`, {
                    headers: { 'x-apisports-key': apiKey },
                    params: { h2h: `${homeTeam.id}-${awayTeam.id}` }
                });
                h2h = h2hRes.data.response.slice(0, 3).map(f => `${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name}`);
            } catch (e) {
                console.error("H2H error:", e.message);
            }

            return {
                home: homeTeam.name,
                away: awayTeam.name,
                league: fixture.league.name,
                date: fixture.fixture.date,
                h2h: h2h.length ? h2h.join(', ') : 'No recent H2H'
            };
        });

        const matchResults = await Promise.all(matchPromises);
        
        // Filter out nulls and deduplicate matches so the AI doesn't see the same fixture twice
        const uniqueMatches = [];
        const seenMatches = new Set();
        
        matchResults.forEach(m => {
            if (m !== null) {
                // Create a unique key for the fixture (e.g., "Arsenal-Brighton" or "Brighton-Arsenal" sorted)
                const matchKey = [m.home, m.away].sort().join('-');
                if (!seenMatches.has(matchKey)) {
                    seenMatches.add(matchKey);
                    uniqueMatches.push(m);
                }
            }
        });

        if (uniqueMatches.length === 0) {
            throw new Error("No upcoming fixtures found for the selected teams.");
        }

        let prompt = `Act as an expert football betting AI. I have a list of upcoming matches. For EACH match, analyze the teams and select exactly 3 high-probability betting markets (e.g., Home Win, Over 1.5 Goals, Over 8.5 Corners, BTTS - Yes) that can be combined into a single-match Bet Builder for high odds. \n\nMatches:\n`;
        
        uniqueMatches.forEach((m, i) => {
            prompt += `${i + 1}. ${m.home} vs ${m.away} (${m.league}). Recent H2H: ${m.h2h}\n`;
        });

        prompt += `\nOutput a comprehensive Bet Builder slip. For each match, provide the match name, your 3 selected high-probability picks, and a 1-sentence reasoning for the combination. 
Do NOT use markdown asterisks. Format exactly like this for each match:
MATCH: [Home] vs [Away]
PICKS: [Pick 1] + [Pick 2] + [Pick 3]
REASONING: [Your reason]
---
`;

        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: groqKey });
        const response = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'openai/gpt-oss-120b',
        });

        return {
            matches: uniqueMatches,
            betBuilder: response.choices[0]?.message?.content || 'Failed to generate Bet Builder'
        };
    }

    static async getMatchCheatSheet(homeTeamId, awayTeamId, leagueId) {
        const apiKey = process.env.API_FOOTBALL_KEY;
        if (!apiKey) throw new Error("Missing API keys");

        const season = new Date().getFullYear(); // or current active season
        
        const headers = { 'x-apisports-key': apiKey };
        const baseParams = { league: leagueId, season: season };

        // Fetch team statistics
        const [homeStatsRes, awayStatsRes, homePlayersRes, awayPlayersRes] = await Promise.all([
            axios.get(`https://v3.football.api-sports.io/teams/statistics`, { headers, params: { ...baseParams, team: homeTeamId } }),
            axios.get(`https://v3.football.api-sports.io/teams/statistics`, { headers, params: { ...baseParams, team: awayTeamId } }),
            // Fetch page 1 of players (typically the top ~20 players by rating/appearances)
            axios.get(`https://v3.football.api-sports.io/players`, { headers, params: { ...baseParams, team: homeTeamId, page: 1 } }),
            axios.get(`https://v3.football.api-sports.io/players`, { headers, params: { ...baseParams, team: awayTeamId, page: 1 } })
        ]);

        const formatTeamStats = (res) => {
            const data = res.data?.response;
            if (!data || !data.team) {
                return {
                    goalsFor: '0.00',
                    goalsAgainst: '0.00',
                    cleanSheets: 0,
                    cards: '0.00'
                };
            }
            const played = data.fixtures?.played?.total || 1;
            const goalsFor = data.goals?.for?.total?.total || 0;
            const goalsAgainst = data.goals?.against?.total?.total || 0;
            const yellowCards = data.cards?.yellow ? Object.values(data.cards.yellow).reduce((a, b) => a + (b.total || 0), 0) : 0;
            
            return {
                goalsFor: (goalsFor / played).toFixed(2),
                goalsAgainst: (goalsAgainst / played).toFixed(2),
                cleanSheets: data.clean_sheet?.total || 0,
                cards: (yellowCards / played).toFixed(2),
            };
        };

        const processPlayers = (res, teamName) => {
            const players = res.data?.response || [];
            return players.filter(p => p.statistics[0]?.games?.appearences > 0).map(p => {
                const s = p.statistics[0];
                return {
                    id: p.player.id,
                    name: p.player.name,
                    team: teamName,
                    photo: p.player.photo,
                    minutes: s.games?.minutes || 0,
                    appearances: s.games?.appearences || 0,
                    goals: s.goals?.total || 0,
                    assists: s.goals?.assists || 0,
                    shots: s.shots?.total || 0,
                    shotsOnTarget: s.shots?.on || 0,
                    foulsCommitted: s.fouls?.committed || 0,
                    foulsDrawn: s.fouls?.drawn || 0,
                    tackles: s.tackles?.total || 0,
                    yellowCards: s.cards?.yellow || 0,
                    redCards: s.cards?.red || 0,
                    rating: parseFloat(s.games?.rating || 0).toFixed(2)
                };
            });
        };

        const homeTeamStats = formatTeamStats(homeStatsRes);
        const awayTeamStats = formatTeamStats(awayStatsRes);

        const homePlayers = processPlayers(homePlayersRes, homeTeamStats?.name);
        const awayPlayers = processPlayers(awayPlayersRes, awayTeamStats?.name);

        // Sort into categories by team
        const getTop = (players, sortKey, limit=5) => [...players].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, limit);

        return {
            homeTeam: homeTeamStats,
            awayTeam: awayTeamStats,
            players: {
                defensive: {
                    home: getTop(homePlayers, 'tackles'),
                    away: getTop(awayPlayers, 'tackles')
                },
                offensive: {
                    home: getTop(homePlayers, 'foulsDrawn'),
                    away: getTop(awayPlayers, 'foulsDrawn')
                },
                shooting: {
                    home: getTop(homePlayers, 'shotsOnTarget'),
                    away: getTop(awayPlayers, 'shotsOnTarget')
                },
                goalscoring: {
                    home: getTop(homePlayers, 'goals'),
                    away: getTop(awayPlayers, 'goals')
                }
            }
        };
    }
    static async getMatchPredictionByFixture(fixtureId) {
        const apiKey = process.env.API_FOOTBALL_KEY;
        const groqKey = process.env.GROQ_API_KEY;

        if (!apiKey || apiKey === 'your_api_key_here' || fixtureId === '1' || fixtureId === '2' || fixtureId === 1 || fixtureId === 2 || !groqKey) {
            return {
                analysis: `DETAILED SUMMARY\nThis upcoming fixture presents a compelling clash of styles. The home side enters with positive attacking momentum and high ball retention, while the visitors look to absorb pressure and exploit transition spaces.\n\nEXPECTED METRICS\n1. Expected Goals (xG): Home 1.75 - Away 0.95\n2. Expected Corners: Home 6.5 - Away 3.5\n3. Expected Fouls: Home 11.0 - Away 14.5\n4. Expected Goal Kicks: Home 5.0 - Away 8.5\n5. Expected Shoots: Home 15.0 - Away 9.0\n6. Expected Shoots on Target: Home 5.5 - Away 3.0`
            };
        }

        // 1. Fetch the fixture
        const fixtureRes = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
            headers: { 'x-apisports-key': apiKey },
            params: { id: fixtureId }
        });
        
        const fixtureData = fixtureRes.data.response[0];
        if (!fixtureData) throw new Error("Fixture not found.");

        const homeTeam = fixtureData.teams.home;
        const awayTeam = fixtureData.teams.away;

        // 2. Fetch last 5 for home team
        const homeLast5Res = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
            headers: { 'x-apisports-key': apiKey },
            params: { team: homeTeam.id, last: 5 }
        });
        const homeLast5 = (homeLast5Res.data.response || []).map(f => `${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name}`);

        // 3. Fetch last 5 for away team
        const awayLast5Res = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
            headers: { 'x-apisports-key': apiKey },
            params: { team: awayTeam.id, last: 5 }
        });
        const awayLast5 = (awayLast5Res.data.response || []).map(f => `${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name}`);

        // 4. Fetch H2H
        const h2hRes = await axios.get(`https://v3.football.api-sports.io/fixtures/headtohead`, {
            headers: { 'x-apisports-key': apiKey },
            params: { h2h: `${homeTeam.id}-${awayTeam.id}` }
        });
        const h2h = (h2hRes.data.response || []).slice(0, 5).map(f => `${f.teams.home.name} ${f.goals.home}-${f.goals.away} ${f.teams.away.name}`);

        // 5. Generate prompt
        const prompt = `
Act as an expert football data analyst. Analyze this upcoming match:
Match: ${homeTeam.name} (Home) vs ${awayTeam.name} (Away)
Competition: ${fixtureData.league.name}

Recent Form - ${homeTeam.name} (Last 5):
${homeLast5.join('\n')}

Recent Form - ${awayTeam.name} (Last 5):
${awayLast5.join('\n')}

Head-to-Head (Last 5 meetings):
${h2h.length ? h2h.join('\n') : 'No recent H2H'}

Based on the individual teams record, goal scores in previous games, and H2H between both teams, please provide a detailed AI prediction summary.
Specifically estimate and predict the expected numbers for the following metrics for BOTH teams based on their historical playstyle:
1. Detailed Summary: A comprehensive match preview.
2. Expected Goals (xG)
3. Expected Corners
4. Expected Fouls
5. Expected Goal Kicks
6. Expected Shoots
7. Expected Shoots on Target

Do NOT use markdown asterisks. Format your response cleanly using plain text and capitalization.
`;

        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: groqKey });
        const response = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'openai/gpt-oss-120b',
        });

        return {
            analysis: response.choices[0]?.message?.content || 'Analysis failed'
        };
    }

    static async fetchFixturesForDateCached(dateStr, apiKey) {
        const now = Date.now();
        if (
            this.fixturesDateCache[dateStr] &&
            now - this.fixturesDateCache[dateStr].timestamp < this.FIXTURE_CACHE_TTL
        ) {
            return this.fixturesDateCache[dateStr].data;
        }

        const res = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
            headers: { 'x-apisports-key': apiKey },
            params: { date: dateStr }
        });

        const fixtures = res.data?.response || [];
        this.fixturesDateCache[dateStr] = {
            data: fixtures,
            timestamp: now
        };
        return fixtures;
    }

    static async fetchFixtureEnrichmentCached(fixtureId, apiKey) {
        const now = Date.now();
        if (
            this.enrichmentCache[fixtureId] &&
            now - this.enrichmentCache[fixtureId].timestamp < this.FIXTURE_CACHE_TTL
        ) {
            return this.enrichmentCache[fixtureId].data;
        }

        const headers = { 'x-apisports-key': apiKey };
        const enrichment = {
            homeRecord: 'N/A',
            awayRecord: 'N/A',
            homeGoals: 'N/A',
            awayGoals: 'N/A',
            homeForm: 'N/A',
            awayForm: 'N/A',
            h2hSummary: 'N/A',
            injuriesAndSuspensions: 'None reported via API (use squad/injury knowledge)',
            bookmakerOdds: {}
        };

        try {
            const [predRes, injRes] = await Promise.allSettled([
                axios.get(`https://v3.football.api-sports.io/predictions`, {
                    headers,
                    params: { fixture: fixtureId },
                    timeout: 6000
                }),
                axios.get(`https://v3.football.api-sports.io/injuries`, {
                    headers,
                    params: { fixture: fixtureId },
                    timeout: 6000
                })
            ]);

            if (predRes.status === 'fulfilled' && predRes.value.data?.response?.[0]) {
                const pData = predRes.value.data.response[0];
                const hLeague = pData.teams?.home?.league;
                const aLeague = pData.teams?.away?.league;

                if (hLeague) {
                    enrichment.homeForm = hLeague.form ? hLeague.form.slice(-5) : 'N/A';
                    const hw = hLeague.fixtures?.wins?.home ?? '-';
                    const hd = hLeague.fixtures?.draws?.home ?? '-';
                    const hl = hLeague.fixtures?.loses?.home ?? '-';
                    enrichment.homeRecord = `Home W-D-L: ${hw}-${hd}-${hl}`;
                    const hgf = hLeague.goals?.for?.total?.home ?? '-';
                    const hga = hLeague.goals?.against?.total?.home ?? '-';
                    const hgfAvg = hLeague.goals?.for?.average?.home ?? '-';
                    const hgaAvg = hLeague.goals?.against?.average?.home ?? '-';
                    enrichment.homeGoals = `Home Scored: ${hgf} (avg ${hgfAvg}/g), Home Conceded: ${hga} (avg ${hgaAvg}/g)`;
                }

                if (aLeague) {
                    enrichment.awayForm = aLeague.form ? aLeague.form.slice(-5) : 'N/A';
                    const aw = aLeague.fixtures?.wins?.away ?? '-';
                    const ad = aLeague.fixtures?.draws?.away ?? '-';
                    const al = aLeague.fixtures?.loses?.away ?? '-';
                    enrichment.awayRecord = `Away W-D-L: ${aw}-${ad}-${al}`;
                    const agf = aLeague.goals?.for?.total?.away ?? '-';
                    const aga = aLeague.goals?.against?.total?.away ?? '-';
                    const agfAvg = aLeague.goals?.for?.average?.away ?? '-';
                    const agaAvg = aLeague.goals?.against?.average?.away ?? '-';
                    enrichment.awayGoals = `Away Scored: ${agf} (avg ${agfAvg}/g), Away Conceded: ${aga} (avg ${agaAvg}/g)`;
                }

                if (Array.isArray(pData.h2h) && pData.h2h.length > 0) {
                    enrichment.h2hSummary = pData.h2h
                        .slice(0, 4)
                        .map(f => `${f.teams?.home?.name} ${f.goals?.home}-${f.goals?.away} ${f.teams?.away?.name}`)
                        .join('; ');
                }
            }

            if (injRes.status === 'fulfilled' && Array.isArray(injRes.value.data?.response) && injRes.value.data.response.length > 0) {
                const list = injRes.value.data.response
                    .slice(0, 10)
                    .map(item => `${item.player?.name} (${item.team?.name} - ${item.player?.type || 'Out'}: ${item.player?.reason || 'Injury/Suspension'})`);
                enrichment.injuriesAndSuspensions = list.join(', ');
            }
        } catch (err) {
            console.error(`Enrichment fallback for fixture ${fixtureId}:`, err.message);
        }

        this.enrichmentCache[fixtureId] = {
            data: enrichment,
            timestamp: now
        };
        return enrichment;
    }

    static estimateDefaultOdds(market) {
        if (!market) return 1.50;
        const m = market.toLowerCase();
        if (m.includes('home win')) return 1.65;
        if (m.includes('away win')) return 1.85;
        if (m.includes('over 1.5')) return 1.28;
        if (m.includes('over 2.5')) return 1.68;
        if (m.includes('over 3.5')) return 2.40;
        if (m.includes('under 2.5')) return 1.80;
        if (m.includes('under 3.5')) return 1.33;
        if (m.includes('btts - yes') || m.includes('both teams to score - yes')) return 1.72;
        if (m.includes('btts - no') || m.includes('both teams to score - no')) return 1.95;
        if (m.includes('corners')) return 1.65;
        return 1.55;
    }

    static async generateMyTeams14DayAiSlip(trackedTeams = [], options = {}) {
        const apiKey = process.env.API_FOOTBALL_KEY;
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            throw new Error('GROQ_API_KEY is missing in backend .env');
        }

        const minConfidence = Number(options.minConfidence) || 72;
        const today = new Date();
        const dates = [];
        for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }

        const TEAM_ALIASES = {
            'man city': ['manchester city', 'man city'],
            'ac milan': ['ac milan', 'milan'],
            'inter': ['inter', 'inter milan', 'internazionale'],
            'sporting': ['sporting cp', 'sporting lisbon'],
            'athletic bilbao': ['athletic club', 'athletic bilbao'],
            'falkirk fc': ['falkirk', 'falkirk fc'],
            'galatasaray istanbul': ['galatasaray'],
            'fenerbahce istanbul': ['fenerbahce', 'fenerbahçe'],
            'goztepe izmir': ['goztepe', 'göztepe'],
            'fc twente enschede': ['twente', 'fc twente'],
            'gnk dinamo zagreb': ['dinamo zagreb', 'gnk dinamo zagreb'],
            'sparta pargue': ['sparta praha', 'sparta prague'],
            'slavia prague': ['slavia praha', 'slavia prague'],
            'strum graz': ['sturm graz', 'sk sturm graz'],
            'sk rapid': ['rapid vienna', 'rapid wien', 'sk rapid'],
            'bodo/gimit': ['bodo/glimt', 'bodø/glimt'],
            'alkmaar': ['az alkmaar', 'az'],
            'academico de viseu': ['academico viseu', 'académico de viseu', 'academico de viseu'],
            'broendby if': ['brondby', 'brøndby', 'broendby if'],
            'tromsoe il': ['tromso', 'tromsø', 'tromsoe il'],
            'union gilloise': ['union st. gilloise', 'union saint-gilloise', 'union gilloise'],
            'fk spartak 1918': ['spartak varna', 'fk spartak 1918']
        };

        const NON_EUROPEAN_COUNTRIES = new Set([
            'brazil', 'argentina', 'chile', 'colombia', 'ecuador', 'uruguay',
            'peru', 'paraguay', 'bolivia', 'venezuela', 'mexico', 'usa', 'finland', 'romania'
        ]);

        const expandedTargets = [];
        trackedTeams.forEach(raw => {
            const lower = raw.toLowerCase().trim();
            if (TEAM_ALIASES[lower]) {
                expandedTargets.push(...TEAM_ALIASES[lower]);
            } else {
                expandedTargets.push(lower);
            }
        });

        const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const targetRegexes = expandedTargets.map(t => ({
            target: t,
            regex: new RegExp(`(^|[^a-z0-9])${escapeRegex(t)}([^a-z0-9]|$)`, 'i')
        }));

        const isTrackedTeam = (name, country = '') => {
            if (!name) return false;
            const lower = name.toLowerCase().trim();
            const countryLower = (country || '').toLowerCase().trim();

            // Exclude youth, reserve, women's, and B teams
            if (/\b(u18|u19|u20|u21|u23|ii|b|reserves|women|w)\b/i.test(lower)) return false;

            // All tracked teams in MY_TEAMS are European clubs from specific leagues
            if (NON_EUROPEAN_COUNTRIES.has(countryLower)) return false;

            // Avoid false-positive namesakes
            if (lower.includes('cove rangers') || lower.includes('queens park rangers') || lower.includes('sporting gijon') || lower.includes('barcelona sc') || lower.includes('inter turku') || lower.includes('inter miami')) {
                return false;
            }

            return targetRegexes.some(({ target, regex }) => {
                if (lower === target) return true;
                // Strict exact match for short/ambiguous names like 'inter', 'az', 'rangers', 'barcelona', 'chelsea', 'arsenal'
                if (['inter', 'az', 'rangers', 'barcelona', 'porto', 'gent', 'lens', 'lyon'].includes(target)) {
                    return lower === target || lower === `fc ${target}` || lower === `${target} fc` || lower === `rc ${target}` || lower === `olympique ${target}` || lower === `kaa ${target}`;
                }
                return regex.test(lower);
            });
        };

        let all14DayFixtures = [];

        if (!apiKey || apiKey === 'your_api_key_here') {
            // Mock fallback if no API key configured
            const OddsService = require('./OddsService');
            const mockMatches = OddsService.getMockData();
            all14DayFixtures = mockMatches.map((m, idx) => ({
                fixture: {
                    id: m.matchId,
                    date: new Date(Date.now() + (idx + 1) * 12 * 3600 * 1000).toISOString(),
                    status: { short: 'NS' }
                },
                league: { name: m.league, country: '', round: 'Regular Season' },
                teams: {
                    home: { id: `h-${idx}`, name: m.homeTeam },
                    away: { id: `a-${idx}`, name: m.awayTeam }
                },
                _mockOdds: {
                    ...m.marketOdds,
                    'Home Win': m.matchWinnerOdds?.Home,
                    'Away Win': m.matchWinnerOdds?.Away
                },
                _zeroZeroOdds: m.correctScoreOdds?.['0:0'] || null
            }));
        } else {
            // Fetch the 14 days in small batches of 5 to be fast while respecting rate limits
            const sleep = ms => new Promise(r => setTimeout(r, ms));
            for (let i = 0; i < dates.length; i += 5) {
                const batchDates = dates.slice(i, i + 5);
                const batchResults = await Promise.all(
                    batchDates.map(d =>
                        this.fetchFixturesForDateCached(d, apiKey).catch(err => {
                            console.error(`Error fetching fixtures for ${d}:`, err.message);
                            return [];
                        })
                    )
                );
                batchResults.forEach(arr => {
                    all14DayFixtures = all14DayFixtures.concat(arr);
                });
                if (i + 5 < dates.length) {
                    await sleep(120);
                }
            }
        }

        // Build a complete 14-day schedule index per team so the AI knows about upcoming games & manager rotation risk
        const teamScheduleMap = new Map();
        const addTeamSchedule = (teamName, fixtureObj) => {
            if (!teamName) return;
            const key = teamName.toLowerCase();
            if (!teamScheduleMap.has(key)) teamScheduleMap.set(key, []);
            teamScheduleMap.get(key).push(fixtureObj);
        };

        all14DayFixtures.forEach(item => {
            const hName = item.teams?.home?.name;
            const aName = item.teams?.away?.name;
            const fDate = item.fixture?.date;
            if (!hName || !aName || !fDate) return;
            const summary = {
                id: String(item.fixture.id),
                date: fDate,
                league: item.league?.name || 'Unknown',
                round: item.league?.round || '',
                home: hName,
                away: aName
            };
            addTeamSchedule(hName, summary);
            addTeamSchedule(aName, summary);
        });

        for (const [, sched] of teamScheduleMap.entries()) {
            sched.sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        // Filter to upcoming fixtures involving tracked teams
        const now = new Date();
        const candidateMap = new Map();
        for (const item of all14DayFixtures) {
            const fId = String(item.fixture?.id || '');
            if (!fId || candidateMap.has(fId)) continue;

            const kickoff = item.fixture?.date ? new Date(item.fixture.date) : null;
            if (kickoff && kickoff <= now) continue;

            const statusShort = item.fixture?.status?.short;
            if (statusShort && !['NS', 'TBD'].includes(statusShort)) continue;

            const hName = item.teams?.home?.name || '';
            const aName = item.teams?.away?.name || '';
            const country = item.league?.country || '';
            if (isTrackedTeam(hName, country) || isTrackedTeam(aName, country)) {
                candidateMap.set(fId, item);
            }
        }

        const candidates = Array.from(candidateMap.values()).sort(
            (a, b) => new Date(a.fixture.date) - new Date(b.fixture.date)
        );

        if (candidates.length === 0) {
            return { matches: [], totalEvaluated: 0 };
        }

        // Check VaultMatch for any existing bookmaker odds
        const { VaultMatch } = require('../database');
        const vaultOddsMap = new Map();
        try {
            const vaultRows = await VaultMatch.findAll({
                where: { date: dates }
            });
            vaultRows.forEach(row => {
                try {
                    const parsed = JSON.parse(row.rawData);
                    if (parsed && parsed.matchId) {
                        vaultOddsMap.set(String(parsed.matchId), parsed);
                    }
                } catch (_) {}
            });
        } catch (err) {
            console.error('Vault lookup warning:', err.message);
        }

        // Enrich top candidates (up to 36 fixtures with live stats/injuries to stay fast, rest still get full schedule + AI evaluation)
        const maxLiveEnrich = Math.min(candidates.length, 30);
        if (apiKey && apiKey !== 'your_api_key_here') {
            for (let i = 0; i < maxLiveEnrich; i += 6) {
                const slice = candidates.slice(i, i + 6);
                await Promise.all(
                    slice.map(c => this.fetchFixtureEnrichmentCached(String(c.fixture.id), apiKey))
                );
            }
        }

        // Build rich context objects for each candidate match
        const getScheduleContext = (teamName, currentFixtureId, currentDateStr) => {
            const sched = teamScheduleMap.get((teamName || '').toLowerCase()) || [];
            const idx = sched.findIndex(s => s.id === String(currentFixtureId));
            if (idx === -1) return 'No adjacent fixtures in 14-day window';
            const currTime = new Date(currentDateStr).getTime();
            const parts = [];
            if (idx > 0) {
                const prev = sched[idx - 1];
                const daysSince = Math.round((currTime - new Date(prev.date).getTime()) / (1000 * 3600 * 24));
                const opp = prev.home.toLowerCase() === teamName.toLowerCase() ? `vs ${prev.away} (H)` : `@ ${prev.home} (A)`;
                parts.push(`Previous game: ${daysSince}d before (${prev.league} ${opp})`);
            }
            if (idx < sched.length - 1) {
                const next = sched[idx + 1];
                const daysUntil = Math.round((new Date(next.date).getTime() - currTime) / (1000 * 3600 * 24));
                const opp = next.home.toLowerCase() === teamName.toLowerCase() ? `vs ${next.away} (H)` : `@ ${next.home} (A)`;
                parts.push(`Upcoming game: ${daysUntil}d after (${next.league} ${opp})`);
            }
            return parts.length > 0 ? parts.join(' | ') : 'Single fixture in 14-day window (full rest, low rotation risk)';
        };

        const preparedMatches = candidates.map(item => {
            const matchId = String(item.fixture.id);
            const homeTeam = item.teams.home.name;
            const awayTeam = item.teams.away.name;
            const countryStr = item.league?.country ? `${item.league.country} ` : '';
            const league = `${countryStr}${item.league?.name || 'Unknown'}`.trim();
            const round = item.league?.round || 'Regular Season';
            const kickoffTime = item.fixture.date;

            const vaultMatch = vaultOddsMap.get(matchId);
            const enrich = this.enrichmentCache[matchId]?.data || {};

            const availableOdds = {};
            if (vaultMatch) {
                if (vaultMatch.matchWinnerOdds?.Home) availableOdds['Home Win'] = vaultMatch.matchWinnerOdds.Home;
                if (vaultMatch.matchWinnerOdds?.Away) availableOdds['Away Win'] = vaultMatch.matchWinnerOdds.Away;
                if (vaultMatch.marketOdds) {
                    Object.assign(availableOdds, vaultMatch.marketOdds);
                }
                if (Array.isArray(vaultMatch.rawMarkets)) {
                    const bttsMarket = vaultMatch.rawMarkets.find(m => m.id === 8 || (m.name && m.name.toLowerCase().includes('both teams score')));
                    if (bttsMarket && Array.isArray(bttsMarket.values)) {
                        const yesVal = bttsMarket.values.find(v => v.value === 'Yes');
                        const noVal = bttsMarket.values.find(v => v.value === 'No');
                        if (yesVal) availableOdds['BTTS - Yes'] = parseFloat(yesVal.odd);
                        if (noVal) availableOdds['BTTS - No'] = parseFloat(noVal.odd);
                    }
                    const cornersMarket = vaultMatch.rawMarkets.find(m => m.name && m.name.toLowerCase().includes('corners over/under'));
                    if (cornersMarket && Array.isArray(cornersMarket.values)) {
                        cornersMarket.values.forEach(v => {
                            if (v.value && v.odd) {
                                availableOdds[`${v.value} Corners`] = parseFloat(v.odd);
                            }
                        });
                    }
                }
            } else if (item._mockOdds) {
                Object.assign(availableOdds, item._mockOdds);
            }

            return {
                matchId,
                homeTeam,
                awayTeam,
                league,
                round,
                kickoffTime,
                zeroZeroOdds: vaultMatch?.correctScoreOdds?.['0:0'] || item._zeroZeroOdds || null,
                homeForm: enrich.homeForm || 'Use current season knowledge',
                awayForm: enrich.awayForm || 'Use current season knowledge',
                homeRecord: enrich.homeRecord || 'Use current season home record',
                awayRecord: enrich.awayRecord || 'Use current season away record',
                homeGoals: enrich.homeGoals || 'Use current season goals scored/conceded',
                awayGoals: enrich.awayGoals || 'Use current season goals scored/conceded',
                h2hSummary: enrich.h2hSummary || 'Use recent H2H knowledge',
                injuriesAndSuspensions: enrich.injuriesAndSuspensions || 'Check known first-team injuries & suspensions',
                homeSchedule: getScheduleContext(homeTeam, matchId, kickoffTime),
                awaySchedule: getScheduleContext(awayTeam, matchId, kickoffTime),
                availableOdds
            };
        });

        // Evaluate in batches of 12 with Groq AI so JSON output is never truncated and evaluations are thorough
        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: groqKey });

        const evaluateBatch = async (batch) => {
            const matchDescriptions = batch.map((m, i) => {
                const oddsStr = Object.keys(m.availableOdds).length > 0
                    ? JSON.stringify(m.availableOdds)
                    : 'Not yet published by bookmaker (estimate realistic market odds)';
                return [
                    `MATCH #${i + 1} [matchId: "${m.matchId}"]`,
                    `Fixture: ${m.homeTeam} (Home) vs ${m.awayTeam} (Away)`,
                    `Competition & Round/Importance: ${m.league} - ${m.round}`,
                    `Kickoff: ${m.kickoffTime}`,
                    `Home Record & Form: ${m.homeRecord} | Recent Form: ${m.homeForm} | ${m.homeGoals}`,
                    `Away Record & Form: ${m.awayRecord} | Recent Form: ${m.awayForm} | ${m.awayGoals}`,
                    `Recent H2H: ${m.h2hSummary}`,
                    `First-Team Injuries & Suspensions: ${m.injuriesAndSuspensions}`,
                    `Home Schedule / Rotation Context: ${m.homeSchedule}`,
                    `Away Schedule / Rotation Context: ${m.awaySchedule}`,
                    `Available Bookmaker Odds: ${oddsStr}`
                ].join('\n');
            }).join('\n\n---\n\n');

            const systemPrompt = `You are an elite, strict institutional football betting analyst and quantitative modeler.
Your job is to evaluate upcoming matches for a curated 14-day betting slip and ONLY approve high-conviction picks after strictly weighing ALL of the following parameters:
1. Goals Scored & Goals Conceded: Home vs Away offensive output, xG, defensive solidity, clean sheet rates, and concession streaks.
2. Corners Profile: Wing play, shot volume, set-piece pressure, average corners won and conceded by both sides.
3. Home Records vs Away Records: Specific dominance at home vs vulnerability or counter-attacking strength on the road.
4. Underdog Dynamics: Whether the underdog is dangerous (giant-killer, strong low block, high motivation) making a straight win a trap.
5. First-Team Injuries & Suspensions: Impact of missing key first-team starters (strikers, playmakers, center-backs, goalkeepers).
6. Importance of the Game: Title race, European qualification, relegation battle, cup tie, derby intensity, or dead rubber.
7. Upcoming Game & Manager Rotation: Look closely at the Home/Away Schedule Context. If a team has a massive Champions League, Europa League, cup knockout, or top-of-the-table clash within 3-4 days, account for the manager resting key first-team players!

ALLOWED BETTING MARKETS (You MUST NOT limit picks to Over 1.5! Choose the single best market for each match across all categories):
- "Home Win"
- "Away Win"
- "Over 1.5"
- "Over 2.5"
- "Over 3.5"
- "Under 2.5"
- "Under 3.5"
- "BTTS - Yes"
- "BTTS - No"
- "Over 8.5 Corners"
- "Over 9.5 Corners"
- "Over 10.5 Corners"
- "Under 9.5 Corners"
- "Under 10.5 Corners"

STRICT SELECTION RULES:
- For every match, select the single market with the highest true probability and value after factoring in rotation, injuries, home/away records, underdog threat, and game importance.
- Diversify markets naturally based on each match's tactical profile (use Home Win, Away Win, Over/Under goals, BTTS - Yes/No, and Expected Corners markets where appropriate).
- Assign an integer "confidence" from 50 to 98.
- Set "includeInSlip": true ONLY if the match passes strict evaluation with high confidence (typically confidence >= 72 and no severe unpredictable rotation/injury trap). If a game is too unpredictable, set "includeInSlip": false.
- Return ONLY valid JSON with a top-level "evaluations" array.`;

            const userPrompt = `Strictly evaluate the following ${batch.length} upcoming matches and return a JSON object with an "evaluations" array.
Each item in "evaluations" MUST have this exact structure:
{
  "matchId": "string (must match the input matchId)",
  "includeInSlip": boolean,
  "selectedMarket": "one of the allowed markets (Home Win, Away Win, Over 1.5, Over 2.5, Under 2.5, Under 3.5, BTTS - Yes, BTTS - No, Over 8.5 Corners, Over 9.5 Corners, Over 10.5 Corners, Under 9.5 Corners, Under 10.5 Corners)",
  "marketOdds": number (use bookmaker odd if provided for that market, otherwise a realistic decimal odd between 1.22 and 2.35),
  "confidence": number (integer 50-98 representing strict AI confidence percentage),
  "expectedCorners": "string e.g. 'Home 6.5 - Away 3.5 (Total: 10.0)'",
  "rotationRisk": "Low" | "Medium" | "High",
  "gameImportance": "short string e.g. 'High - League Title Race' or 'Cup Rotation Risk'",
  "reasoning": "2 concise sentences explaining how goals scored/conceded, home/away records, underdog factor, injuries/suspensions, game importance, corners, and upcoming-game rotation dictated this pick."
}

Matches to evaluate:
${matchDescriptions}`;

            let completion;
            try {
                completion = await groq.chat.completions.create({
                    model: 'openai/gpt-oss-120b',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.2,
                    response_format: { type: 'json_object' }
                });
            } catch (jsonModeErr) {
                completion = await groq.chat.completions.create({
                    model: 'openai/gpt-oss-120b',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    temperature: 0.2
                });
            }

            const rawContent = completion.choices[0]?.message?.content || '{}';
            let parsed = {};
            try {
                parsed = JSON.parse(rawContent);
            } catch (e) {
                const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0]);
                }
            }
            return Array.isArray(parsed.evaluations) ? parsed.evaluations : [];
        };

        const batchSize = 12;
        const batches = [];
        for (let i = 0; i < preparedMatches.length; i += batchSize) {
            batches.push(preparedMatches.slice(i, i + batchSize));
        }

        const batchEvaluations = await Promise.all(
            batches.map(b =>
                evaluateBatch(b).catch(err => {
                    console.error('AI batch evaluation error:', err.message);
                    return [];
                })
            )
        );

        const evalMap = new Map();
        batchEvaluations.flat().forEach(ev => {
            if (ev && ev.matchId) {
                evalMap.set(String(ev.matchId), ev);
            }
        });

        const evaluatedMatches = [];
        for (const m of preparedMatches) {
            const ev = evalMap.get(m.matchId);
            if (!ev) continue;

            const conf = Number(ev.confidence) || 0;
            if (!ev.includeInSlip || conf < minConfidence) continue;

            const chosenMarket = ev.selectedMarket || 'Over 1.5';
            const realOdd = m.availableOdds[chosenMarket];
            const finalOdd =
                realOdd && !isNaN(realOdd)
                    ? Number(realOdd)
                    : ev.marketOdds && !isNaN(ev.marketOdds) && Number(ev.marketOdds) > 1.05
                    ? Number(ev.marketOdds)
                    : this.estimateDefaultOdds(chosenMarket);

            evaluatedMatches.push({
                matchId: m.matchId,
                league: m.league,
                round: m.round,
                homeTeam: m.homeTeam,
                awayTeam: m.awayTeam,
                kickoffTime: m.kickoffTime,
                selectedMarket: chosenMarket,
                marketOdds: parseFloat(finalOdd.toFixed(2)),
                zeroZeroOdds: m.zeroZeroOdds,
                confidence: Math.round(conf),
                expectedCorners: ev.expectedCorners || null,
                rotationRisk: ev.rotationRisk || 'Low',
                gameImportance: ev.gameImportance || m.round,
                reasoning: ev.reasoning || 'AI high-conviction pick based on form, injuries, and schedule analysis.',
                strategy: 'AI_Strict_MultiMarket'
            });
        }

        // Prioritize HIGHER confidence first when adding games to the slip
        evaluatedMatches.sort((a, b) => {
            if (b.confidence !== a.confidence) return b.confidence - a.confidence;
            return new Date(a.kickoffTime) - new Date(b.kickoffTime);
        });

        return {
            matches: evaluatedMatches,
            totalEvaluated: preparedMatches.length
        };
    }
}

module.exports = AiPrematchService;
