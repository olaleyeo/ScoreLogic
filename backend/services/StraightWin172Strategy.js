class StraightWin172Strategy {
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

            // Home or Away odd 1.72-2.00 vs significantly bigger opponent odd (confidence 50%+)
            if (homeOdds >= 1.72 && homeOdds <= 2.00 && awayOdds >= 2.8) {
                selectedMarket = 'Home Win';
                marketOdds = homeOdds;
            } else if (awayOdds >= 1.72 && awayOdds <= 2.00 && homeOdds >= 2.8) {
                selectedMarket = 'Away Win';
                marketOdds = awayOdds;
            }

            if (selectedMarket) {
                console.log(`[StraightWin172] Match ${match.homeTeam} vs ${match.awayTeam} PASSED for ${selectedMarket} @ ${marketOdds}`);
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
                    strategy: 'StraightWin172'
                });
            }
        }

        return validMatches;
    }
}

module.exports = StraightWin172Strategy;
