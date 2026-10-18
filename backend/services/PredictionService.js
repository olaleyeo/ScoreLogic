const StraightWinStrategy = require('./StraightWinStrategy');
const StraightWin130Strategy = require('./StraightWin130Strategy');
const StraightWin172Strategy = require('./StraightWin172Strategy');
const OverUnderStrategy = require('./OverUnderStrategy');
const DrawInHalfStrategy = require('./DrawInHalfStrategy');

class PredictionService {
    static predictMarkets(matches) {
        let predictions = [];

        // Execute all strategies
        const straightWinPredictions = StraightWinStrategy.execute(matches);
        const straightWin130Predictions = StraightWin130Strategy.execute(matches);
        const straightWin172Predictions = StraightWin172Strategy.execute(matches);
        const overUnderPredictions = OverUnderStrategy.execute(matches);
        const drawInHalfPredictions = DrawInHalfStrategy.execute(matches);

        // Combine all predictions
        predictions = [
            ...straightWinPredictions,
            ...straightWin130Predictions,
            ...straightWin172Predictions,
            ...overUnderPredictions,
            ...drawInHalfPredictions
        ];

        // Format and filter valid predictions
        return predictions.map(p => ({
            odds_0_0: p.zeroZeroOdds,
            prediction: p.selectedMarket,
            confidence: p.confidence,
            category: p.category || 'N/A', // O/U has category, others might not
            strategy: p.strategy, // Track which strategy generated this
            
            // Original fields
            matchId: p.matchId,
            league: p.league,
            homeTeam: p.homeTeam,
            awayTeam: p.awayTeam,
            kickoffTime: p.kickoffTime,
            selectedMarket: p.selectedMarket,
            zeroZeroOdds: p.zeroZeroOdds,
            marketOdds: p.marketOdds
        }));
    }
}

module.exports = PredictionService;
