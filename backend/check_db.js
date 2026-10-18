const { Slip, SlipMatch } = require('./database');

async function checkDb() {
    try {
        const slips = await Slip.findAll();
        console.log(`Found ${slips.length} slips.`);
        const uniqueDates = new Set(slips.map(s => s.date));
        console.log('Dates in DB:', Array.from(uniqueDates));
    } catch (e) {
        console.error(e);
    }
}
checkDb();
