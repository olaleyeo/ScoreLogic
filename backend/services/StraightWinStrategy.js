class StraightWinStrategy {
    static execute(matches) {
        const validMatches = [];

        for (const match of matches) {
            if (!match.matchWinnerOdds) {
                continue;
            }

            const homeOdds = match.matchWinnerOdds['Home'] || match.matchWinnerOdds['1'];
            const awayOdds = match.matchWinnerOdds['Away'] || match.matchWinnerOdds['2'];

            if (!homeOdds || !awayOdds) continue;

            let selectedMarket = null;
            let marketOdds = null;

            // Search criteria: 50% confidence and above (marketOdds between 1.20 and 2.00)
            if (homeOdds >= 1.20 && homeOdds <= 2.00 && awayOdds >= 2.4) {
                selectedMarket = 'Home Win';
                marketOdds = homeOdds;
            } else if (awayOdds >= 1.20 && awayOdds <= 2.00 && homeOdds >= 2.4) {
                selectedMarket = 'Away Win';
                marketOdds = awayOdds;
            }

            if (selectedMarket) {
                console.log(`[StraightWin] Match ${match.homeTeam} vs ${match.awayTeam} PASSED for ${selectedMarket} @ ${marketOdds}`);
                validMatches.push({
                    matchId: match.matchId,
                    league: match.league,
                    homeTeam: match.homeTeam,
                    awayTeam: match.awayTeam,
                    kickoffTime: match.kickoffTime,
                    selectedMarket: selectedMarket,
                    zeroZeroOdds: match.correctScoreOdds ? match.correctScoreOdds['0:0'] : null,
                    marketOdds: marketOdds,
                    confidence: parseFloat(((1 / marketOdds) * 100).toFixed(2)),
                    strategy: 'StraightWin'
                });
            }
        }

        return validMatches;
    }
}

module.exports = StraightWinStrategy;
