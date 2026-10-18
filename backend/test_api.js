const axios = require('axios');
(async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log('Fetching:', `https://api.sofascore.com/api/v1/sport/football/scheduled-events/${today}`);
        const res = await axios.get(`https://api.sofascore.com/api/v1/sport/football/scheduled-events/${today}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        console.log('Keys:', Object.keys(res.data));
        console.log('Events length:', res.data.events?.length);
    } catch(e) {
        console.error('Error:', e.message, e.response?.status, e.response?.data);
    }
})();
