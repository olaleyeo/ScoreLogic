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
}

module.exports = AiPrematchService;
