require('dotenv').config({ path: './backend/.env' });
const axios = require('axios');

async function getMarkets() {
    try {
        const apiKey = process.env.API_FOOTBALL_KEY;
        const targetDate = new Date().toISOString().split('T')[0];
        
        const oddsRes = await axios.get(`https://v3.football.api-sports.io/odds`, {
            headers: { 'x-apisports-key': apiKey },
            params: { date: targetDate, page: 1 }
        });

        if (oddsRes.data?.response && oddsRes.data.response.length > 0) {
            const firstMatch = oddsRes.data.response[0];
            const bookmaker = firstMatch.bookmakers[0];
            
            console.log("Markets available for this match:");
            bookmaker.bets.forEach(bet => {
                console.log(`ID: ${bet.id} - Name: ${bet.name} - Example values:`, bet.values.slice(0, 2));
            });
        } else {
            console.log("No odds found for today.");
        }
    } catch(e) {
        console.error(e.message);
    }
}
getMarkets();
