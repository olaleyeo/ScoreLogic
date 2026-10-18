const OddsService = require('./services/OddsService');
const DrawInHalfStrategy = require('./services/DrawInHalfStrategy');

async function test() {
    const matches = await OddsService.fetchMatches({});
    const result = DrawInHalfStrategy.execute(matches);
    console.log(JSON.stringify(result, null, 2));
}

test();
