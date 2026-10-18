const axios = require('axios');
const fs = require('fs');

const MY_TEAMS = [
  "Arsenal", "Aston Villa", "Real Madrid", "Real Sociedad", "Barcelona", "Athletic Bilbao", "Bayern Munich", 
  "Stuttgart", "Ac Milan", "Venezia", "Crystal Palace", "Man City", "Rio Ave", "Sporting", "SV 07 Elversberg", 
  "Bayer Leverkusen", "Bournemouth", "Everton", "Celtic", "Falkirk Fc", "Lens", "Strasbourg", "Tottenham", 
  "Newcastle", "Borussia Dortmund", "Hamburger SV", "Galatasaray Istanbul", "Goztepe Izmir", "Lyon", "Le Havre", 
  "Sevilla", "Atletico Madrid", "FC Utrecht", "PSV Eindhoven", "Feyenoord", "ADO Den Haag", "Chelsea", "Brighton", 
  "SC Telstar", "Ajax", "Malaga CF", "SC Cambuur", "FC Twente Enschede", "Samsunspor", "Fenerbahce Istanbul", 
  "Cagliari", "Inter", "Rayo vallecano", "SK Rapid", "Strum Graz", "Salzburg", "FK Austria Wien", "Gent", 
  "Club Brugge", "Union Gilloise", "RSC Anderlecht", "KVC Westerlo", "SV Zulte Waregem", "FK Spartak 1918", 
  "Ludogorets", "NK Istra 1961", "GNK Dinamo Zagreb", "Sparta Pargue", "Slavia Prague", "Viborg FF", "AC Horsens", 
  "Silkeborg IF", "FC Midtjylland", "Nordsjaelland", "Broendby IF", "Alkmaar", "Go Ahead Eagles", "Bodo/Gimit", 
  "Rosenborg", "Tromsoe IL", "Sarpsborg 08", "Academico de Viseu", "Porto", "Aberdeen", "Rangers", "Valencia", 
  "Betis", "LASK Linz"
];

async function fetchLogos() {
  let logoMap = {};
  if (fs.existsSync('../frontend/src/assets/teamLogos.json')) {
      logoMap = JSON.parse(fs.readFileSync('../frontend/src/assets/teamLogos.json'));
  }
  
  for (const team of MY_TEAMS) {
    if (logoMap[team]) continue; // Skip already fetched

    try {
      let searchName = team;
      if (team === 'Man City') searchName = 'Manchester City';
      if (team === 'Ac Milan') searchName = 'AC Milan';
      if (team === 'Falkirk Fc') searchName = 'Falkirk';
      if (team === 'Galatasaray Istanbul') searchName = 'Galatasaray';
      if (team === 'Fenerbahce Istanbul') searchName = 'Fenerbahce';
      if (team === 'GNK Dinamo Zagreb') searchName = 'Dinamo Zagreb';
      if (team === 'Slavia Prague') searchName = 'Slavia Praha';
      if (team === 'Sparta Pargue') searchName = 'Sparta Praha';
      if (team === 'Strum Graz') searchName = 'Sturm Graz';
      if (team === 'Bodo/Gimit') searchName = 'Bodo/Glimt';
      
      const res = await axios.get(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(searchName)}`);
      
      if (res.data && res.data.teams && res.data.teams.length > 0) {
        const foundTeam = res.data.teams[0];
        logoMap[team] = foundTeam.strBadge;
        console.log(`[OK] ${team} -> ${foundTeam.strBadge}`);
      } else {
        console.log(`[MISSING] ${team}`);
        logoMap[team] = null;
      }
      
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`[ERROR] ${team}: ${e.message}`);
      // Wait longer on error (rate limit)
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  fs.writeFileSync('../frontend/src/assets/teamLogos.json', JSON.stringify(logoMap, null, 2));
  console.log('Finished writing logos to frontend/src/assets/teamLogos.json');
}

fetchLogos();
