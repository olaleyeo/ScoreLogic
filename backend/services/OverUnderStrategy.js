class OverUnderStrategy {
    static execute(matches) {
        const validMatches = [];

        for (const match of matches) {
            const zeroZeroOdds = match.correctScoreOdds ? match.correctScoreOdds['0:0'] : null;
            const marketOdds = match.marketOdds || {};

            const candidates = [];

            // 1. Over 1.5 Strategy (confidence >= 50% -> odds between 1.21 and 2.00)
            const o15Odds = marketOdds['Over 1.5'];
            if (o15Odds && o15Odds > 1.20 && o15Odds <= 2.00) {
                if (!zeroZeroOdds || zeroZeroOdds >= 6.0) {
                    candidates.push({
                        selectedMarket: 'Over 1.5',
                        strategy: 'Over15',
                        marketOdds: o15Odds,
                        category: zeroZeroOdds && zeroZeroOdds >= 15.0 ? 'high' : 'moderate'
                    });
                }
            }

            // 2. Over 2.5 Strategy (confidence >= 50% -> odds <= 2.00)
            const o25Odds = marketOdds['Over 2.5'];
            if (o25Odds && o25Odds <= 2.00) {
                if (!zeroZeroOdds || zeroZeroOdds >= 10.0) {
                    candidates.push({
                        selectedMarket: 'Over 2.5',
                        strategy: 'Over25',
                        marketOdds: o25Odds,
                        category: 'high'
                    });
                }
            }

            // 3. Under 2.5 Strategy (confidence >= 50% -> odds <= 2.00)
            const u25Odds = marketOdds['Under 2.5'];
            if (u25Odds && u25Odds <= 2.00) {
                if (!zeroZeroOdds || zeroZeroOdds <= 7.0) {
                    candidates.push({
                        selectedMarket: 'Under 2.5',
                        strategy: 'Under25',
                        marketOdds: u25Odds,
                        category: 'very_low'
                    });
                }
            }

            // 4. Under 3.5 Strategy (confidence >= 50% -> odds <= 2.00)
            const u35Odds = marketOdds['Under 3.5'];
            if (u35Odds && u35Odds <= 2.00) {
                if (!zeroZeroOdds || zeroZeroOdds <= 13.0) {
                    candidates.push({
                        selectedMarket: 'Under 3.5',
                        strategy: 'Under35',
                        marketOdds: u35Odds,
                        category: 'low'
                    });
                }
            }

            for (const cand of candidates) {
                const confidence = this.calculateConfidence(cand.marketOdds);
                // Criteria: 50% confidence and above
                if (confidence >= 50.0) {
                    validMatches.push({
                        matchId: match.matchId,
                        league: match.league,
                        homeTeam: match.homeTeam,
                        awayTeam: match.awayTeam,
                        kickoffTime: match.kickoffTime,
                        selectedMarket: cand.selectedMarket,
                        zeroZeroOdds: zeroZeroOdds,
                        marketOdds: cand.marketOdds,
                        confidence: confidence,
                        category: cand.category,
                        strategy: cand.strategy
                    });
                }
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
