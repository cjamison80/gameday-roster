// Tournament source pipeline foundation.
//
// This file intentionally does not scrape third-party sites directly from the browser.
// Production ingestion should run server-side using permitted APIs, partner feeds,
// approved exports, or scraping that is explicitly allowed by the source's terms and robots rules.

export const SOURCE_STATUS_LABELS = {
  never_run: 'Never run',
  success: 'Success',
  partial: 'Partial',
  failed: 'Failed',
  blocked: 'Blocked'
};

export const SOURCE_TYPE_LABELS = {
  api: 'API',
  rss: 'RSS',
  csv: 'CSV / Manual Import',
  manual_upload: 'Manual Upload',
  approved_scrape: 'Approved Scrape',
  partner_feed: 'Partner Feed',
  other: 'Other'
};

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
    registration_url: raw.registration_url || raw.registrationUrl || raw.url || '',
    source_url: raw.source_url || raw.sourceUrl || raw.url || source.events_url || '',
    source_system: source.name || raw.source_system || source.association || 'Manual',
    last_synced_at: new Date().toISOString(),
    status: raw.status || 'unknown',
    description: raw.description || '',
    latitude: raw.latitude || null,
    longitude: raw.longitude || null,
    is_verified_source: !!source.sync_enabled && source.permission_status === 'approved'
  };
}

export function validateSourceForSync(source) {
  if (!source) return { ok: false, reason: 'No source selected.' };
  if (!source.sync_enabled) return { ok: false, reason: 'Source sync is disabled.' };
  if (!source.events_url && source.source_type !== 'csv' && source.source_type !== 'manual_upload') {
    return { ok: false, reason: 'Source is missing an events/feed URL.' };
  }
  if (source.requires_permission && source.permission_status === 'rejected') {
    return { ok: false, reason: 'Source permission was rejected.' };
  }
  if (source.source_type === 'approved_scrape' && source.permission_status !== 'approved') {
    return {
      ok: true,
      warning: true,
      reason: 'Daily scrape is enabled, but source permission is not confirmed. Runner must check robots/terms and stop if blocked.'
    };
  }
  return { ok: true, reason: 'Source can run.' };
}

export function buildSyncJobPayload(source, user, status = 'queued', extra = {}) {
  return {
    source_id: source?.id,
    source_name: source?.name || 'Unknown Source',
    association: source?.association || 'Other',
    status,
    started_at: new Date().toISOString(),
    run_type: extra.run_type || 'manual',
    created_by_user_id: user?.id,
    notes: extra.notes || ''
  };
}

export function getPipelineNextStep(source) {
  if (!source) return 'Choose a source to review its setup.';
  if (source.source_type === 'approved_scrape' && source.sync_enabled && source.sync_frequency === 'daily') {
    return 'Daily scrape requested. Production runner should check robots/terms each run, use rate limits, preserve source attribution and stop if blocked.';
  }
  if (source.requires_permission && source.permission_status !== 'approved') {
    return 'Confirm source permission, terms, robots rules and rate limits before enabling live sync.';
  }
  if (!source.sync_enabled) return 'Turn on sync after permission and source rules are confirmed.';
  if (source.source_type === 'csv' || source.source_type === 'manual_upload') {
    return 'Upload or paste approved tournament data and import it into Tournament records.';
  }
  return 'Connect the server-side parser for this source and run a test sync.';
}
