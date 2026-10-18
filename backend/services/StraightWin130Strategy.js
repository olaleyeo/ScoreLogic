class StraightWin130Strategy {
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

            if (homeOdds >= 1.30 && homeOdds <= 1.36 && awayOdds >= 8.0) {
                selectedMarket = 'Home Win';
                marketOdds = homeOdds;
            } else if (awayOdds >= 1.30 && awayOdds <= 1.36 && homeOdds >= 8.0) {
                selectedMarket = 'Away Win';
                marketOdds = awayOdds;
            }

            if (selectedMarket) {
                console.log(`[StraightWin130] Match ${match.homeTeam} vs ${match.awayTeam} PASSED for ${selectedMarket} @ ${marketOdds}`);
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
                    strategy: 'StraightWin130'
                });
            }
        }

        return validMatches;
    }
}

module.exports = StraightWin130Strategy;
