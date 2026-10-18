const { initDB, Slip, SlipMatch } = require('./database');

async function check() {
    await initDB();
    const slips = await Slip.findAll({
        order: [['date', 'DESC']]
    });
    console.log(`Found ${slips.length} slips.`);
    for (const slip of slips) {
        console.log(`Slip ID: ${slip.id}, Date: ${slip.date}, Type: ${slip.type}`);
    }
}
check();
