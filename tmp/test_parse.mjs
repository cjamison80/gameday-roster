// Test harness — verifies new parsing logic against real downloaded HTML
// before it gets applied to the live scraper. Not part of the app itself.
import { readFileSync } from 'fs';

function stripTags(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

// ---- USSSA (arbaseball.usssa.com style) ----
function parseUsssaStateSite(html, source) {
  const records = [];
  const blockRe = /<div class="events-list-elem">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let m;
  while ((m = blockRe.exec(html))) {
    const block = m[1];
    const titleMatch = block.match(/<a href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>\s*<\/div>\s*<ul class="events-list-elem-info">/);
    if (!titleMatch) continue;
    const url = titleMatch[1];
    const name = titleMatch[2].trim();

    const infoMatch = block.match(/<ul class="events-list-elem-info">([\s\S]*?)<\/ul>/);
    const infoLis = infoMatch ? [...infoMatch[1].matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map(x => stripTags(x[1])) : [];
    const dateText = infoLis[0] || '';
    const feeText = infoLis.find(t => /\$/.test(t)) || '';

    const listMatch = block.match(/<ul class="events-list-elem-list">([\s\S]*?)<\/ul>/);
    const listLis = listMatch ? [...listMatch[1].matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map(x => stripTags(x[1])) : [];
    const ageDivisionText = listLis[0] || '';
    const cityStateText = listLis[1] || '';
    const director = listLis[2] || '';

    const teamCountMatch = block.match(/team-count">(\d+)</);

    const stateMatch = cityStateText.match(/,\s*([A-Z]{2})\s*$/);
    const city = cityStateText.replace(/,\s*[A-Z]{2}\s*$/, '').trim();

    records.push({
      name,
      source_url: url,
      registration_url: url,
      date_text: dateText,
      age_divisions_text: ageDivisionText,
      city,
      state: stateMatch ? stateMatch[1] : '',
      director,
      cost_text: feeText,
      team_count: teamCountMatch ? Number(teamCountMatch[1]) : null,
      association: source.association,
      sport: 'baseball'
    });
  }
  return records;
}

const usssaHtml = readFileSync('/tmp/usssa_ar.html', 'utf8');
const usssaRecords = parseUsssaStateSite(usssaHtml, { association: 'USSSA' });
console.log(`USSSA: parsed ${usssaRecords.length} records`);
console.log(JSON.stringify(usssaRecords.slice(0, 5), null, 2));

// ---- Perfect Game (national schedule, group-header rows) ----
function parsePerfectGameSchedule(html, source, stateFilter) {
  const records = [];
  const blockRe = /<td class="rgGroupCol"[\s\S]*?<\/table><\/td>/g;
  let m;
  while ((m = blockRe.exec(html))) {
    const block = m[0];
    const gidMatch = block.match(/GroupedEvents\.aspx\?gid=(\d+)/);
    if (!gidMatch) continue;
    const gid = gidMatch[1];

    const nameMatch = block.match(/GroupedEvents\.aspx\?gid=\d+'[^>]*>\s*<span[^>]*>([^<]+)<\/span>/);
    const name = nameMatch ? nameMatch[1].trim() : '';
    if (!name) continue;

    const dateMatch = block.match(/<td style='border:none; width:75px'[^>]*>([^<]+)<\/td>/);
    const dateText = dateMatch ? dateMatch[1].trim() : '';

    const ageDivMatch = block.match(/<span style="font-size:11px; display:block">([^<]+)<\/span>/) ||
                          block.match(/<span style='font-size:11px; display:block'>([^<]+)<\/span>/);
    const ageDivisionText = ageDivMatch ? ageDivMatch[1].trim() : '';

    const teamCountMatch = block.match(/TournamentTeamsGroup\.aspx\?gid=\d+'>(\d+)</);

    const tailText = stripTags(block.split('col-md-2').slice(1).join('col-md-2'));
    const cityStateMatch = tailText.match(/([A-Za-z .'\/-]+),\s*([A-Z]{2})\b/);

    records.push({
      name,
      gid,
      source_url: `https://www.perfectgame.org/Schedule/GroupedEvents.aspx?gid=${gid}`,
      registration_url: `https://www.perfectgame.org/Schedule/GroupedEvents.aspx?gid=${gid}`,
      date_text: dateText,
      age_divisions_text: ageDivisionText,
      city: cityStateMatch ? cityStateMatch[1].trim() : '',
      state: cityStateMatch ? cityStateMatch[2] : '',
      team_count: teamCountMatch ? Number(teamCountMatch[1]) : null,
      association: source.association,
      sport: 'baseball'
    });
  }
  const deduped = [...new Map(records.map(r => [r.gid, r])).values()];
  return stateFilter ? deduped.filter(r => r.state === stateFilter) : deduped;
}

const pgHtml = readFileSync('/tmp/pg_ar.html', 'utf8');
const pgAllRecords = parsePerfectGameSchedule(pgHtml, { association: 'Perfect Game' }, null);
const pgArRecords = parsePerfectGameSchedule(pgHtml, { association: 'Perfect Game' }, 'AR');
console.log(`\nPerfect Game: parsed ${pgAllRecords.length} total groups, ${pgArRecords.length} in AR`);
console.log(JSON.stringify(pgArRecords.slice(0, 8), null, 2));
console.log('\nSample of first 5 non-AR (sanity check state parsing):');
console.log(JSON.stringify(pgAllRecords.slice(0, 5).map(r => ({ name: r.name, city: r.city, state: r.state })), null, 2));
