#!/usr/bin/env node

import { createClient } from '@base44/sdk';
import { SCRAPE_ADAPTERS, normalizeTournamentRecord, parseTournamentHtml, buildTournamentKey } from './scrape-core.mjs';

const APP_ID = process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID;
const ADMIN_EMAIL = process.env.BASE44_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.BASE44_ADMIN_PASSWORD;
const APP_BASE_URL = process.env.BASE44_APP_BASE_URL || process.env.VITE_BASE44_APP_BASE_URL;
const API_BASE_URL = process.env.BASE44_API_BASE_URL || APP_BASE_URL;
const DRY_RUN = process.env.DRY_RUN === 'true';
const MAX_EVENTS_PER_SOURCE = Number(process.env.MAX_EVENTS_PER_SOURCE || 10);
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 250);
const SOURCE_FILTER = process.env.SOURCE_FILTER || process.env.PARSER_KEY_FILTER || '';
const STATE_FILTER = process.env.STATE_FILTER || '';
const DEFAULT_STATE = process.env.DEFAULT_STATE || '';
const SPORT_FILTER = process.env.SPORT_FILTER || '';
const RUN_TYPE = process.env.RUN_TYPE || 'scheduled';
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 15000);
const SOURCE_TIMEOUT_MS = Number(process.env.SOURCE_TIMEOUT_MS || 120000);
const MAX_HTML_BYTES = Number(process.env.MAX_HTML_BYTES || 3000000);

if (!APP_ID) {
  console.error('Missing BASE44_APP_ID. Set BASE44_APP_ID as an environment variable or repository secret.');
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing BASE44_ADMIN_EMAIL / BASE44_ADMIN_PASSWORD. This script logs in fresh each run (Base44 has no long-lived external access token) using an account with the admin role, since Tournament/TournamentSyncJob/TournamentSource writes require it.');
  process.exit(1);
}

if (!API_BASE_URL || !/^https?:\/\//i.test(API_BASE_URL)) {
  console.error('Missing or invalid BASE44_APP_BASE_URL / BASE44_API_BASE_URL. For GitHub Actions, set BASE44_APP_BASE_URL to https://gameday-roster-hub.base44.app');
  process.exit(1);
}

const base44 = createClient({
  appId: APP_ID,
  appBaseUrl: APP_BASE_URL,
  requiresAuth: false,
  serverUrl: API_BASE_URL
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${label} timed out after ${ms}ms`);
      err.timedOut = true;
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function fetchText(url, sourceName) {
  console.log(`Fetching ${sourceName}: ${url}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GameDayRosterBot/0.1 (+tournament-discovery; contact app admin)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7'
      },
      redirect: 'follow'
    });

    if ([401, 403, 429].includes(res.status)) {
      const err = new Error(`${sourceName} returned ${res.status}. Stopping source sync.`);
      err.blocked = true;
      throw err;
    }

    if (!res.ok) {
      throw new Error(`${sourceName} fetch failed: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();
    if (text.length > MAX_HTML_BYTES) {
      console.warn(`${sourceName} returned ${text.length} bytes. Trimming to ${MAX_HTML_BYTES} bytes for test parser.`);
      return text.slice(0, MAX_HTML_BYTES);
    }
    console.log(`${sourceName} fetched ${text.length} bytes.`);
    return text;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`${sourceName} fetch timed out after ${FETCH_TIMEOUT_MS}ms.`);
      timeoutErr.blocked = true;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function createJob(source, status = 'running', notes = '') {
  if (DRY_RUN) {
    console.log(`[dry-run] create job ${source.name}: ${status}`);
    return { id: `dry-run-${Date.now()}` };
  }

  try {
    return await withTimeout(base44.entities.TournamentSyncJob.create({
      source_id: source.id,
      source_name: source.name,
      association: source.association,
      status,
      started_at: new Date().toISOString(),
      run_type: RUN_TYPE,
      records_found: 0,
      records_created: 0,
      records_updated: 0,
      records_skipped: 0,
      notes
    }), 10000, `Create TournamentSyncJob for ${source.name}`);
  } catch (err) {
    console.warn(`Could not create TournamentSyncJob for ${source.name}. Continuing without sync log.`, err.message);
    return { id: `no-sync-log-${source.id || Date.now()}`, noSyncLog: true };
  }
}

async function finishJob(job, source, patch) {
  const payload = {
    ...patch,
    finished_at: new Date().toISOString()
  };

  console.log(`Finishing ${source.name}: status=${payload.status}, found=${payload.records_found || 0}, created=${payload.records_created || 0}, updated=${payload.records_updated || 0}, skipped=${payload.records_skipped || 0}`);

  if (DRY_RUN) {
    console.log(`[dry-run] finish job ${job.id}`, payload);
    return;
  }

  if (job.noSyncLog) {
    console.warn(`Skipping TournamentSyncJob update for ${job.id}. No sync log was created.`);
  } else {
    try {
      await withTimeout(base44.entities.TournamentSyncJob.update(job.id, payload), 10000, `Update TournamentSyncJob ${job.id}`);
    } catch (err) {
      console.warn(`Could not update TournamentSyncJob ${job.id}. Continuing.`, err.message);
    }
  }

  try {
    await withTimeout(base44.entities.TournamentSource.update(source.id, {
      last_status: patch.status,
      last_synced_at: new Date().toISOString()
    }), 10000, `Update TournamentSource ${source.id}`);
  } catch (err) {
    console.warn(`Could not update TournamentSource ${source.id}. Continuing.`, err.message);
  }
}

async function upsertTournament(source, record) {
  const tournament = normalizeTournamentRecord(record, source);
  const sourceKey = buildTournamentKey(tournament);
  const existing = await withTimeout(
    base44.entities.Tournament.filter({ source_url: tournament.source_url }, '-created_date', 1),
    10000,
    `Find existing tournament ${tournament.source_url}`
  );

  if (DRY_RUN) {
    console.log(`[dry-run] upsert ${source.association}: ${tournament.name} (${tournament.start_date})`);
    return existing.length ? 'updated' : 'created';
  }

  const payload = {
    ...tournament,
    description: tournament.description || `Imported from ${source.name}. Source key: ${sourceKey}`,
    source_system: source.name,
    last_synced_at: new Date().toISOString(),
    is_verified_source: false
  };

  if (existing.length) {
    await withTimeout(base44.entities.Tournament.update(existing[0].id, payload), 10000, `Update tournament ${existing[0].id}`);
    return 'updated';
  }

  await withTimeout(base44.entities.Tournament.create(payload), 10000, `Create tournament ${tournament.name}`);
  return 'created';
}

async function runSource(source) {
  return await withTimeout(runSourceInner(source), SOURCE_TIMEOUT_MS, `Source sync ${source.name}`);
}

async function runSourceInner(source) {
  const adapter = SCRAPE_ADAPTERS[source.parser_key];
  const job = await createJob(source, 'running', `Focused sync started for ${source.name}`);

  let recordsFound = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsSkipped = 0;

  try {
    if (!source.sync_enabled || source.sync_frequency !== 'daily') {
      await finishJob(job, source, {
        status: 'blocked',
        records_skipped: 1,
        error_message: 'Source is not enabled for daily sync.'
      });
      return;
    }

    if (!adapter) {
      throw new Error(`No scrape adapter found for parser_key=${source.parser_key}`);
    }

    const html = await fetchText(source.events_url, source.name);
    console.log(`Parsing ${source.name} HTML...`);
    const parsed = parseTournamentHtml(html, source, adapter)
      .map(record => ({
        ...record,
        sport: record.sport || SPORT_FILTER || 'baseball',
        state: record.state || DEFAULT_STATE || ''
      }))
      .filter(record => {
        if (SPORT_FILTER && String(record.sport || '').toLowerCase() !== SPORT_FILTER.toLowerCase()) return false;
        if (STATE_FILTER && String(record.state || '').toUpperCase() !== STATE_FILTER.toUpperCase()) return false;
        return true;
      })
      .slice(0, MAX_EVENTS_PER_SOURCE);
    recordsFound = parsed.length;
    console.log(`${source.name} parsed records after filters: ${recordsFound}`);

    for (const [index, record] of parsed.entries()) {
      try {
        console.log(`Upserting ${index + 1}/${parsed.length}: ${record.name || 'Unnamed tournament'}`);
        const result = await upsertTournament(source, record);
        if (result === 'created') recordsCreated += 1;
        else if (result === 'updated') recordsUpdated += 1;
        else recordsSkipped += 1;
      } catch (recordErr) {
        recordsSkipped += 1;
        console.warn(`Skipped record for ${source.name}:`, recordErr.message);
      }
      await sleep(REQUEST_DELAY_MS);
    }

    await finishJob(job, source, {
      status: 'success',
      records_found: recordsFound,
      records_created: recordsCreated,
      records_updated: recordsUpdated,
      records_skipped: recordsSkipped,
      error_message: ''
    });
  } catch (err) {
    await finishJob(job, source, {
      status: err.blocked || err.timedOut ? 'blocked' : 'failed',
      records_found: recordsFound,
      records_created: recordsCreated,
      records_updated: recordsUpdated,
      records_skipped: recordsSkipped,
      error_message: err.message
    });
  }
}

async function main() {
  console.log(`Tournament sync config: max_events=${MAX_EVENTS_PER_SOURCE}, delay_ms=${REQUEST_DELAY_MS}, fetch_timeout_ms=${FETCH_TIMEOUT_MS}, source_timeout_ms=${SOURCE_TIMEOUT_MS}`);

  try {
    const { user } = await withTimeout(base44.auth.loginViaEmailPassword(ADMIN_EMAIL, ADMIN_PASSWORD), 15000, 'Base44 admin login');
    if (user?.role !== 'admin') {
      console.error(`Logged in as ${user?.email || ADMIN_EMAIL}, but role is "${user?.role}", not "admin". Tournament/TournamentSyncJob/TournamentSource writes require the admin role. Update the account's role or point BASE44_ADMIN_EMAIL at the admin account.`);
      process.exit(1);
    }
    console.log(`Authenticated as ${user.email} (role: ${user.role}).`);
  } catch (err) {
    console.error('Base44 admin login failed. Check BASE44_ADMIN_EMAIL / BASE44_ADMIN_PASSWORD.', err.message);
    process.exit(1);
  }

  const sources = await withTimeout(base44.entities.TournamentSource.list('-created_date', 100), 15000, 'List TournamentSource');
  const parserKeys = (SOURCE_FILTER || 'usssa,2d_sports,perfect_game')
    .split(',')
    .map(key => key.trim())
    .filter(Boolean);
  const dailySources = sources.filter(source =>
    source.sync_enabled &&
    source.sync_frequency === 'daily' &&
    parserKeys.includes(source.parser_key)
  );

  console.log(`Tournament sync starting. Sources: ${dailySources.map(s => `${s.name}(${s.parser_key})`).join(', ') || 'none'}`);
  if (STATE_FILTER || SPORT_FILTER) {
    console.log(`Filters: state=${STATE_FILTER || 'any'}, sport=${SPORT_FILTER || 'any'}`);
  }

  for (const source of dailySources) {
    try {
      await runSource(source);
    } catch (err) {
      console.error(`Source ${source.name} did not complete:`, err.message);
    }
    await sleep(REQUEST_DELAY_MS * 2);
  }

  console.log('Daily tournament sync complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
