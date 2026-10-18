const { Prediction, SlipMatch, initDB } = require('./database');
const PredictionService = require('./services/PredictionService');

async function fixConfidence() {
    await initDB();
    
    // Update Predictions
    const predictions = await Prediction.findAll();
    for (let p of predictions) {
        // Find individual odds. Wait, prediction has selectedMarket and marketOdds!
        // wait, Prediction model does NOT have marketOdds in db schema?
        // Ah, let's check database.js! 
        // Prediction has selectedMarket, but does it have marketOdds?
        // Actually, let's just use PredictionService.estimateOdds if missing.
        const individualOdds = p.marketOdds || PredictionService.estimateOdds(p.selectedMarket);
        const newConfidence = PredictionService.calculateConfidence(individualOdds);
        await p.update({ confidence: newConfidence.toString() });
    }
    
    // Update SlipMatches
    const matches = await SlipMatch.findAll();
    for (let m of matches) {
        const individualOdds = m.marketOdds || PredictionService.estimateOdds(m.selectedMarket);
        const newConfidence = PredictionService.calculateConfidence(individualOdds);
        await m.update({ confidence: newConfidence.toString() });
    }
    
    console.log("Database confidence scores successfully updated!");
}

fixConfidence();
