class SlipService {
    static isTopLeague(leagueName) {
        if (!leagueName) return false;
        const topLeagues = ['premier league', 'la liga', 'serie a', 'bundesliga', 'ligue 1', 'champions league', 'europa league', 'eredivisie', 'championship'];
        const lowerName = leagueName.toLowerCase();
        return topLeagues.some(l => lowerName.includes(l));
    }

    static generateSlips(predictions) {
        // We will maintain a global set of used match IDs so NO duplicates exist across any slips
        const usedMatchIds = new Set();
        const slips = {};

        // Group predictions by strategy
        const strategyGroups = {
            StraightWin: predictions.filter(p => p.strategy === 'StraightWin'),
            StraightWin130: predictions.filter(p => p.strategy === 'StraightWin130'),
            StraightWin172: predictions.filter(p => p.strategy === 'StraightWin172'),
            OverUnder: predictions.filter(p => p.strategy === 'OverUnder'),
            DrawInHalf: predictions.filter(p => p.strategy === 'DrawInHalf')
        };

        // For each strategy, we can generate slips.
        // Let's generate a 2-odds, 3-odds, 5-odds slip for each strategy if possible, to keep slips homogeneous.
        
        for (const [strategy, matches] of Object.entries(strategyGroups)) {
            let availableMatches = [...matches];
            
            // Prioritize top leagues
            availableMatches.sort((a, b) => {
                const aIsTop = this.isTopLeague(a.league);
                const bIsTop = this.isTopLeague(b.league);
                if (aIsTop && !bIsTop) return -1;
                if (!aIsTop && bIsTop) return 1;
                return 0;
            });

            // Make sure availableMatches doesn't contain already used ones (from a previous strategy somehow? Not possible since strategies pick different markets for the same match, wait, a match could be picked by multiple strategies. We only want a match to appear ONCE across ALL slips.)
            availableMatches = availableMatches.filter(m => !usedMatchIds.has(m.matchId));

            const stratSlips = {
                twoOdds: [],
                threeOdds: [],
                fiveOdds: null,
                tenOdds: null
            };

            // Max 2 two-odds slips
            for (let i = 0; i < 2; i++) {
                const slip = this.buildSlip(availableMatches, 2.0, 3, usedMatchIds);
                if (slip.matches.length > 0 && slip.totalOdds >= 1.8) { // Allow slightly lower if we hit maxGames
                    stratSlips.twoOdds.push(slip);
                    availableMatches = availableMatches.filter(m => !usedMatchIds.has(m.matchId));
                }
            }

            // Max 2 three-odds slips
            for (let i = 0; i < 2; i++) {
                const slip = this.buildSlip(availableMatches, 3.0, Infinity, usedMatchIds);
                if (slip.matches.length > 0 && slip.totalOdds >= 2.5) {
                    stratSlips.threeOdds.push(slip);
                    availableMatches = availableMatches.filter(m => !usedMatchIds.has(m.matchId));
                }
            }

            const possibleFive = this.buildSlip(availableMatches, 5.0, 5, usedMatchIds);
            if (possibleFive.matches.length > 0 && possibleFive.totalOdds >= 4.5) {
                stratSlips.fiveOdds = possibleFive;
                availableMatches = availableMatches.filter(m => !usedMatchIds.has(m.matchId));
            }

            const possibleTen = this.buildSlip(availableMatches, 10.0, 7, usedMatchIds);
            if (possibleTen.matches.length > 0 && possibleTen.totalOdds >= 9.0) {
                stratSlips.tenOdds = possibleTen;
            }

            slips[strategy] = stratSlips;
        }

        return slips;
    }

    static buildSlip(availableMatches, targetOdds, maxGames = Infinity, usedMatchIds) {
        let currentOdds = 1.0;
        const selectedMatches = [];

        for (const match of availableMatches) {
            if (usedMatchIds.has(match.matchId)) continue;
            
            if (currentOdds >= targetOdds) break; // Reached target
            if (selectedMatches.length >= maxGames) break; // Reached max games

            selectedMatches.push(match);
            usedMatchIds.add(match.matchId);
            currentOdds *= match.marketOdds;
        }

        return {
            targetOdds: targetOdds,
            totalOdds: parseFloat(currentOdds.toFixed(2)),
            matches: selectedMatches
        };
    }
}

module.exports = SlipService;
