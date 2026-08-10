// Tournament scrape adapter registry.
//
// These adapters define the source-specific fields the server-side scraper should collect.
// They do not bypass paywalls, login walls, anti-bot protections, CAPTCHAs, or blocked paths.
// A production runner should:
// 1. Check robots.txt and source terms before each source run.
// 2. Use low request rates and cache pages.
// 3. Store source_url and last_synced_at on every Tournament record.
// 4. Stop and mark the job blocked if the source returns access restrictions.
// 5. Prefer official API/partner feed access whenever available.

export const SCRAPE_ADAPTERS = {
  usssa: {
    association: 'USSSA',
    cadence: 'daily',
    publicFields: [
      'name', 'start_date', 'end_date', 'city', 'state', 'venue', 'age_divisions',
      'classifications', 'cost', 'status', 'teams_entered', 'registration_url', 'source_url'
    ],
    notes: 'USSSA appears to have API-style infrastructure, but commercial reuse permission should remain under review.'
  },
  '2d_sports': {
    association: '2D Sports',
    cadence: 'daily',
    publicFields: [
      'name', 'start_date', 'end_date', 'city', 'state', 'venue', 'age_divisions',
      'classifications', 'cost', 'status', 'teams_entered', 'registration_url', 'source_url'
    ],
    notes: '2D event pages are public, commonly powered by Playbook365. Use only permitted public pages or approved feeds.'
  },
  perfect_game: {
    association: 'Perfect Game',
    cadence: 'daily',
    publicFields: [
      'name', 'start_date', 'end_date', 'city', 'state', 'venue', 'age_divisions',
      'classifications', 'cost', 'status', 'teams_entered', 'registration_url', 'source_url'
    ],
    notes: 'Perfect Game tournament schedules are public, but no public developer API has been confirmed.'
  }
};

export function getScrapeAdapter(parserKey) {
  return SCRAPE_ADAPTERS[parserKey] || null;
}

export function buildDailyScrapePlan(sources = []) {
  return sources
    .filter(source => source.sync_enabled && source.sync_frequency === 'daily')
    .map(source => ({
      source_id: source.id,
      source_name: source.name,
      parser_key: source.parser_key,
      association: source.association,
      events_url: source.events_url,
      cadence: 'daily',
      adapter: getScrapeAdapter(source.parser_key),
      safeguards: {
        check_robots_txt: true,
        respect_rate_limits: true,
        no_login_bypass: true,
        preserve_source_attribution: true,
        stop_if_blocked: true
      }
    }));
}
