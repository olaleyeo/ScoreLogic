const { initDB } = require('./database');
const { runDailyTask } = require('./cron');
const ResultService = require('./services/ResultService');

initDB().then(async () => {
    console.log('Background Worker Started');
    try {
        await ResultService.evaluatePendingMatches();
        await runDailyTask();
        console.log('Background Worker Finished Successfully.');
    } catch (e) {
        console.error('Background Worker Failed:', e.message);
    }
    process.exit(0);
});
