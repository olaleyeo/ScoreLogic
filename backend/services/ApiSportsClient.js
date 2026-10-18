const axios = require('axios');

class ApiSportsClient {
    static async fetchFixturesAndOdds({ date }) {
        const apiKey = process.env.API_FOOTBALL_KEY;
        let targetDate = new Date().toISOString().split('T')[0];
        if (date === 'today') {
            targetDate = new Date().toISOString().split('T')[0];
        } else if (date === 'tomorrow') {
            const tmr = new Date();
            tmr.setDate(tmr.getDate() + 1);
            targetDate = tmr.toISOString().split('T')[0];
        } else if (date) {
            targetDate = date;
        }
        console.log(`ApiSportsClient: Fetching fixtures and odds for date ${targetDate}...`);
        
        try {
            // 1. Fetch Fixtures (to get team names)
            const fixturesRes = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
                headers: { 'x-apisports-key': apiKey },
                params: { date: targetDate }
            });

            if (fixturesRes.data?.errors && Object.keys(fixturesRes.data.errors).length > 0) {
                throw new Error('API-Sports returned an error: ' + JSON.stringify(fixturesRes.data.errors));
            }
            
            const fixturesMap = {};
            if (fixturesRes.data?.response) {
                fixturesRes.data.response.forEach(item => {
                    if (item.fixture && item.teams) {
                        const countryStr = item.league?.country ? `${item.league.country} ` : '';
                        fixturesMap[item.fixture.id] = {
                            home: item.teams.home?.name || 'Home',
                            away: item.teams.away?.name || 'Away',
                            league: `${countryStr}${item.league?.name || 'Unknown'}`.trim(),
                            leagueId: item.league?.id
                        };
                    }
                });
            }

            // 2. Fetch Odds (Paginated to get all matches)
            let allOddsResponse = [];
            let page = 1;
            let totalPages = 1;

            const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            do {
                if (page > 1) {
                    await sleep(50); // 50ms delay to balance speed and rate limits
                }
                
                console.log(`ApiSportsClient: Fetching odds page ${page} of ${totalPages || '?'}...`);
                const oddsRes = await axios.get(`https://v3.football.api-sports.io/odds`, {
                    headers: { 'x-apisports-key': apiKey },
                    params: { date: targetDate, page: page }
                });

                if (oddsRes.data?.errors && Object.keys(oddsRes.data.errors).length > 0) {
                    // Check for rate limit specifically
                    if (oddsRes.data.errors.rateLimit) {
                        console.error('Rate limit hit. Waiting 5 seconds before retrying...');
                        await sleep(5000);
                        continue; // Retry the same page
                    }
                    throw new Error('API-Sports returned an error: ' + JSON.stringify(oddsRes.data.errors));
                }

                if (oddsRes.data?.response) {
                    allOddsResponse = allOddsResponse.concat(oddsRes.data.response);
                }

                totalPages = oddsRes.data?.paging?.total || 1;
                console.log(`ApiSportsClient: Fetched page ${page}. Total pages available: ${totalPages}. Items so far: ${allOddsResponse.length}`);
                
                page++;
            } while (page <= totalPages);



            return this.normalizeApiSportsResponse(allOddsResponse, fixturesMap);
        } catch (error) {
            console.error('API-Sports fetch error:', error.message);
            throw error;
        }
    }

    static normalizeApiSportsResponse(apiResponse, fixturesMap = {}) {
        const matches = [];

        if (!apiResponse || !Array.isArray(apiResponse)) return matches;

        for (const item of apiResponse) {
            const fixture = item.fixture;
            const bookmakers = item.bookmakers;

            if (!fixture || !bookmakers || bookmakers.length === 0) continue;

            const fixtureInfo = fixturesMap[fixture.id] || {};
            const homeTeam = fixtureInfo.home || 'Home';
            const awayTeam = fixtureInfo.away || 'Away';
            const countryStr = item.league?.country ? `${item.league.country} ` : '';
            const defaultLeague = `${countryStr}${item.league?.name || 'Unknown'}`.trim();
            const leagueName = fixtureInfo.league || defaultLeague;
            const kickoffTime = fixture.date;
            
            // Prioritize Bet365 (id: 8) since user compares against it, then 1xBet (id: 11), then fallback
            const findMarket = (marketId, nameSubStr) => {
                const isMatch = (m) => m.id === marketId || (m.name && m.name.toLowerCase().includes(nameSubStr));
                
                // 1. Try Bet365
                const bet365 = bookmakers.find(b => b.id === 8 && b.bets && b.bets.some(isMatch));
                if (bet365) return bet365.bets.find(isMatch);
                
                // 2. Try 1xBet
                const onexbet = bookmakers.find(b => b.id === 11 && b.bets && b.bets.some(isMatch));
                if (onexbet) return onexbet.bets.find(isMatch);

                // 3. Fallback to any bookmaker that has this market
                for (const bookie of bookmakers) {
                    if (bookie.bets) {
                        const m = bookie.bets.find(isMatch);
                        if (m) return m;
                    }
                }
                return null;
            };

            const exactScoreMarket = findMarket(10, 'exact score');
            const overUnderMarket = findMarket(5, 'goals over/under');
            const firstHalfExactScoreMarket = findMarket(31, 'correct score - first half');
            const secondHalfExactScoreMarket = findMarket(62, 'correct score - second half');
            const matchWinnerMarket = findMarket(1, 'match winner');
            const htGoalsMarket = findMarket(12, 'goals over/under first half');
            const shGoalsMarket = findMarket(13, 'goals over/under second half');

            if (!exactScoreMarket) continue;

            // Find 0:0 odds
            const zeroZeroOutcome = exactScoreMarket.values.find(v => v.value === '0:0' || v.value === '0-0');
            if (!zeroZeroOutcome) continue;

            const zeroZeroOdds = parseFloat(zeroZeroOutcome.odd);
            if (isNaN(zeroZeroOdds)) continue;

            // Find Goals Over/Under market (Market ID: 5)
            const marketOdds = {};
            if (overUnderMarket) {
                const u25 = overUnderMarket.values.find(v => v.value === 'Under 2.5');
                if (u25) marketOdds['Under 2.5'] = parseFloat(u25.odd);

                const u35 = overUnderMarket.values.find(v => v.value === 'Under 3.5');
                if (u35) marketOdds['Under 3.5'] = parseFloat(u35.odd);

                const o15 = overUnderMarket.values.find(v => v.value === 'Over 1.5');
                if (o15) marketOdds['Over 1.5'] = parseFloat(o15.odd);

                const o25 = overUnderMarket.values.find(v => v.value === 'Over 2.5');
                if (o25) marketOdds['Over 2.5'] = parseFloat(o25.odd);
            }

            const parseExactScoreMarket = (market) => {
                const odds = {};
                if (!market || !market.values) return odds;
                market.values.forEach(v => {
                    const score = v.value.replace('-', ':');
                    odds[score] = parseFloat(v.odd);
                });
                return odds;
            };

            // Match Winner Market (id: 1)
            const matchWinnerOdds = {};
            if (matchWinnerMarket && matchWinnerMarket.values) {
                matchWinnerMarket.values.forEach(v => {
                    matchWinnerOdds[v.value] = parseFloat(v.odd);
                });
            }

            // Goals Over/Under First Half (id: 12)
            const htGoalsOdds = {};
            if (htGoalsMarket && htGoalsMarket.values) {
                htGoalsMarket.values.forEach(v => {
                    htGoalsOdds[v.value] = parseFloat(v.odd);
                });
            }

            // Goals Over/Under Second Half (id: 13)
            const shGoalsOdds = {};
            if (shGoalsMarket && shGoalsMarket.values) {
                shGoalsMarket.values.forEach(v => {
                    shGoalsOdds[v.value] = parseFloat(v.odd);
                });
            }

            matches.push({
                matchId: fixture.id?.toString() || Math.random().toString(),
                league: leagueName,
                homeTeam: homeTeam,
                awayTeam: awayTeam,
                kickoffTime: kickoffTime,
                correctScoreOdds: {
                    '0:0': zeroZeroOdds
                },
                marketOdds: marketOdds,
                matchWinnerOdds: matchWinnerOdds,
                htGoalsOdds: htGoalsOdds,
                shGoalsOdds: shGoalsOdds,
                rawMarkets: bookmakers[0].bets,
                firstHalfScoreOdds: parseExactScoreMarket(firstHalfExactScoreMarket),
                secondHalfScoreOdds: parseExactScoreMarket(secondHalfExactScoreMarket)
            });
        }

        // Deduplicate matches by matchId (API-Sports pagination can sometimes return duplicates)
        const uniqueMatchesMap = new Map();
        for (const match of matches) {
            uniqueMatchesMap.set(match.matchId, match);
        }

        return Array.from(uniqueMatchesMap.values());
    }
}

module.exports = ApiSportsClient;
