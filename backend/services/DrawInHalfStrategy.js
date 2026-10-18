class DrawInHalfStrategy {
    static execute(matches) {
        const validMatches = [];

        for (const match of matches) {
            // First Half Check
            if (!match.firstHalfScoreOdds || Object.keys(match.firstHalfScoreOdds).length === 0) {
                console.log(`[DrawInHalf] Match ${match.homeTeam} vs ${match.awayTeam} missing First Half Exact Score odds.`);
                continue;
            }
            let lowestFHOdds = Infinity;
            let lowestFHScore = null;
            for (const [score, odds] of Object.entries(match.firstHalfScoreOdds)) {
                if (odds < lowestFHOdds) {
                    lowestFHOdds = odds;
                    lowestFHScore = score;
                }
            }
            if (lowestFHScore !== '0:0' && lowestFHScore !== '0-0') {
                console.log(`[DrawInHalf] Match ${match.homeTeam} rejected: lowest FH score is ${lowestFHScore} @ ${lowestFHOdds}`);
                continue;
            }

            // Second Half Check
            if (!match.secondHalfScoreOdds || Object.keys(match.secondHalfScoreOdds).length === 0) {
                console.log(`[DrawInHalf] Match ${match.homeTeam} vs ${match.awayTeam} missing Second Half Exact Score odds.`);
                continue;
            }
            let lowestSHOdds = Infinity;
            let lowestSHScore = null;
            for (const [score, odds] of Object.entries(match.secondHalfScoreOdds)) {
                if (odds < lowestSHOdds) {
                    lowestSHOdds = odds;
                    lowestSHScore = score;
                }
            }
            if (lowestSHScore !== '0:0' && lowestSHScore !== '0-0') {
                console.log(`[DrawInHalf] Match ${match.homeTeam} rejected: lowest SH score is ${lowestSHScore} @ ${lowestSHOdds}`);
                continue;
            }

            // Passed both checks
            console.log(`[DrawInHalf] Match ${match.homeTeam} vs ${match.awayTeam} PASSED!`);
            validMatches.push({
                matchId: match.matchId,
                league: match.league,
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                kickoffTime: match.kickoffTime,
                selectedMarket: "Draw in Half - YES",
                zeroZeroOdds: match.correctScoreOdds ? match.correctScoreOdds['0:0'] : null,
                marketOdds: 1.5, // Optional default odds
                confidence: 66.67, // High confidence equivalent
                strategy: 'DrawInHalf'
            });
        }

        console.log(`[DrawInHalf] Total matches passed: ${validMatches.length}`);
        return validMatches;
    }
}

module.exports = DrawInHalfStrategy;
