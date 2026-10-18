const cron = require('node-cron');
const OddsService = require('./services/OddsService');
const PredictionService = require('./services/PredictionService');
const SlipService = require('./services/SlipService');
const ResultService = require('./services/ResultService');
const ApiSportsClient = require('./services/ApiSportsClient');
const { Slip, SlipMatch, Prediction, VaultMatch } = require('./database');
const { Op } = require('sequelize');

const generateSlipsForDate = async (targetDateStr, fetchParam) => {
    console.log(`Generating slips for ${targetDateStr}...`);
    const matches = await OddsService.fetchMatches({ date: fetchParam });
    
    if (!matches || matches.length === 0) {
        console.log(`No upcoming matches found for ${targetDateStr}. Cannot generate slips.`);
        return;
    }

    const predictions = PredictionService.predictMarkets(matches);
    
    await Prediction.destroy({ where: { date: targetDateStr } });
    const predictionRecords = predictions.map(p => ({ ...p, date: targetDateStr }));
    await Prediction.bulkCreate(predictionRecords);

    const slipsData = SlipService.generateSlips(predictions);
    // FIX: Do not delete custom slips when generating auto-slips
    await Slip.destroy({ where: { date: targetDateStr, type: { [Op.ne]: 'custom' } } });

    for (const [strategy, stratSlips] of Object.entries(slipsData)) {
        for (const [type, slipData] of Object.entries(stratSlips)) {
            if (Array.isArray(slipData)) {
                for (let i = 0; i < slipData.length; i++) {
                    const slip = slipData[i];
                    if (slip.matches.length > 0) {
                        const dbSlip = await Slip.create({ date: targetDateStr, type: `${strategy}_${type}_${i+1}`, totalOdds: slip.totalOdds });
                        const matchesToSave = slip.matches.map(m => ({ ...m, slipId: dbSlip.id }));
                        await SlipMatch.bulkCreate(matchesToSave);
                    }
                }
            } else if (slipData && slipData.matches.length > 0) {
                const dbSlip = await Slip.create({ date: targetDateStr, type: `${strategy}_${type}`, totalOdds: slipData.totalOdds });
                const matchesToSave = slipData.matches.map(m => ({ ...m, slipId: dbSlip.id }));
                await SlipMatch.bulkCreate(matchesToSave);
            }
        }
    }
    console.log(`Slip generation successful for ${targetDateStr}!`);
};

const runDailyTask = async () => {
    try {
        console.log('Running daily task to evaluate matches and cleanup...');
        
        // Auto-slip generation is disabled per user request.
        // If re-enabled, uncomment the lines below:
        // const tomorrow = new Date();
        // tomorrow.setDate(tomorrow.getDate() + 1);
        // const dateStr = tomorrow.toISOString().split('T')[0];
        // await generateSlipsForDate(dateStr, 'tomorrow');

        // Evaluate pending match results from previous days
        await ResultService.evaluatePendingMatches();

        // Cleanup records older than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoffDateStr = sevenDaysAgo.toISOString().split('T')[0];

        console.log(`Cleaning up records older than ${cutoffDateStr}...`);
        
        // Find old slips to delete their matches first (fixes SQLite foreign key constraint error)
        const oldSlips = await Slip.findAll({ where: { date: { [Op.lt]: cutoffDateStr } } });
        const oldSlipIds = oldSlips.map(s => s.id);
        
        if (oldSlipIds.length > 0) {
            await SlipMatch.destroy({ where: { slipId: { [Op.in]: oldSlipIds } } });
        }

        await Slip.destroy({ where: { date: { [Op.lt]: cutoffDateStr } } });
        await Prediction.destroy({ where: { date: { [Op.lt]: cutoffDateStr } } });
        // Note: SlipMatch records are automatically handled if onDelete cascade is set, 
        // but if not, they might be orphaned. Let's explicitly destroy old SlipMatches.
        // Actually, SlipMatch doesn't have a 'date' column, it relies on slipId.
        // But since we didn't define ON DELETE CASCADE explicitly in database.js, 
        // Sequelize doesn't automatically cascade deletes unless configured.
        // Let's just destroy them safely in Slip.destroy by configuring cascade if needed.
        // Or simply wait, since we use SlipMatch.belongsTo(Slip), we can just let it be, but they will be orphaned.
        // A simple query to delete orphaned matches:
        // (Not strictly necessary right now as SQLite is small, but good practice)
        console.log('Cleanup completed.');

    } catch (err) {
        console.error('Failed to run daily cron task:', err);
    }
};

const populateVault = async () => {
    try {
        console.log('Populating Vault with upcoming matches...');
        
        const datesToFetch = [];
        const today = new Date();
        for (let i = 0; i <= 2; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            datesToFetch.push(d.toISOString().split('T')[0]);
        }
        
        for (const targetDate of datesToFetch) {
            console.log(`Fetching matches for Vault for date: ${targetDate}`);
            const rawMatches = await ApiSportsClient.fetchFixturesAndOdds({ date: targetDate });
            
            if (rawMatches && rawMatches.length > 0) {
                await VaultMatch.destroy({ where: { date: targetDate } });
                
                const vaultRecords = rawMatches.map(m => ({
                    date: targetDate,
                    matchId: String(m.matchId),
                    rawData: JSON.stringify(m)
                }));
                
                await VaultMatch.bulkCreate(vaultRecords);
                console.log(`Saved ${vaultRecords.length} matches to Vault for ${targetDate}`);
            } else {
                console.log(`No matches found for Vault on ${targetDate}`);
            }
        }
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoffDateStr = sevenDaysAgo.toISOString().split('T')[0];
        
        await VaultMatch.destroy({ where: { date: { [Op.lt]: cutoffDateStr } } });
        console.log('Vault cleanup completed.');
        
    } catch (err) {
        console.error('Error populating Vault:', err);
    }
};

const initCron = () => {
    cron.schedule('0 0 * * *', async () => {
        await populateVault();
    });
    
    cron.schedule('15 0 * * *', async () => {
        await runDailyTask();
    });

    console.log(`Cron jobs initialized: Vault at 00:00, Daily Task at 00:15.`);
};

module.exports = { initCron, runDailyTask, generateSlipsForDate };
