const OddsService = require('./backend/services/OddsService');

async function test() {
    try {
        console.log('Fetching live data via OddsService (cache should be empty or fetch anew)...');
        const matches = await OddsService.fetchMatches({ date: new Date().toISOString().split('T')[0] });
        console.log(`Fetched ${matches.length} matches.`);
        if (matches.length > 0) {
            let hasFirstHalf = 0;
            let hasSecondHalf = 0;
            for(let m of matches) {
                if (m.firstHalfScoreOdds && Object.keys(m.firstHalfScoreOdds).length > 0) hasFirstHalf++;
                if (m.secondHalfScoreOdds && Object.keys(m.secondHalfScoreOdds).length > 0) hasSecondHalf++;
            }
            console.log(`Matches with First Half Exact Score: ${hasFirstHalf}`);
            console.log(`Matches with Second Half Exact Score: ${hasSecondHalf}`);
            
            // Print one match's available markets
            if (matches[0].rawMarkets) {
                console.log('Markets available for first match:', matches[0].rawMarkets.map(m => m.id + ' - ' + m.name).join(', '));
            }
        }
    } catch (e) {
        console.error(e);
    }
}
test();
