const axios = require('axios');

async function testFetch() {
    try {
        console.log('Fetching slips from local server...');
        const listRes = await axios.get('http://localhost:3000/api/history/list');
        console.log('History List:', listRes.data);
        
        if (listRes.data.dates.length > 0) {
            const date = listRes.data.dates[0];
            const res = await axios.get(`http://localhost:3000/api/history?date=${date}`);
            console.log(`History for ${date}:`, JSON.stringify(res.data, null, 2));
        }
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

testFetch();
