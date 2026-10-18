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

            // Home odd 1.72-1.80 vs significantly bigger Away odd -> straight Home win (1)
            // Using awayOdds >= 3.5 as "significantly bigger" for a 1.72+ home favourite
            if (homeOdds >= 1.72 && homeOdds <= 1.80 && awayOdds >= 3.5) {
                selectedMarket = 'Home Win';
                marketOdds = homeOdds;
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
