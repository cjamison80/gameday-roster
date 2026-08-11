import { readFileSync } from 'fs';

function stripTags(s = '') {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

const PG_MAX_GROUP_DAYS = 14;

function parsePgSubRows(html) {
  const rowBlocks = html.split(/(?=<tr class="rg(?:Row|AltRow)")/).slice(1);
  const byGid = new Map();
  for (const block of rowBlocks) {
    const gidMatch = block.match(/hfEventScheduleGroupID"[^>]*value="(\d+)"/);
    const startMatch = block.match(/hfStartDate"[^>]*value="([^"]+)"/);
    const endMatch = block.match(/hfEndDate"[^>]*value="([^"]+)"/);
    const ageMatch = block.match(/hfAgeDivision"[^>]*value="([^"]+)"/);
    const canceledMatch = block.match(/hfEventCanceled"[^>]*value="([^"]+)"/);
    const locMatch = block.match(/lblLocation"[^>]*>([^<]*)<br\s*\/?>([^<]*)<\/span>/);
    if (!gidMatch || !startMatch) continue;

    const gid = gidMatch[1];
    if (!byGid.has(gid)) byGid.set(gid, { starts: [], ends: [], ages: new Set(), canceled: [], venue: '' });
    const entry = byGid.get(gid);
    entry.starts.push(new Date(startMatch[1]));
    if (endMatch) entry.ends.push(new Date(endMatch[1]));
    if (ageMatch) entry.ages.add(ageMatch[1].trim());
    entry.canceled.push(canceledMatch ? canceledMatch[1] === 'True' : false);
    if (!entry.venue && locMatch) entry.venue = locMatch[1].trim();
  }
  return byGid;
}

function parsePgGroupHeaders(html) {
  const blocks = html.match(/<td class="rgGroupCol"[\s\S]*?<\/table><\/td>/g) || [];
  const groups = [];
  for (const block of blocks) {
    const gidMatch = block.match(/GroupedEvents\.aspx\?gid=(\d+)/);
    if (!gidMatch) continue;
    const gid = gidMatch[1];
    const nameMatch = block.match(/GroupedEvents\.aspx\?gid=\d+'[^>]*>\s*<span[^>]*>([^<]+)<\/span>/);
    const name = nameMatch ? nameMatch[1].trim() : '';
    if (!name) continue;
    const teamCountMatch = block.match(/TournamentTeamsGroup\.aspx\?gid=\d+'>(\d+)</);
    const tailText = stripTags(block.split('col-md-2').slice(1).join('col-md-2'));
    const cityStateMatch = tailText.match(/([A-Za-z .'\/-]+),\s*([A-Za-z]{2})\b/);
    groups.push({
      gid, name,
      city: cityStateMatch ? cityStateMatch[1].trim() : '',
      state: cityStateMatch ? cityStateMatch[2].toUpperCase() : '',
      team_count: teamCountMatch ? Number(teamCountMatch[1]) : 0
    });
  }
  return groups;
}

function toIso(d) { return d.toISOString().slice(0, 10); }

const html = readFileSync('/tmp/pg_ar.html', 'utf8');
const subRowsByGid = parsePgSubRows(html);
const groups = parsePgGroupHeaders(html);
console.log('Sub-row groups found:', subRowsByGid.size);
console.log('Header groups found:', groups.length);

const records = [];
let skippedNoSubrows = 0, skippedLeague = 0;
for (const g of groups) {
  const sub = subRowsByGid.get(g.gid);
  if (!sub || sub.starts.length === 0) { skippedNoSubrows++; continue; }
  const minStart = new Date(Math.min(...sub.starts.map(d => d.getTime())));
  const maxEnd = sub.ends.length ? new Date(Math.max(...sub.ends.map(d => d.getTime()))) : minStart;
  const durationDays = Math.round((maxEnd - minStart) / 86400000);
  if (durationDays > PG_MAX_GROUP_DAYS) { skippedLeague++; continue; }

  records.push({
    name: g.name,
    city: g.city,
    state: g.state,
    venue: sub.venue,
    start_date: toIso(minStart),
    end_date: toIso(maxEnd),
    duration_days: durationDays,
    age_divisions: [...sub.ages],
    team_count: g.team_count,
    teams_url: `https://www.perfectgame.org/events/TournamentTeamsGroup.aspx?gid=${g.gid}`
  });
}

console.log('Skipped (no subrows):', skippedNoSubrows, '| Skipped (league, >14 days):', skippedLeague);
console.log('Final real tournament records:', records.length);
console.log(JSON.stringify(records.slice(0, 10), null, 2));

const arRecords = records.filter(r => r.state === 'AR');
const txRecords = records.filter(r => r.state === 'TX');
console.log('\nAR matches:', arRecords.length, '| TX matches:', txRecords.length);
