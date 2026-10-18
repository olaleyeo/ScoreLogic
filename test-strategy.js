const OddsService = require('./backend/services/OddsService');
const DrawInHalfStrategy = require('./backend/services/DrawInHalfStrategy');

async function test() {
    try {
        console.log('Fetching mock data...');
        const matches = OddsService.getMockData();
        console.log(`Found ${matches.length} matches in mock data.`);
        
        const validMatches = DrawInHalfStrategy.execute(matches);
        console.log(`\nValid matches after strategy: ${validMatches.length}`);
    } catch (e) {
        console.error(e);
    }
}
test();
