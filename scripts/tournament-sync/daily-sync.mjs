#!/usr/bin/env node

import { createClient } from '@base44/sdk';
import { SCRAPE_ADAPTERS, normalizeTournamentRecord, parseTournamentHtml, buildTournamentKey } from './scrape-core.mjs';

const APP_ID = process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID;
const ACCESS_TOKEN = process.env.BASE44_ACCESS_TOKEN || process.env.BASE44_TOKEN || process.env.VITE_BASE44_ACCESS_TOKEN;
const APP_BASE_URL = process.env.BASE44_APP_BASE_URL || process.env.VITE_BASE44_APP_BASE_URL;
const API_BASE_URL = process.env.BASE44_API_BASE_URL || APP_BASE_URL;
const DRY_RUN = process.env.DRY_RUN === 'true';
const MAX_EVENTS_PER_SOURCE = Number(process.env.MAX_EVENTS_PER_SOURCE || 75);
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 1500);
const SOURCE_FILTER = process.env.SOURCE_FILTER || process.env.PARSER_KEY_FILTER || '';
const STATE_FILTER = process.env.STATE_FILTER || '';
const DEFAULT_STATE = process.env.DEFAULT_STATE || '';
const SPORT_FILTER = process.env.SPORT_FILTER || '';
const RUN_TYPE = process.env.RUN_TYPE || 'scheduled';

if (!APP_ID) {
  console.error('Missing BASE44_APP_ID. Set BASE44_APP_ID as an environment variable or repository secret.');
  process.exit(1);
}

if (!ACCESS_TOKEN) {
  console.error('Missing BASE44_ACCESS_TOKEN. Set BASE44_ACCESS_TOKEN as an environment variable or repository secret with permission to read/write app entities.');
  process.exit(1);
}

const base44 = createClient({
  appId: APP_ID,
  token: ACCESS_TOKEN,
  appBaseUrl: APP_BASE_URL,
  requiresAuth: false,
  serverUrl: ''
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchText(url, sourceName) {
  const res = await fetch(url, {
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

  return await res.text();
}

async function createJob(source, status = 'running', notes = '') {
  if (DRY_RUN) {
    console.log(`[dry-run] create job ${source.name}: ${status}`);
    return { id: `dry-run-${Date.now()}` };
  }

  return await base44.entities.TournamentSyncJob.create({
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
  });
}

async function finishJob(job, source, patch) {
  const payload = {
    ...patch,
    finished_at: new Date().toISOString()
  };

  if (DRY_RUN) {
    console.log(`[dry-run] finish job ${job.id}`, payload);
    return;
  }

  await base44.entities.TournamentSyncJob.update(job.id, payload);
  await base44.entities.TournamentSource.update(source.id, {
    last_status: patch.status,
    last_synced_at: new Date().toISOString()
  });
}

async function upsertTournament(source, record) {
  const tournament = normalizeTournamentRecord(record, source);
  const sourceKey = buildTournamentKey(tournament);
  const existing = await base44.entities.Tournament.filter({ source_url: tournament.source_url }, '-created_date', 1);

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
    await base44.entities.Tournament.update(existing[0].id, payload);
    return 'updated';
  }

  await base44.entities.Tournament.create(payload);
  return 'created';
}

async function runSource(source) {
  const adapter = SCRAPE_ADAPTERS[source.parser_key];
  const job = await createJob(source, 'running', `Daily sync started for ${source.name}`);

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

    for (const record of parsed) {
      try {
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
      status: err.blocked ? 'blocked' : 'failed',
      records_found: recordsFound,
      records_created: recordsCreated,
      records_updated: recordsUpdated,
      records_skipped: recordsSkipped,
      error_message: err.message
    });
  }
}

async function main() {
  const sources = await base44.entities.TournamentSource.list('-created_date', 100);
  const parserKeys = (SOURCE_FILTER || 'usssa,2d_sports,perfect_game')
    .split(',')
    .map(key => key.trim())
    .filter(Boolean);
  const dailySources = sources.filter(source =>
    source.sync_enabled &&
    source.sync_frequency === 'daily' &&
    parserKeys.includes(source.parser_key)
  );

  console.log(`Tournament sync starting. Sources: ${dailySources.map(s => s.name).join(', ') || 'none'}`);
  if (STATE_FILTER || SPORT_FILTER) {
    console.log(`Filters: state=${STATE_FILTER || 'any'}, sport=${SPORT_FILTER || 'any'}`);
  }

  for (const source of dailySources) {
    await runSource(source);
    await sleep(REQUEST_DELAY_MS * 2);
  }

  console.log('Daily tournament sync complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
