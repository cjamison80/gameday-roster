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
