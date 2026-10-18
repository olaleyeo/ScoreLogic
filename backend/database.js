const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL || 'sqlite:./database.sqlite', {
    logging: false,
    dialect: process.env.DATABASE_URL ? 'postgres' : 'sqlite',
    dialectOptions: process.env.DATABASE_URL ? {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    } : {}
});

const Prediction = sequelize.define('Prediction', {
    matchId: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false }, // YYYY-MM-DD
    league: { type: DataTypes.STRING },
    homeTeam: { type: DataTypes.STRING },
    awayTeam: { type: DataTypes.STRING },
    zeroZeroOdds: { type: DataTypes.FLOAT },
    selectedMarket: { type: DataTypes.STRING },
    confidence: { type: DataTypes.STRING }
});

const Slip = sequelize.define('Slip', {
    date: { type: DataTypes.STRING, allowNull: false }, // YYYY-MM-DD
    type: { type: DataTypes.STRING, allowNull: false }, // '2-odds', '5-odds', '10-odds'
    totalOdds: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'pending' } // pending, won, lost
});

const SlipMatch = sequelize.define('SlipMatch', {
    matchId: { type: DataTypes.STRING },
    league: { type: DataTypes.STRING },
    homeTeam: { type: DataTypes.STRING },
    awayTeam: { type: DataTypes.STRING },
    zeroZeroOdds: { type: DataTypes.FLOAT },
    selectedMarket: { type: DataTypes.STRING },
    marketOdds: { type: DataTypes.FLOAT },
    confidence: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'pending' }, // pending, won, lost
    score: { type: DataTypes.STRING, defaultValue: null } // e.g. "2-1"
});

const VaultMatch = sequelize.define('VaultMatch', {
    date: { type: DataTypes.STRING, allowNull: false }, // YYYY-MM-DD
    matchId: { type: DataTypes.STRING, allowNull: false },
    rawData: { type: DataTypes.TEXT, allowNull: false } // stringified JSON
});

// Relationships
Slip.hasMany(SlipMatch, { foreignKey: 'slipId', as: 'matches' });
SlipMatch.belongsTo(Slip, { foreignKey: 'slipId' });

const initDB = async () => {
    try {
        await sequelize.sync();
        console.log('Database synced successfully.');
    } catch (err) {
        console.error('Database sync failed:', err);
    }
};

module.exports = { sequelize, Prediction, Slip, SlipMatch, VaultMatch, initDB };
