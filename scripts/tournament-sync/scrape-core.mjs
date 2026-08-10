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

const STATE_RE = /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|IA|ID|IL|IN|KS|KY|LA|MA|MD|ME|MI|MN|MO|MS|MT|NC|ND|NE|NH|NJ|NM|NV|NY|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VA|VT|WA|WI|WV|WY)\b/;
const MONEY_RE = /\$\s?([0-9]{2,4}(?:\.[0-9]{2})?)/;
const AGE_RE = /\b(6U|7U|8U|9U|10U|11U|12U|13U|14U|15U|16U|17U|18U)\b/g;
const CLASS_RE = /\b(Major|Open|AAA|AA|A)\b/gi;

function stripTags(html = '') {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
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
