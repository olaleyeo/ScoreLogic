const ApiSportsClient = require('./ApiSportsClient');
const { VaultMatch } = require('../database');

let oddsCache = {}; // { 'YYYY-MM-DD': { data: null, timestamp: 0 } }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

class OddsService {
    static async fetchMatches({ date, leagues, useVault = true }) {
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
        let matches = [];

        if (!apiKey || apiKey === 'your_api_key_here') {
            console.log('No valid API-Sports API key found. Using mock data.');
            matches = this.getMockData();
        } else {
            try {
                // Check Vault Database first if enabled
                let vaultRecords = null;
                if (useVault) {
                    vaultRecords = await VaultMatch.findAll({ where: { date: targetDate } });
                }
                if (vaultRecords && vaultRecords.length > 0) {
                    console.log(`Serving ${vaultRecords.length} matches from Vault for ${targetDate}...`);
                    matches = vaultRecords.map(record => JSON.parse(record.rawData));
                } else {
                    console.log(`Vault empty for ${targetDate}. Falling back to live API...`);
                    if (!oddsCache[targetDate]) {
                        oddsCache[targetDate] = { data: null, timestamp: 0, promise: null };
                    }

                    const now = Date.now();
                    if (oddsCache[targetDate].data && (now - oddsCache[targetDate].timestamp < CACHE_TTL)) {
                        console.log(`Serving odds from cache for ${targetDate}...`);
                        matches = oddsCache[targetDate].data;
                    } else if (oddsCache[targetDate].promise) {
                        console.log(`Waiting for existing odds fetch for ${targetDate}...`);
                        matches = await oddsCache[targetDate].promise;
                    } else {
                        oddsCache[targetDate].promise = ApiSportsClient.fetchFixturesAndOdds({ date: targetDate });
                        matches = await oddsCache[targetDate].promise;
                        
                        // Opportunistically save to vault so subsequent calls use the vault
                        if (matches && matches.length > 0) {
                            const vaultRecordsToSave = matches.map(m => ({
                                date: targetDate,
                                matchId: String(m.matchId),
                                rawData: JSON.stringify(m)
                            }));
                            await VaultMatch.bulkCreate(vaultRecordsToSave);
                            console.log(`Saved ${vaultRecordsToSave.length} matches to Vault for ${targetDate} during fallback fetch.`);
                        }

                        oddsCache[targetDate].data = matches;
                        oddsCache[targetDate].timestamp = Date.now();
                        oddsCache[targetDate].promise = null;
                    }
                }
            } catch (error) {
                console.error('Error fetching matches:', error.message);
                if (oddsCache[targetDate] && oddsCache[targetDate].promise) {
                    oddsCache[targetDate].promise = null; // Clear promise on error
                }
                throw error;
            }
        }

        // Apply User filters (from dropdown)
        if (leagues) {
            const leagueList = leagues.split(',').map(l => l.trim().toLowerCase());
            matches = matches.filter(m => leagueList.some(l => m.league.toLowerCase().includes(l)));
        }

        // Apply time filter: remove games that have already started or played
        // ONLY if we are fetching for today or future dates
        const todayStr = new Date().toISOString().split('T')[0];
        if (targetDate >= todayStr) {
            const now = new Date();
            matches = matches.filter(m => {
                if (!m.kickoffTime) return true; // Keep mock data or matches without time
                return new Date(m.kickoffTime) > now;
            });
        }

        return matches;
    }

    static getMockData() {
        const mockTime = new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString();
        const createMockMatch = (base) => ({
            ...base,
            kickoffTime: mockTime,
            firstHalfScoreOdds: { '0:0': 2.5, '1:0': 3.5, '0:1': 4.0 }, // lowest is 0:0
            secondHalfScoreOdds: { '0:0': 2.8, '1:0': 3.2, '0:1': 3.5 }, // lowest is 0:0
            matchWinnerOdds: base.matchWinnerOdds || { 'Home': 2.0, 'Draw': 3.0, 'Away': 4.0 },
            htGoalsOdds: base.htGoalsOdds || { 'Over 0.5': 1.5, 'Under 0.5': 2.5 },
            shGoalsOdds: base.shGoalsOdds || { 'Over 0.5': 1.4, 'Under 0.5': 2.8 }
        });
        const createMockMatchFail1 = (base) => ({
            ...base,
            kickoffTime: mockTime,
            firstHalfScoreOdds: { '0:0': 3.5, '1:0': 2.5, '0:1': 4.0 }, // lowest is 1:0
            secondHalfScoreOdds: { '0:0': 2.8, '1:0': 3.2, '0:1': 3.5 },
            matchWinnerOdds: base.matchWinnerOdds || { 'Home': 1.25, 'Draw': 5.0, 'Away': 12.0 }, // good for straight win
            htGoalsOdds: base.htGoalsOdds || { 'Over 0.5': 1.15, 'Under 0.5': 4.5 }, // good for HT strategy
            shGoalsOdds: base.shGoalsOdds || { 'Over 0.5': 1.15, 'Under 0.5': 4.8 }
        });
        const createMockMatchFail2 = (base) => ({
            ...base,
            kickoffTime: mockTime,
            firstHalfScoreOdds: { '0:0': 2.5, '1:0': 3.5, '0:1': 4.0 }, // lowest is 0:0
            secondHalfScoreOdds: { '0:0': 3.2, '1:0': 2.8, '0:1': 3.5 } // lowest is 1:0
        });

        return [
            // Safe Double 1
            createMockMatch({ matchId: '1', league: 'EPL', homeTeam: 'Arsenal', awayTeam: 'Chelsea', correctScoreOdds: { '0:0': 4.5 }, marketOdds: { 'Under 2.5': 1.6 } }),
            createMockMatchFail1({ matchId: '2', league: 'La Liga', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', correctScoreOdds: { '0:0': 22.0 }, marketOdds: { 'Over 2.5': 1.55 } }),
            // Safe Double 2
            createMockMatchFail2({ matchId: '3', league: 'Serie A', homeTeam: 'Juventus', awayTeam: 'Milan', correctScoreOdds: { '0:0': 6.0 }, marketOdds: { 'Under 3.5': 1.4 } }),
            createMockMatch({ matchId: '4', league: 'Bundesliga', homeTeam: 'Bayern', awayTeam: 'Dortmund', correctScoreOdds: { '0:0': 25.0 }, marketOdds: { 'Over 2.5': 1.45 } }),
            createMockMatch({ matchId: '5', league: 'Ligue 1', homeTeam: 'PSG', awayTeam: 'Marseille', correctScoreOdds: { '0:0': 18.0 }, marketOdds: { 'Over 1.5': 1.3 } }),
            // Safe Double 3
            createMockMatch({ matchId: '6', league: 'Eredivisie', homeTeam: 'Ajax', awayTeam: 'PSV', correctScoreOdds: { '0:0': 12.0 }, marketOdds: { 'Over 1.5': 1.25 } }),
            createMockMatchFail1({ matchId: '7', league: 'Primeira Liga', homeTeam: 'Benfica', awayTeam: 'Porto', correctScoreOdds: { '0:0': 7.5 }, marketOdds: { 'Under 3.5': 1.35 } }),
            createMockMatch({ matchId: '8', league: 'Championship', homeTeam: 'Leeds', awayTeam: 'Leicester', correctScoreOdds: { '0:0': 9.0 }, marketOdds: { 'Under 3.5': 1.3 } }),
            // Safe Double 4
            createMockMatchFail2({ matchId: '9', league: 'La Liga', homeTeam: 'Atletico', awayTeam: 'Sevilla', correctScoreOdds: { '0:0': 4.8 }, marketOdds: { 'Under 2.5': 1.5 } }),
            createMockMatch({ matchId: '10', league: 'EPL', homeTeam: 'Man City', awayTeam: 'Liverpool', correctScoreOdds: { '0:0': 21.0 }, marketOdds: { 'Over 2.5': 1.6 } }),
            // Safe Double 5
            createMockMatch({ matchId: '11', league: 'Serie A', homeTeam: 'Napoli', awayTeam: 'Roma', correctScoreOdds: { '0:0': 11.0 }, marketOdds: { 'Over 1.5': 1.4 } }),
            createMockMatchFail1({ matchId: '12', league: 'Bundesliga', homeTeam: 'Leverkusen', awayTeam: 'Leipzig', correctScoreOdds: { '0:0': 24.0 }, marketOdds: { 'Over 2.5': 1.5 } }),
            // Standard Five Matches
            createMockMatch({ matchId: '13', league: 'Ligue 1', homeTeam: 'Lyon', awayTeam: 'Monaco', correctScoreOdds: { '0:0': 15.0 }, marketOdds: { 'Over 1.5': 1.35 } }),
            createMockMatch({ matchId: '14', league: 'Eredivisie', homeTeam: 'Feyenoord', awayTeam: 'AZ', correctScoreOdds: { '0:0': 8.0 }, marketOdds: { 'Under 3.5': 1.3 } }),
            createMockMatch({ matchId: '15', league: 'Primeira Liga', homeTeam: 'Sporting', awayTeam: 'Braga', correctScoreOdds: { '0:0': 4.9 }, marketOdds: { 'Under 2.5': 1.55 } }),
            createMockMatch({ matchId: '16', league: 'Championship', homeTeam: 'Southampton', awayTeam: 'Ipswich', correctScoreOdds: { '0:0': 28.0 }, marketOdds: { 'Over 2.5': 1.65 } }),
            createMockMatchFail2({ matchId: '17', league: 'EPL', homeTeam: 'Tottenham', awayTeam: 'Man Utd', correctScoreOdds: { '0:0': 20.5 }, marketOdds: { 'Over 2.5': 1.5 } }),
            // Risky Ten Matches
            createMockMatch({ matchId: '18', league: 'La Liga', homeTeam: 'Betis', awayTeam: 'Sociedad', correctScoreOdds: { '0:0': 6.5 }, marketOdds: { 'Under 3.5': 1.25 } }),
            createMockMatch({ matchId: '19', league: 'Serie A', homeTeam: 'Inter', awayTeam: 'Lazio', correctScoreOdds: { '0:0': 23.0 }, marketOdds: { 'Over 2.5': 1.6 } }),
            createMockMatch({ matchId: '20', league: 'Bundesliga', homeTeam: 'Stuttgart', awayTeam: 'Frankfurt', correctScoreOdds: { '0:0': 14.0 }, marketOdds: { 'Over 1.5': 1.35 } }),
            createMockMatchFail1({ matchId: '21', league: 'Ligue 1', homeTeam: 'Lille', awayTeam: 'Lens', correctScoreOdds: { '0:0': 4.5 }, marketOdds: { 'Under 2.5': 1.45 } }),
            createMockMatch({ matchId: '22', league: 'Eredivisie', homeTeam: 'Twente', awayTeam: 'Vitesse', correctScoreOdds: { '0:0': 19.0 }, marketOdds: { 'Over 1.5': 1.28 } }),
            createMockMatch({ matchId: '23', league: 'Primeira Liga', homeTeam: 'Guimaraes', awayTeam: 'Rio Ave', correctScoreOdds: { '0:0': 8.5 }, marketOdds: { 'Under 3.5': 1.3 } }),
            createMockMatchFail2({ matchId: '24', league: 'Championship', homeTeam: 'Sunderland', awayTeam: 'Middlesbrough', correctScoreOdds: { '0:0': 5.5 }, marketOdds: { 'Under 3.5': 1.35 } }),
            createMockMatch({ matchId: '25', league: 'EPL', homeTeam: 'Newcastle', awayTeam: 'Aston Villa', correctScoreOdds: { '0:0': 26.0 }, marketOdds: { 'Over 2.5': 1.7 } }),
            createMockMatch({ matchId: '26', league: 'La Liga', homeTeam: 'Athletic', awayTeam: 'Villarreal', correctScoreOdds: { '0:0': 12.5 }, marketOdds: { 'Over 1.5': 1.3 } }),
            // Extra buffers just in case
            createMockMatch({ matchId: '27', league: 'Serie A', homeTeam: 'Fiorentina', awayTeam: 'Torino', correctScoreOdds: { '0:0': 9.5 }, marketOdds: { 'Under 3.5': 1.25 } }),
            createMockMatchFail1({ matchId: '28', league: 'Bundesliga', homeTeam: 'Wolfsburg', awayTeam: 'Hoffenheim', correctScoreOdds: { '0:0': 22.0 }, marketOdds: { 'Over 2.5': 1.55 } }),
            createMockMatch({ matchId: '29', league: 'Ligue 1', homeTeam: 'Nice', awayTeam: 'Rennes', correctScoreOdds: { '0:0': 4.9 }, marketOdds: { 'Under 2.5': 1.4 } }),
            createMockMatch({ matchId: '30', league: 'EPL', homeTeam: 'Everton', awayTeam: 'West Ham', correctScoreOdds: { '0:0': 16.0 }, marketOdds: { 'Over 1.5': 1.35 } })
        ];
    }
}

module.exports = OddsService;
