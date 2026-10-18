const { runDailyTask } = require('./cron');

async function test() {
    await runDailyTask();
}
test();
