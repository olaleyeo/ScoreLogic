const axios = require('axios');
const { Slip, SlipMatch } = require('../database');
const { Op } = require('sequelize');

class ResultService {
    static async evaluatePendingMatches(targetDate = null) {
        console.log(`ResultService: Evaluating matches...${targetDate ? ` for date ${targetDate}` : ''}`);
        try {
            const includeClause = [{ model: Slip }];
            if (targetDate) {
                includeClause[0].where = { date: targetDate };
            }

            const pendingMatches = await SlipMatch.findAll({
                where: { status: { [Op.in]: ['pending', 'live'] } },
                include: includeClause
            });

            if (pendingMatches.length === 0) {
                console.log('ResultService: No pending/live matches found.');
                return;
            }

            // Group by Slip date
            const dateMap = {};
            pendingMatches.forEach(match => {
                const date = match.Slip.date;
                if (!dateMap[date]) dateMap[date] = [];
                dateMap[date].push(match);
            });

            const apiKey = process.env.API_FOOTBALL_KEY;

            for (const date of Object.keys(dateMap)) {
                console.log(`ResultService: Fetching fixtures for date ${date}...`);
                const fixturesRes = await axios.get(`https://v3.football.api-sports.io/fixtures`, {
                    headers: { 'x-apisports-key': apiKey },
                    params: { date }
                });

                const matchesOnDate = dateMap[date];

                // Check if API key hit limits or returned an error
                if (fixturesRes.data?.errors && Object.keys(fixturesRes.data.errors).length > 0) {
                    console.error(`ResultService: API error/limit reached for date ${date}.`);
                    continue;
                }

                const fixturesData = fixturesRes.data?.response || [];
                const fixturesById = {};
                fixturesData.forEach(item => {
                    if (item.fixture && item.fixture.id) {
                        fixturesById[item.fixture.id.toString()] = item;
                    }
                });

                for (const match of matchesOnDate) {
                    const fixtureItem = fixturesById[match.matchId];
                    if (!fixtureItem) {
                        continue;
                    }

                    const statusShort = fixtureItem.fixture.status.short;
                    const goalsHome = fixtureItem.goals.home;
                    const goalsAway = fixtureItem.goals.away;

                    if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(statusShort)) {
                        match.status = 'live';
                        if (goalsHome !== null && goalsAway !== null) {
                            match.score = `${goalsHome}-${goalsAway}`;
                        }
                        await match.save();
                        continue;
                    }

                    // Check if match is finished
                    if (['FT', 'AET', 'PEN'].includes(statusShort)) {
                        if (goalsHome === null || goalsAway === null) continue;

                        const totalGoals = goalsHome + goalsAway;
                        match.score = `${goalsHome}-${goalsAway}`;

                        let won = false;
                        if (match.selectedMarket === 'Under 2.5' && totalGoals < 2.5) won = true;
                        else if (match.selectedMarket === 'Under 3.5' && totalGoals < 3.5) won = true;
                        else if (match.selectedMarket === 'Over 1.5' && totalGoals > 1.5) won = true;
                        else if (match.selectedMarket === 'Over 2.5' && totalGoals > 2.5) won = true;
                        else if (match.selectedMarket === 'Home Win' && goalsHome > goalsAway) won = true;
                        else if (match.selectedMarket === 'Away Win' && goalsAway > goalsHome) won = true;
                        else if (match.selectedMarket === 'Draw In Half' && fixtureItem.score && fixtureItem.score.halftime) {
                            if (fixtureItem.score.halftime.home === fixtureItem.score.halftime.away) {
                                won = true;
                            }
                        }

                        match.status = won ? 'won' : 'lost';
                        await match.save();
                    }
                }
            }

            // Now evaluate parent Slips
            await this.evaluateParentSlips(targetDate);

        } catch (error) {
            console.error('ResultService Error:', error.message);
        }
    }

    static async evaluateParentSlips(targetDate = null) {
        try {
            const whereClause = { status: { [Op.in]: ['pending', 'live'] } };
            if (targetDate) {
                whereClause.date = targetDate;
            }

            const pendingSlips = await Slip.findAll({
                where: whereClause,
                include: [{ model: SlipMatch, as: 'matches' }]
            });

            for (const slip of pendingSlips) {
                if (!slip.matches || slip.matches.length === 0) continue;

                let allWon = true;
                let anyLost = false;
                let anyPending = false;
                let anyLive = false;

                for (const match of slip.matches) {
                    if (match.status === 'lost') anyLost = true;
                    if (match.status === 'pending') anyPending = true;
                    if (match.status === 'live') anyLive = true;
                    if (match.status !== 'won') allWon = false;
                }

                if (anyLost) {
                    slip.status = 'lost';
                    await slip.save();
                } else if (allWon && !anyPending && !anyLive) {
                    slip.status = 'won';
                    await slip.save();
                } else if (anyLive && slip.status !== 'live') {
                    slip.status = 'live';
                    await slip.save();
                }
            }
        } catch (error) {
            console.error('Error evaluating parent slips:', error.message);
        }
    }
}

module.exports = ResultService;
