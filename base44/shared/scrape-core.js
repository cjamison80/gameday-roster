// Tournament scraping core — shared by the tournament-sync backend function.
// Ported from scripts/tournament-sync/scrape-core.mjs. Kept in base44/shared/
// so any backend function can import it without duplicating parsing logic.

export const SCRAPE_ADAPTERS = {
  usssa: {
    association: 'USSSA',
    eventUrlPatterns: [/event/i, /tournament/i],
    statusHints: ['Open', 'Closed', 'Waitlist', 'Sold Out']
  },
  '2d_sports': {
    association: '2D Sports',
    eventUrlPatterns: [/events?\//i, /tournament/i],
    statusHints: ['Open', 'Sold Out', 'Registration Closed', 'Waitlist']
  },
  perfect_game: {
    association: 'Perfect Game',
    eventUrlPatterns: [/events?/i, /tournaments?/i],
    statusHints: ['Open', 'Registration', 'Sold Out', 'Waitlist']
  }
};

const STATE_RE = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY)\b/;
const MONEY_RE = /\$\s?([0-9]{2,4}(?:\.[0-9]{2})?)/;
const AGE_RE = /\b(6U|7U|8U|9U|10U|11U|12U|13U|14U|15U|16U|17U|18U)\b/g;
const CLASS_RE = /\b(Major|Open|AAA|AA|A)\b/gi;

function stripTags(html = '') {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/"/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(href = '', base = '') {
  if (!href) return '';
  try { return new URL(href, base).toString(); } catch { return href; }
}

function extractJsonLd(html = '') {
  const records = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = re.exec(html))) {
    try {
      const json = JSON.parse(match[1].trim());
      const items = Array.isArray(json) ? json : [json];
      records.push(...items.flatMap(item => item['@graph'] || item));
    } catch { /* ignore malformed structured data */ }
  }
  return records;
}

function inferDates(text = '') {
  const iso = text.match(/\b20[2-9][0-9]-[01][0-9]-[0-3][0-9]\b/g);
  if (iso?.length) return { start_date: iso[0], end_date: iso[1] || iso[0] };

  const monthDate = text.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:\s?-\s?\d{1,2})?,?\s+20[2-9][0-9]\b/i);
  if (!monthDate) return { start_date: '', end_date: '' };

  const raw = monthDate[0].replace(/Sept\.?/i, 'Sep');
  const date = new Date(raw.replace(/\s?-\s?\d{1,2}/, ''));
  if (Number.isNaN(date.getTime())) return { start_date: '', end_date: '' };
  return { start_date: date.toISOString().slice(0, 10), end_date: date.toISOString().slice(0, 10) };
}

function parseStructuredRecord(item, source) {
  const name = item.name || item.headline || item.title;
  if (!name) return null;
  const location = item.location || {};
  const address = location.address || {};
  return {
    name,
    association: source.association,
    sport: 'baseball',
    start_date: (item.startDate || item.start_date || '').slice(0, 10),
    end_date: (item.endDate || item.end_date || item.startDate || '').slice(0, 10),
    city: address.addressLocality || location.addressLocality || '',
    state: address.addressRegion || location.addressRegion || '',
    venue: location.name || '',
    cost: item.offers?.price ? Number(item.offers.price) : 0,
    currency: item.offers?.priceCurrency || 'USD',
    registration_url: item.url || source.events_url,
    source_url: item.url || source.events_url,
    status: 'unknown',
    age_divisions: [],
    classifications: [],
    teams_entered: [],
    teams_entered_count: 0
  };
}

function parseEventLinks(html = '', source, adapter) {
  const records = [];
  const linkRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRe.exec(html))) {
    const href = absoluteUrl(match[1], source.base_url || source.events_url);
    const label = stripTags(match[2]);
    if (!label || label.length < 5 || label.length > 160) continue;
    if (!adapter.eventUrlPatterns.some(pattern => pattern.test(href)) && !/tournament|classic|championship|showcase|world series|state|regional/i.test(label)) continue;

    const contextStart = Math.max(0, match.index - 500);
    const contextEnd = Math.min(html.length, match.index + 1200);
    const context = stripTags(html.slice(contextStart, contextEnd));
    const dates = inferDates(context);
    const ages = Array.from(new Set(context.match(AGE_RE) || []));
    const classes = Array.from(new Set((context.match(CLASS_RE) || []).map(v => v.toUpperCase() === 'OPEN' ? 'Open' : v.toUpperCase())));
    const money = context.match(MONEY_RE);
    const state = context.match(STATE_RE)?.[1] || '';

    records.push({
      name: label,
      association: source.association,
      sport: 'baseball',
      age_divisions: ages,
      classifications: classes,
      start_date: dates.start_date,
      end_date: dates.end_date,
      city: '',
      state,
      venue: '',
      cost: money ? Number(money[1]) : 0,
      currency: 'USD',
      spots_available: null,
      teams_entered_count: 0,
      teams_entered: [],
      registration_url: href,
      source_url: href,
      source_system: source.name,
      status: /sold out/i.test(context) ? 'sold_out' : /waitlist/i.test(context) ? 'waitlist' : /closed/i.test(context) ? 'closed' : 'open',
      description: context.slice(0, 300)
    });
  }
  return records;
}

export function parseTournamentHtml(html = '', source = {}, adapter = {}) {
  const structured = extractJsonLd(html)
    .map(item => parseStructuredRecord(item, source))
    .filter(Boolean);

  const linkRecords = parseEventLinks(html, source, adapter);
  const merged = [...structured, ...linkRecords];
  const seen = new Set();

  return merged.filter(record => {
    const key = buildTournamentKey(record);
    if (seen.has(key)) return false;
    seen.add(key);
    return record.name && record.source_url;
  });
}

export function normalizeTournamentRecord(raw = {}, source = {}) {
  return {
    name: raw.name || raw.title || 'Untitled Tournament',
    association: raw.association || source.association || 'Other',
    sport: raw.sport || 'baseball',
    age_divisions: raw.age_divisions || raw.ages || [],
    classifications: raw.classifications || raw.classes || [],
    start_date: raw.start_date || raw.startDate || '',
    end_date: raw.end_date || raw.endDate || raw.start_date || raw.startDate || '',
    city: raw.city || '',
    state: raw.state || '',
    venue: raw.venue || raw.location || '',
    cost: raw.cost ? Number(raw.cost) : 0,
    currency: raw.currency || 'USD',
    spots_available: raw.spots_available || raw.spotsAvailable || null,
    teams_entered_count: raw.teams_entered_count || raw.teamsEnteredCount || 0,
    teams_entered: raw.teams_entered || raw.teamsEntered || [],
    registration_url: raw.registration_url || raw.registrationUrl || raw.url || raw.source_url || '',
    source_url: raw.source_url || raw.sourceUrl || raw.url || source.events_url || '',
    teams_url: raw.teams_url || raw.teamsUrl || '',
    source_system: source.name || raw.source_system || source.association || 'Manual',
    last_synced_at: new Date().toISOString(),
    status: raw.status || 'unknown',
    description: raw.description || '',
    latitude: raw.latitude || null,
    longitude: raw.longitude || null,
    is_verified_source: false
  };
}

export function buildTournamentKey(record = {}) {
  return [record.association, record.name, record.start_date, record.city, record.state]
    .map(v => String(v || '').trim().toLowerCase())
    .join('|');
}

// ---- Geocoding (city/state -> lat/long) ----
// Nominatim (OpenStreetMap) is free and keyless but has a strict usage policy:
// max ~1 request/second, and a descriptive User-Agent is required. Callers are
// responsible for rate-limiting between calls and caching results — this
// function only does a single lookup.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const GEOCODE_USER_AGENT = 'GameDayRosterBot/0.1 (+tournament-discovery; contact app admin)';

export function geocodeKey(city = '', state = '') {
  return `${String(city).trim().toLowerCase()}|${String(state).trim().toLowerCase()}`;
}

export async function geocodeCityState(city, state, { fetchTimeoutMs = 8000 } = {}) {
  if (!city || !state) return null;
  const query = `${city}, ${state}, USA`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  try {
    const res = await fetch(`${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`, {
      signal: controller.signal,
      headers: { 'User-Agent': GEOCODE_USER_AGENT, 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const latitude = Number(data[0].lat);
    const longitude = Number(data[0].lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ---- 2D Sports (youth.2dsports.org) ----
// youth.2dsports.org is a separate, non-CAPTCHA-protected registration platform
// (Playbook365-based) from the main 2dsports.org marketing site, which does
// actively block bots. The homepage's "Latest Tournaments" list is loaded via
// an authenticated-session AJAX call (Laravel CSRF cookie + token), recovered
// from youth.2dsports.org's own frontend JS (assets/frontend/js/m-1006.js).
// Individual event blocks use schema.org Event microdata (<meta itemprop=...>),
// not JSON-LD, so they need their own extraction rather than extractJsonLd().
const TWO_D_SPORTS_BASE = 'https://youth.2dsports.org';
const TWO_D_SPORTS_USER_AGENT = 'GameDayRosterBot/0.1 (+tournament-discovery; contact app admin)';
// Real weekend tournaments run 1–3 days. Season passes/memberships (the only
// items shown before pagination kicks in) span months, so a duration cutoff
// cleanly separates real tournaments from registration products without
// relying on the (unreliable, always-set-to-online) eventStatus field.
const TWO_D_SPORTS_MAX_EVENT_DAYS = 10;

function parseTwoDSportsDate(mmddyyyy = '') {
  const m = String(mmddyyyy).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
}

function extractTwoDSportsEventBlocks(html = '') {
  return html.split(/(?=<div class="block blogeBox)/).slice(1);
}

function parseTwoDSportsBlock(block = '') {
  const nameMatch = block.match(/itemprop="name" content="([^"]+)"/);
  const startMatch = block.match(/itemprop="startDate" content="([^"]+)"/);
  const endMatch = block.match(/itemprop="endDate" content="([^"]+)"/);
  const cityMatch = block.match(/itemprop="addressLocality" content="([^"]+)"/);
  const stateMatch = block.match(/itemprop="addressRegion" content="([^"]+)"/);
  const eventHrefs = [...block.matchAll(/href="(https:\/\/youth\.2dsports\.org\/events\/[^"]+)"/g)].map(m => m[1]);
  const hrefMatch = eventHrefs.find(href => !href.endsWith('/teams'));
  const teamsHrefMatch = eventHrefs.find(href => href.endsWith('/teams'));

  if (!nameMatch || !startMatch || !hrefMatch) return null;

  const startDateObj = parseTwoDSportsDate(startMatch[1]);
  const endDateObj = endMatch ? parseTwoDSportsDate(endMatch[1]) : startDateObj;
  if (!startDateObj) return null;

  const durationDays = endDateObj ? Math.round((endDateObj - startDateObj) / 86400000) : 0;
  if (durationDays > TWO_D_SPORTS_MAX_EVENT_DAYS) return null; // season pass / membership, not a tournament
  if (/membership|pricing|unlimited play/i.test(nameMatch[1])) return null;

  const toIso = d => d.toISOString().slice(0, 10);

  return {
    name: nameMatch[1].trim(),
    association: '2D Sports',
    sport: 'baseball',
    age_divisions: [],
    classifications: [],
    start_date: toIso(startDateObj),
    end_date: toIso(endDateObj || startDateObj),
    city: cityMatch ? cityMatch[1].trim() : '',
    state: stateMatch ? stateMatch[1].trim() : '',
    venue: cityMatch ? cityMatch[1].trim() : '',
    cost: 0,
    currency: 'USD',
    spots_available: null,
    teams_entered_count: 0,
    teams_entered: [],
    registration_url: hrefMatch,
    source_url: hrefMatch,
    teams_url: teamsHrefMatch || '',
    status: 'open',
    description: ''
  };
}

async function twoDSportsSession(fetchTimeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  let res;
  try {
    res = await fetch(`${TWO_D_SPORTS_BASE}/`, {
      signal: controller.signal,
      headers: { 'User-Agent': TWO_D_SPORTS_USER_AGENT }
    });
  } finally {
    clearTimeout(timeout);
  }

  if ([401, 403, 429, 503].includes(res.status)) {
    const err = new Error(`2D Sports homepage returned ${res.status}. Stopping source sync.`);
    err.blocked = true;
    throw err;
  }

  const html = await res.text();
  if (/sgcaptcha|cdn-cgi\/challenge-platform|Just a moment\.\.\./.test(html) && html.length < 8000) {
    const err = new Error('2D Sports served a bot-challenge page. Stopping source sync.');
    err.blocked = true;
    throw err;
  }

  const tokenMatch = html.match(/<meta name="csrf-token" content="([^"]+)"/);
  if (!tokenMatch) {
    throw new Error('2D Sports: could not find csrf-token on homepage — site markup may have changed.');
  }

  const setCookies = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean);
  const cookieHeader = setCookies.map(c => c.split(';')[0]).join('; ');

  return { token: tokenMatch[1], cookieHeader };
}

async function fetchTwoDSportsPage(session, page, fetchTimeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  let res;
  try {
    res = await fetch(`${TWO_D_SPORTS_BASE}/ajax-events`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'User-Agent': TWO_D_SPORTS_USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Cookie': session.cookieHeader
      },
      body: new URLSearchParams({ page: String(page), layout: 'medium', past_events: '', _token: session.token }).toString()
    });
  } finally {
    clearTimeout(timeout);
  }

  if ([401, 403, 429, 503].includes(res.status)) {
    const err = new Error(`2D Sports ajax-events returned ${res.status}. Stopping source sync.`);
    err.blocked = true;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`2D Sports ajax-events fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return typeof data.html === 'string' ? data.html : '';
}

export async function fetchTwoDSportsRecords({ fetchTimeoutMs = 15000, maxPages = 5 } = {}) {
  const session = await twoDSportsSession(fetchTimeoutMs);
  const records = [];

  for (let page = 1; page <= maxPages; page++) {
    const html = await fetchTwoDSportsPage(session, page, fetchTimeoutMs);
    const blocks = extractTwoDSportsEventBlocks(html);
    if (blocks.length === 0) break;

    for (const block of blocks) {
      const record = parseTwoDSportsBlock(block);
      if (record) records.push(record);
    }
  }

  const seen = new Set();
  return records.filter(r => {
    if (seen.has(r.source_url)) return false;
    seen.add(r.source_url);
    return true;
  });
}

// ---- USSSA nationwide JSON API ----
// USSSA's Angular event search app calls a real JSON API rather than
// server-rendering results. Endpoint, params, and the public search token
// were recovered from USSSA's own published frontend code
// (js/services/2_api.js, js/controllers/EventSearchResultsCtrl.js,
// js/services/1_jsLib.js on usssa.com), so this mirrors exactly what a
// site visitor's browser already sends. seasonID is computed the same way
// USSSA's own jsLib.getSeasonID() computes it, so this doesn't go stale.
const USSSA_API_URL = 'https://www.usssa.com/api/?action=eventSearchSimpleV11';
const USSSA_SEARCH_TOKEN = 'eventSearchV4!!!Get';
const USSSA_BASEBALL_SPORT_ID = 11;
// Central-US zip with a large radius returns nationwide results in one call.
const USSSA_DEFAULT_ZIP = '72118';
const USSSA_DEFAULT_MILE_RADIUS = 2000;

function usssaSeasonId(date = new Date()) {
  // Mirrors jsLib.getSeasonID(): (year - 1996), +1 for sports other than
  // sportID 17/34 (baseball is 11, so +1 applies).
  return (date.getFullYear() - 1996) + 1;
}

function parseUsssaAgeDivisions(eventDivisionsAll = '') {
  // Format: "10U%Open|AA|A#11U%AAA|AA|AA#..." — age before '%', classes after, '|'-joined per age.
  const ages = new Set();
  const classes = new Set();
  for (const chunk of String(eventDivisionsAll).split('#')) {
    const [age, classPart] = chunk.split('%');
    if (age) ages.add(age.trim());
    if (classPart) {
      for (const c of classPart.split('|')) {
        const trimmed = c.trim();
        if (trimmed) classes.add(trimmed);
      }
    }
  }
  return { age_divisions: [...ages], classifications: [...classes] };
}

export async function fetchUsssaNationwideRecords({ fetchTimeoutMs = 15000, zip = USSSA_DEFAULT_ZIP, mile = USSSA_DEFAULT_MILE_RADIUS } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  const body = new URLSearchParams({
    sportID: String(USSSA_BASEBALL_SPORT_ID),
    seasonID: String(usssaSeasonId()),
    age: '',
    classID: '0',
    stateID: '',
    regionID: '',
    zip,
    mile: String(mile),
    statureID: '',
    startDate: '',
    endDate: '',
    director: '',
    parkID: '',
    token: USSSA_SEARCH_TOKEN
  }).toString();

  let res;
  try {
    res = await fetch(USSSA_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GameDayRosterBot/0.1 (+tournament-discovery; contact app admin)',
        'Accept': 'application/json'
      },
      body
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`USSSA API fetch timed out after ${fetchTimeoutMs}ms.`);
      timeoutErr.blocked = true;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if ([401, 403, 429].includes(res.status)) {
    const err = new Error(`USSSA API returned ${res.status}. Stopping source sync.`);
    err.blocked = true;
    throw err;
  }
  if (!res.ok) {
    throw new Error(`USSSA API fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map(r => {
    const { age_divisions, classifications } = parseUsssaAgeDivisions(r.eventDivisionsAll);
    const teamCount = Number(r.teamCount);
    return {
      name: r.event_name || 'Untitled Tournament',
      association: 'USSSA',
      sport: 'baseball',
      age_divisions,
      classifications,
      start_date: String(r.start_date || '').slice(0, 10),
      end_date: String(r.end_date || r.start_date || '').slice(0, 10),
      city: r.city || '',
      state: r.stateABR || '',
      venue: r.eventLocation || '',
      cost: 0,
      currency: 'USD',
      spots_available: null,
      teams_entered_count: Number.isFinite(teamCount) ? teamCount : 0,
      teams_entered: [],
      registration_url: r.ID ? `https://www.usssa.com/baseball/event_home/?eventID=${r.ID}` : '',
      source_url: r.ID ? `https://www.usssa.com/baseball/event_home/?eventID=${r.ID}` : '',
      teams_url: r.ID ? `https://www.usssa.com/baseball/event_home/?eventID=${r.ID}` : '',
      status: 'open',
      description: [r.stature, r.eventType].filter(Boolean).join(' · ')
    };
  }).filter(r => r.name && r.source_url);
}

// ---- USSSA entered-teams import ("Who's Coming") ----
// Same selpV2 API as the nationwide search, just a different tabName. Found
// by inspecting the event_home page's own controller (selpV2Ctrl.js), which
// showed the action/params, then calling it with each menu tab name returned
// by the API itself until "lookWhoIsComing" (labeled "Who's Coming" in the
// menu) turned out to hold the real team roster, grouped by division.
function parseUsssaClassName(className = '') {
  const m = className.match(/(\d+)\s*&\s*Under\s+([A-Za-z]+)/);
  return { age_division: m ? `${m[1]}U` : '', classification: m ? m[2] : '' };
}

export async function fetchUsssaTeams(eventId, { fetchTimeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  try {
    const res = await fetch(USSSA_API_URL.replace('eventSearchSimpleV11', 'selpV2'), {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'GameDayRosterBot/0.1 (+tournament-discovery; contact app admin)',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({ eventID: String(eventId), divisionID: '', tabName: 'lookWhoIsComing' }).toString()
    });
    if ([401, 403, 429].includes(res.status)) return [];
    if (!res.ok) return [];
    const data = await res.json();
    const divisions = Array.isArray(data.lwcDivisions) ? data.lwcDivisions : [];
    const teams = [];
    for (const div of divisions) {
      const { age_division, classification } = parseUsssaClassName(div.className);
      for (const t of div.teams || []) {
        const [state, city] = String(t.city || '').split(' - ').map(s => s.trim());
        teams.push({
          team_name: t.teamName || '',
          age_division,
          classification,
          city: city || '',
          state: state || ''
        });
      }
    }
    return teams.filter(t => t.team_name);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// ---- Perfect Game (perfectgame.org national schedule) ----
// perfectgame.org/Schedule/Default.aspx?Type=Tournaments is a real server-
// rendered ASP.NET RadGrid — no login or JS execution needed, unlike the
// marketing pages under /Events/. Its own state-filter form is a full
// ASP.NET postback (view state + event validation), which a lightweight
// fetch() can't replicate, so this fetches the default national listing and
// filters by state client-side, same pattern as other sources.
//
// The tricky part is structural: each "tournament" is a group of per-age-
// division rows (schema.org-free, Telerik RadGrid grouping). The readable
// name/location/teams-link live ONLY on the group header row; the reliable
// exact dates live only on the individual (visually hidden, but present in
// the HTML) sub-rows, tagged with the same hfEventScheduleGroupID. So this
// does two passes — aggregate sub-row dates per group ID, then merge with
// each group header — rather than trying to parse either row type alone.
const PERFECT_GAME_SCHEDULE_URL = 'https://www.perfectgame.org/Schedule/Default.aspx?Type=Tournaments';
const PERFECT_GAME_USER_AGENT = 'GameDayRosterBot/0.1 (+tournament-discovery; contact app admin)';
// Real weekend/week-long tournaments run a few days. Season-long leagues
// (e.g. "PG New England League 2026", Mar-Aug) show up as groups too but
// aren't a single tournament a coach can register for as one event.
const PERFECT_GAME_MAX_GROUP_DAYS = 14;

function stripHtmlTags(s = '') {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function parsePerfectGameSubRows(html) {
  const rowBlocks = html.split(/(?=<tr class="rg(?:Row|AltRow)")/).slice(1);
  const byGid = new Map();
  for (const block of rowBlocks) {
    const gidMatch = block.match(/hfEventScheduleGroupID"[^>]*value="(\d+)"/);
    const startMatch = block.match(/hfStartDate"[^>]*value="([^"]+)"/);
    const endMatch = block.match(/hfEndDate"[^>]*value="([^"]+)"/);
    const ageMatch = block.match(/hfAgeDivision"[^>]*value="([^"]+)"/);
    const locMatch = block.match(/lblLocation"[^>]*>([^<]*)<br\s*\/?>([^<]*)<\/span>/);
    if (!gidMatch || !startMatch) continue;

    const gid = gidMatch[1];
    if (!byGid.has(gid)) byGid.set(gid, { starts: [], ends: [], ages: new Set(), venue: '' });
    const entry = byGid.get(gid);
    const startDate = new Date(startMatch[1]);
    if (!Number.isNaN(startDate.getTime())) entry.starts.push(startDate);
    if (endMatch) {
      const endDate = new Date(endMatch[1]);
      if (!Number.isNaN(endDate.getTime())) entry.ends.push(endDate);
    }
    if (ageMatch) entry.ages.add(ageMatch[1].trim());
    if (!entry.venue && locMatch) entry.venue = locMatch[1].trim();
  }
  return byGid;
}

function parsePerfectGameGroupHeaders(html) {
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
    const tailText = stripHtmlTags(block.split('col-md-2').slice(1).join('col-md-2'));
    const cityStateMatch = tailText.match(/([A-Za-z .'\/-]+),\s*([A-Za-z]{2})\b/);
    groups.push({
      gid,
      name,
      city: cityStateMatch ? cityStateMatch[1].trim() : '',
      state: cityStateMatch ? cityStateMatch[2].toUpperCase() : '',
      team_count: teamCountMatch ? Number(teamCountMatch[1]) : 0
    });
  }
  return groups;
}

// Pagination: the classic ASP.NET RadGrid page uses a plain (non-AJAX)
// __doPostBack for its numbered page links, which returns a full HTML page
// (not a Telerik AJAX delta) — confirmed by testing directly. So each page is
// just a normal POST carrying the PREVIOUS page's __VIEWSTATE/
// __VIEWSTATEGENERATOR and an __EVENTTARGET naming that page's pager link
// control. The pager's numbered-link control IDs are stable across pages
// (page 2's own response still lists page 1 as ctl05, page 3 as ctl07, etc.),
// confirmed directly rather than assumed, so this can target any page 1-10
// without needing to simulate expanding the "next pages" (11+) group.
function perfectGamePageTarget(pageNumber) {
  const ctl = String(4 + pageNumber).padStart(2, '0');
  return `ctl00$ctl00$ContentTopLevel$ContentPlaceHolder1$rgSchedule$ctl00$ctl03$ctl01$ctl${ctl}`;
}

function extractHiddenField(html, id) {
  const m = html.match(new RegExp(`id="${id}"[^>]*value="([^"]*)"`));
  return m ? m[1] : '';
}

async function fetchPerfectGameSchedulePage({ pageNumber, prevViewState, prevViewStateGenerator, fetchTimeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  try {
    const isFirstPage = pageNumber === 1;
    const res = await fetch(PERFECT_GAME_SCHEDULE_URL, {
      method: isFirstPage ? 'GET' : 'POST',
      signal: controller.signal,
      headers: isFirstPage
        ? { 'User-Agent': PERFECT_GAME_USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' }
        : { 'User-Agent': PERFECT_GAME_USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: isFirstPage ? undefined : new URLSearchParams({
        __EVENTTARGET: perfectGamePageTarget(pageNumber),
        __EVENTARGUMENT: '',
        __VIEWSTATE: prevViewState,
        __VIEWSTATEGENERATOR: prevViewStateGenerator
      }).toString()
    });

    if ([401, 403, 429, 503].includes(res.status)) {
      const err = new Error(`Perfect Game schedule page ${pageNumber} returned ${res.status}. Stopping source sync.`);
      err.blocked = true;
      throw err;
    }
    if (!res.ok) {
      throw new Error(`Perfect Game schedule page ${pageNumber} fetch failed: ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPerfectGameRecords({ fetchTimeoutMs = 15000, maxPages = 6 } = {}) {
  const allSubRows = new Map();
  const allGroups = [];
  const seenGids = new Set();
  let viewState = '';
  let viewStateGenerator = '';

  for (let page = 1; page <= maxPages; page++) {
    const html = await fetchPerfectGameSchedulePage({ pageNumber: page, prevViewState: viewState, prevViewStateGenerator: viewStateGenerator, fetchTimeoutMs });

    const pageSubRows = parsePerfectGameSubRows(html);
    for (const [gid, entry] of pageSubRows) {
      allSubRows.set(gid, entry);
    }
    const pageGroups = parsePerfectGameGroupHeaders(html);
    let newGroupCount = 0;
    for (const g of pageGroups) {
      if (seenGids.has(g.gid)) continue;
      seenGids.add(g.gid);
      allGroups.push(g);
      newGroupCount++;
    }

    if (newGroupCount === 0 && page > 1) break; // no new groups — likely reached the end or pagination stopped advancing

    viewState = extractHiddenField(html, '__VIEWSTATE');
    viewStateGenerator = extractHiddenField(html, '__VIEWSTATEGENERATOR');
    if (!viewState) break; // can't continue paginating without a viewstate to chain from
  }

  const records = [];
  for (const g of allGroups) {
    const sub = allSubRows.get(g.gid);
    if (!sub || sub.starts.length === 0) continue;

    const minStart = new Date(Math.min(...sub.starts.map(d => d.getTime())));
    const maxEnd = sub.ends.length ? new Date(Math.max(...sub.ends.map(d => d.getTime()))) : minStart;
    const durationDays = Math.round((maxEnd - minStart) / 86400000);
    if (durationDays > PERFECT_GAME_MAX_GROUP_DAYS) continue; // season-long league, not a single tournament

    const toIso = d => d.toISOString().slice(0, 10);

    records.push({
      name: g.name,
      association: 'Perfect Game',
      sport: 'baseball',
      age_divisions: [...sub.ages],
      classifications: [],
      start_date: toIso(minStart),
      end_date: toIso(maxEnd),
      city: g.city,
      state: g.state,
      venue: sub.venue || g.city,
      cost: 0,
      currency: 'USD',
      spots_available: null,
      teams_entered_count: g.team_count,
      teams_entered: [],
      registration_url: `https://www.perfectgame.org/Schedule/GroupedEvents.aspx?gid=${g.gid}`,
      source_url: `https://www.perfectgame.org/Schedule/GroupedEvents.aspx?gid=${g.gid}`,
      teams_url: `https://www.perfectgame.org/events/TournamentTeamsGroup.aspx?gid=${g.gid}`,
      status: 'open',
      description: ''
    });
  }

  return records;
}

// ---- Perfect Game entered-teams import ----
// TournamentTeamsGroup.aspx?gid=N is a real, unprotected page listing each
// team registered for a tournament, grouped by age division. It's a
// different page structure from the schedule (no RadGrid), so it gets its
// own lightweight parser rather than reusing the sub-row/group-header logic.
function parsePerfectGameTeamsPage(html) {
  const teams = [];
  // Each age-division block: an event link with the division name as its text,
  // followed by a "Participating Teams" list of team links + city/state spans.
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
      if (teamName) {
        teams.push({ team_name: teamName, age_division: ageDivision, classification: '', city: city || '', state: state || '' });
      }
    }
  }
  return teams;
}

export async function fetchPerfectGameTeams(teamsUrl, { fetchTimeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);
  try {
    const res = await fetch(teamsUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': PERFECT_GAME_USER_AGENT, 'Accept': 'text/html,application/xhtml+xml' }
    });
    if ([401, 403, 429, 503].includes(res.status)) return []; // don't block the whole sync over one tournament's team page
    if (!res.ok) return [];
    const html = await res.text();
    return parsePerfectGameTeamsPage(html);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}