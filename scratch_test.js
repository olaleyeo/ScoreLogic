const axios = require('axios');
(async () => {
    try {
        const date = new Date().toISOString().split('T')[0];
        const res = await axios.get(`https://api.sofascore.com/api/v1/sport/football/scheduled-events/${date}`);
        console.log('Total scheduled events:', res.data.events?.length);
    } catch(e) {
        console.error(e.message);
    }
})();
