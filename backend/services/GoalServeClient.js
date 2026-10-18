const axios = require('axios');

class GoalServeClient {
    static async fetchFixturesAndOdds() {
        const apiKey = process.env.GOALSERVE_API_KEY;
        const baseUrl = process.env.GOALSERVE_BASE_URL || 'http://www.goalserve.com/getfeed';
        const sport = process.env.GOALSERVE_SPORT || 'soccer';
        
        const url = `${baseUrl}/${apiKey}/${sport}odds/json`;
        console.log(`GoalServeClient: Fetching from GoalServe API...`);
        
        const response = await axios.get(url);
        return this.normalizeGoalServeResponse(response.data);
    }

    static normalizeGoalServeResponse(data) {
        const matches = [];
        
        // GoalServe typically wraps everything in data.scores.category
        const categories = data?.scores?.category;
        if (!categories) return matches;

        const categoryArray = Array.isArray(categories) ? categories : [categories];

        for (const cat of categoryArray) {
            const leagueName = cat.name;
            const matchArray = Array.isArray(cat.match) ? cat.match : [cat.match];

            for (const match of matchArray) {
                if (!match) continue;

                const homeTeam = match.localteam?.name || match.localteam?.['@name'];
                const awayTeam = match.visitorteam?.name || match.visitorteam?.['@name'];
                
                // Parse Odds
                let zeroZeroOdds = null;
                const oddsTypes = match.odds?.type;
                if (!oddsTypes) continue;

                const oddsArray = Array.isArray(oddsTypes) ? oddsTypes : [oddsTypes];
                
                const correctScoreMarket = oddsArray.find(o => o.value === 'Correct Score' || o['@name'] === 'Correct Score');
                if (!correctScoreMarket) continue;

                const bookmakers = correctScoreMarket.bookmaker;
                const bookmakerArray = Array.isArray(bookmakers) ? bookmakers : [bookmakers];
                const bookmaker = bookmakerArray[0]; // Take the first available bookmaker
                if (!bookmaker) continue;

                const oddEntries = Array.isArray(bookmaker.odd) ? bookmaker.odd : [bookmaker.odd];
                
                // GoalServe correct score format is usually "0:0" or "0-0"
                const zeroZeroOutcome = oddEntries.find(o => o.name === '0:0' || o.name === '0-0' || o['@name'] === '0:0' || o['@name'] === '0-0');
                
                if (zeroZeroOutcome) {
                    zeroZeroOdds = parseFloat(zeroZeroOutcome.value || zeroZeroOutcome['@value']);
                }

                if (zeroZeroOdds) {
                    matches.push({
                        matchId: match.fixture_id || match['@id'] || Math.random().toString(),
                        league: leagueName,
                        homeTeam: homeTeam,
                        awayTeam: awayTeam,
                        correctScoreOdds: {
                            '0:0': zeroZeroOdds
                        },
                        marketOdds: {}
                    });
                }
            }
        }
        return matches;
    }
}

module.exports = GoalServeClient;
