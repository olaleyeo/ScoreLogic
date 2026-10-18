const axios = require('axios');

class PlayerStatsService {
    constructor() {
        this.cache = new Map();
        this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours
    }

    async getStats(leagueId) {
        const apiKey = process.env.API_FOOTBALL_KEY;
        const year = new Date().getFullYear();
        const cacheKey = `${leagueId}-${year}`;

        if (this.cache.has(cacheKey)) {
            const cachedData = this.cache.get(cacheKey);
            if (Date.now() - cachedData.timestamp < this.cacheTTL) {
                return cachedData.data;
            }
        }

        try {
            // First try current year, if it fails or returns empty, try previous year
            let data = await this.fetchStatsFromApi(leagueId, year, apiKey);
            
            if (!data.topScorers.length && !data.topAssists.length) {
                console.log(`PlayerStatsService: No data for ${year}, trying ${year - 1}...`);
                data = await this.fetchStatsFromApi(leagueId, year - 1, apiKey);
            }

            this.cache.set(cacheKey, {
                timestamp: Date.now(),
                data: data
            });

            return data;
        } catch (error) {
            console.error(`Error fetching player stats for league ${leagueId}:`, error.message);
            throw error;
        }
    }

    async fetchStatsFromApi(leagueId, season, apiKey) {
        const headers = { 'x-apisports-key': apiKey };
        const params = { league: leagueId, season: season };

        // We fetch top 20 scorers and top 20 assists
        const [scorersRes, assistsRes] = await Promise.all([
            axios.get('https://v3.football.api-sports.io/players/topscorers', { headers, params }),
            axios.get('https://v3.football.api-sports.io/players/topassists', { headers, params })
        ]);

        return {
            topScorers: scorersRes.data.response || [],
            topAssists: assistsRes.data.response || []
        };
    }
}

module.exports = new PlayerStatsService();
