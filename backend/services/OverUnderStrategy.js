class OverUnderStrategy {
    static execute(matches) {
        const validMatches = [];

        for (const match of matches) {
            const zeroZeroOdds = match.correctScoreOdds ? match.correctScoreOdds['0:0'] : null;
            if (!zeroZeroOdds) continue;

            let selectedMarket = null;
            let category = null;

            if (zeroZeroOdds <= 5.0) {
                selectedMarket = 'Under 2.5';
                category = 'very_low';
            } else if (zeroZeroOdds > 5.0 && zeroZeroOdds <= 10.0) {
                selectedMarket = 'Under 3.5';
                category = 'low';
            } else if (zeroZeroOdds > 10.0 && zeroZeroOdds < 20.0) {
                selectedMarket = 'Over 1.5';
                category = 'moderate';
            } else if (zeroZeroOdds >= 20.0) {
                selectedMarket = 'Over 2.5';
                category = 'high';
            }

            if (selectedMarket) {
                const individualOdds = match.marketOdds && match.marketOdds[selectedMarket];
                if (!individualOdds) continue; // Reject if real odds are not found for this market on the bookies
                
                if (selectedMarket === 'Over 1.5' && individualOdds <= 1.20) {
                    continue; // Filter out odds 1.20 or below for Over 1.5 strategy
                }
                
                const confidence = this.calculateConfidence(individualOdds);

                let stratId = 'OverUnder';
                if (selectedMarket === 'Over 1.5') stratId = 'Over15';
                if (selectedMarket === 'Over 2.5') stratId = 'Over25';
                if (selectedMarket === 'Under 2.5') stratId = 'Under25';
                if (selectedMarket === 'Under 3.5') stratId = 'Under35';

                validMatches.push({
                    matchId: match.matchId,
                    league: match.league,
                    homeTeam: match.homeTeam,
                    awayTeam: match.awayTeam,
                    kickoffTime: match.kickoffTime,
                    selectedMarket: selectedMarket,
                    zeroZeroOdds: zeroZeroOdds,
                    marketOdds: individualOdds,
                    confidence: confidence,
                    category: category,
                    strategy: stratId
                });
            }
        }

        return validMatches;
    }

    static calculateConfidence(odds) {
        let confidence = (1 / odds) * 100;
        return parseFloat(confidence.toFixed(2));
    }

    static estimateOdds(market) {
        if (market === 'Under 2.5') return 1.50;
        if (market === 'Under 3.5') return 1.30;
        if (market === 'Over 1.5') return 1.25;
        if (market === 'Over 2.5') return 1.60;
        return 1.5;
    }
}

module.exports = OverUnderStrategy;
