import { readFileSync } from 'fs';

function parsePerfectGameTeamsPage(html) {
  const teams = [];
  const blockRe = /<a[^>]*id="[^"]*hlEvent_\d+"[^>]*>([^<]+)<\/a>[\s\S]*?(?=<a[^>]*id="[^"]*hlEvent_\d+"|$)/g;
  let m;
  while ((m = blockRe.exec(html))) {
    const ageDivision = m[1].trim();
    const block = m[0];
    const teamRe = /id="[^"]*hlTeams_\d+"[^>]*>([^<]+)<\/a>[\s\S]*?<span[^>]*id="[^"]*lblCity_\d+"[^>]*><font[^>]*>([^<]*)<\/font><\/span>/g;
    let tm;
    while ((tm = teamRe.exec(block))) {
      const teamName = tm[1].trim();
      const cityState = tm[2].trim();
      const [city, state] = cityState.split(',').map(s => s.trim());
      if (teamName) teams.push({ team_name: teamName, age_division: ageDivision, city: city || '', state: state || '' });
    }
  }
  return teams;
}

const html = readFileSync('/tmp/pg_teams.html', 'utf8');
const teams = parsePerfectGameTeamsPage(html);
console.log('Teams found:', teams.length);
console.log(JSON.stringify(teams.slice(0, 8), null, 2));
