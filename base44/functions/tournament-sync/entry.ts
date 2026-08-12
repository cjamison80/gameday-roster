import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import {
  SCRAPE_ADAPTERS,
  parseTournamentHtml,
  normalizeTournamentRecord,
  buildTournamentKey,
  fetchUsssaNationwideRecords,
  fetchTwoDSportsRecords,
  fetchPerfectGameRecords,
  fetchPerfectGameTeams,
  fetchUsssaTeams,
  geocodeCityState,
  geocodeKey
} from '../../shared/scrape-core.js';

const FETCH_TIMEOUT_MS = 15000;
// A job stuck at status "running" with no finished_at (seen after raising this
// to 240s) means the underlying platform killed the function before our own
// try/catch got to record anything — i.e. our timeout was set HIGHER than the
// platform's real hard limit, which defeats the purpose of having one. Keeping
// this comfortably low means WE always get to write a clean status.
const SOURCE_TIMEOUT_MS = 90000;
const REQUEST_DELAY_MS = 250;
const MAX_HTML_BYTES = 3000000;
const USER_AGENT = 'GameDayRosterBot/0.1 (+tournament-discovery; contact app admin)';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Nominatim's usage policy caps requests at ~1/sec. We only geocode NEW
// city/state combos (existing ones are cached in the GeocodeCache entity).
// Kept intentionally small relative to SOURCE_TIMEOUT_MS (90s) — this budget
// is SHARED across every source in one run, so whichever source runs after
// others have already used part of it still needs most of its own 90s window
// left for actual fetching/upserting. Backfill just takes more runs instead
// of fewer, which is fine — a reliably-finishing run beats a faster one that
// risks getting killed with no recorded status.
const GEOCODE_BUDGET_PER_RUN = 20;
const GEOCODE_RATE_LIMIT_MS = 1100;

// Perfect Game team pages are unprotected and cheap, but we still cap fetches
// per run to bound execution time — whatever's left over just gets picked up
// on a later run. Unlike geocoding, team rosters genuinely change over time as
// more teams register, so (unlike the geocode cache) this intentionally has no
// "already done, skip forever" cache — it re-fetches periodically.
// Shared across BOTH Perfect Game and USSSA team fetches now (each is a
// single fast request, ~1s including the delay) — 20 comfortably fits within
// SOURCE_TIMEOUT_MS (90s) alongside each source's normal fetch/upsert work.
const TEAMS_BUDGET_PER_RUN = 20;
const TEAMS_FETCH_DELAY_MS = 150;

async function loadGeoCache(base44) {
  const cache = new Map();
  try {
    const rows = await withTimeout(base44.asServiceRole.entities.GeocodeCache.list('-created_date', 500), 15000, 'List GeocodeCache');
    for (const row of rows) {
      cache.set(row.key, row.resolved ? { latitude: row.latitude, longitude: row.longitude } : null);
    }
    console.log(`Loaded ${cache.size} cached geocode entries.`);
  } catch (err) {
    console.warn('Could not load GeocodeCache. Continuing without it.', err.message);
  }
  return cache;
}

async function resolveGeo(base44, geoState, city, state) {
  if (!city || !state) return null;
  const key = geocodeKey(city, state);
  if (geoState.cache.has(key)) return geoState.cache.get(key);
  if (geoState.budgetUsed >= GEOCODE_BUDGET_PER_RUN) return null; // out of budget this run — try again next run

  geoState.budgetUsed += 1;
  const coords = await geocodeCityState(city, state, { fetchTimeoutMs: 8000 });
  geoState.cache.set(key, coords);

  try {
    await base44.asServiceRole.entities.GeocodeCache.create({
      key,
      city,
      state,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      resolved: !!coords
    });
  } catch (err) {
    console.warn(`Could not persist GeocodeCache for ${key}.`, err.message);
  }

  await sleep(GEOCODE_RATE_LIMIT_MS);
  return coords;
}

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

// Telltale markers of a bot-challenge/interstitial page (Cloudflare and similar
// services). These often come back with a normal-looking 2xx/3xx status rather
// than 401/403/429, so status-code checks alone miss them — we also inspect
// the body itself. Kept short and small-body-gated so real pages that happen to
// mention e.g. "Cloudflare" in a footer aren't misclassified.
const CHALLENGE_MARKERS = [
  'sgcaptcha',
  'cdn-cgi/challenge-platform',
  'Just a moment...',
  'Attention Required! | Cloudflare',
  'Checking if the site connection is secure',
  '__CF$cv$params'
];
const CHALLENGE_BODY_MAX_BYTES = 8000;

function isChallengePage(text = '') {
  if (text.length > CHALLENGE_BODY_MAX_BYTES) return false;
  return CHALLENGE_MARKERS.some(marker => text.includes(marker));
}

async function fetchText(url, sourceName) {
  console.log(`Fetching ${sourceName}: ${url}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7'
      },
      redirect: 'follow'
    });

    if ([401, 403, 429, 503].includes(res.status)) {
      const err = new Error(`${sourceName} returned ${res.status}. Stopping source sync.`);
      err.blocked = true;
      throw err;
    }

    if (!res.ok) {
      throw new Error(`${sourceName} fetch failed: ${res.status} ${res.statusText}`);
    }

    const text = await res.text();

    if (isChallengePage(text)) {
      const err = new Error(`${sourceName} served a bot-challenge/CAPTCHA page instead of content (HTTP ${res.status}). Stopping source sync — this site is actively blocking automated requests.`);
      err.blocked = true;
      throw err;
    }

    if (text.length > MAX_HTML_BYTES) {
      console.warn(`${sourceName} returned ${text.length} bytes. Trimming to ${MAX_HTML_BYTES} bytes.`);
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

async function createJob(base44, source, status, notes) {
  try {
    return await withTimeout(
      base44.asServiceRole.entities.TournamentSyncJob.create({
        source_id: source.id,
        source_name: source.name,
        association: source.association,
        status,
        started_at: new Date().toISOString(),
        run_type: 'scheduled',
        records_found: 0,
        records_created: 0,
        records_updated: 0,
        records_skipped: 0,
        notes
      }),
      10000,
      `Create TournamentSyncJob for ${source.name}`
    );
  } catch (err) {
    console.warn(`Could not create TournamentSyncJob for ${source.name}. Continuing without sync log.`, err.message);
    return { id: `no-sync-log-${source.id || Date.now()}`, noSyncLog: true };
  }
}

async function finishJob(base44, job, source, patch) {
  const payload = { ...patch, finished_at: new Date().toISOString() };
  console.log(`Finishing ${source.name}: status=${payload.status}, found=${payload.records_found || 0}, created=${payload.records_created || 0}, updated=${payload.records_updated || 0}, skipped=${payload.records_skipped || 0}`);

  if (job.noSyncLog) {
    console.warn(`Skipping TournamentSyncJob update for ${job.id}. No sync log was created.`);
  } else {
    try {
      await withTimeout(
        base44.asServiceRole.entities.TournamentSyncJob.update(job.id, payload),
        10000,
        `Update TournamentSyncJob ${job.id}`
      );
    } catch (err) {
      console.warn(`Could not update TournamentSyncJob ${job.id}. Continuing.`, err.message);
    }
  }

  try {
    await withTimeout(
      base44.asServiceRole.entities.TournamentSource.update(source.id, {
        last_status: patch.status,
        last_synced_at: new Date().toISOString()
      }),
      10000,
      `Update TournamentSource ${source.id}`
    );
  } catch (err) {
    console.warn(`Could not update TournamentSource ${source.id}. Continuing.`, err.message);
  }
}

async function upsertTournament(base44, source, record, dryRun, geoState, teamsState) {
  const tournament = normalizeTournamentRecord(record, source);

  if (geoState && tournament.city && tournament.state && tournament.latitude == null) {
    const coords = await resolveGeo(base44, geoState, tournament.city, tournament.state);
    if (coords) {
      tournament.latitude = coords.latitude;
      tournament.longitude = coords.longitude;
    }
  }

  if (teamsState && teamsState.budgetUsed < TEAMS_BUDGET_PER_RUN) {
    if (source.parser_key === 'perfect_game' && tournament.teams_url) {
      teamsState.budgetUsed += 1;
      try {
        const teams = await fetchPerfectGameTeams(tournament.teams_url, { fetchTimeoutMs: FETCH_TIMEOUT_MS });
        if (teams.length) {
          tournament.teams_entered = teams;
          tournament.teams_entered_count = teams.length;
        }
      } catch (err) {
        console.warn(`Could not fetch teams for ${tournament.name}.`, err.message);
      }
      await sleep(TEAMS_FETCH_DELAY_MS);
    } else if (source.parser_key === 'usssa' && tournament.source_url) {
      const eventIdMatch = tournament.source_url.match(/eventID=(\d+)/);
      if (eventIdMatch) {
        teamsState.budgetUsed += 1;
        try {
          const teams = await fetchUsssaTeams(eventIdMatch[1], { fetchTimeoutMs: FETCH_TIMEOUT_MS });
          if (teams.length) {
            tournament.teams_entered = teams;
            tournament.teams_entered_count = teams.length;
          }
        } catch (err) {
          console.warn(`Could not fetch USSSA teams for ${tournament.name}.`, err.message);
        }
        await sleep(TEAMS_FETCH_DELAY_MS);
      }
    }
  }

  const sourceKey = buildTournamentKey(tournament);
  const existing = await withTimeout(
    base44.asServiceRole.entities.Tournament.filter({ source_url: tournament.source_url }, '-created_date', 1),
    10000,
    `Find existing tournament ${tournament.source_url}`
  );

  if (dryRun) {
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
    await withTimeout(
      base44.asServiceRole.entities.Tournament.update(existing[0].id, payload),
      10000,
      `Update tournament ${existing[0].id}`
    );
    return 'updated';
  }

  await withTimeout(
    base44.asServiceRole.entities.Tournament.create(payload),
    10000,
    `Create tournament ${tournament.name}`
  );
  return 'created';
}

async function runSourceInner(base44, source, opts) {
  const { stateFilter, sportFilter, maxEvents, dryRun, geoState, teamsState } = opts;
  const job = await createJob(base44, source, 'running', `HTTP-triggered sync started for ${source.name}`);

  let recordsFound = 0;
  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsSkipped = 0;

  try {
    if (!source.sync_enabled || source.sync_frequency !== 'daily') {
      await finishJob(base44, job, source, {
        status: 'blocked',
        records_skipped: 1,
        error_message: 'Source is not enabled for daily sync.'
      });
      return { source: source.name, status: 'blocked', records_found: 0, records_created: 0, records_updated: 0, records_skipped: 1, error: 'Source is not enabled for daily sync.' };
    }

    let parsed;
    if (source.parser_key === 'usssa') {
      // USSSA: real nationwide JSON API, not HTML scraping. See scrape-core.js
      // for how this endpoint was recovered from USSSA's own frontend code.
      // The API's own ordering isn't proximity- or state-based (confirmed: AR
      // events exist in the full dataset but weren't showing up in an
      // unprioritized slice), so once filtered we explicitly sort Arkansas and
      // its neighboring states first before slicing to maxEvents — otherwise
      // this app's core audience can get starved out by nationwide noise.
      console.log(`Fetching ${source.name} via USSSA nationwide API...`);
      const records = await fetchUsssaNationwideRecords({ fetchTimeoutMs: FETCH_TIMEOUT_MS });
      console.log(`${source.name} API returned ${records.length} records nationwide.`);
      const priorityStates = ['AR', 'TX', 'TN', 'MS', 'LA', 'MO', 'OK'];
      parsed = records
        .filter(record => {
          if (sportFilter && String(record.sport || '').toLowerCase() !== sportFilter.toLowerCase()) return false;
          if (stateFilter && String(record.state || '').toUpperCase() !== stateFilter.toUpperCase()) return false;
          return true;
        })
        .sort((a, b) => {
          const rank = s => { const i = priorityStates.indexOf(String(s || '').toUpperCase()); return i === -1 ? priorityStates.length : i; };
          return rank(a.state) - rank(b.state);
        })
        .slice(0, maxEvents);
    } else if (source.parser_key === '2d_sports') {
      // 2D Sports: youth.2dsports.org, a separate non-CAPTCHA-protected session-
      // based platform from the main site. See scrape-core.js for the session/
      // pagination details recovered from its own frontend JS.
      console.log(`Fetching ${source.name} via youth.2dsports.org session API...`);
      const records = await fetchTwoDSportsRecords({ fetchTimeoutMs: FETCH_TIMEOUT_MS, maxPages: 5 });
      console.log(`${source.name} returned ${records.length} real tournament records (season passes/memberships excluded).`);
      parsed = records
        .filter(record => {
          if (sportFilter && String(record.sport || '').toLowerCase() !== sportFilter.toLowerCase()) return false;
          if (stateFilter && String(record.state || '').toUpperCase() !== stateFilter.toUpperCase()) return false;
          return true;
        })
        .slice(0, maxEvents);
    } else if (source.parser_key === 'perfect_game') {
      // Perfect Game: real national schedule page (RadGrid), not the marketing
      // pages. See scrape-core.js for the group-header/sub-row correlation
      // this needs and why (league groups vs single tournaments).
      console.log(`Fetching ${source.name} via perfectgame.org national schedule...`);
      const records = await fetchPerfectGameRecords({ fetchTimeoutMs: FETCH_TIMEOUT_MS, maxPages: 3 });
      console.log(`${source.name} returned ${records.length} real tournament records (season-long leagues excluded).`);
      parsed = records
        .filter(record => {
          if (sportFilter && String(record.sport || '').toLowerCase() !== sportFilter.toLowerCase()) return false;
          if (stateFilter && String(record.state || '').toUpperCase() !== stateFilter.toUpperCase()) return false;
          return true;
        })
        .slice(0, maxEvents);
    } else {
      const adapter = SCRAPE_ADAPTERS[source.parser_key];
      if (!adapter) {
        throw new Error(`No scrape adapter found for parser_key=${source.parser_key}`);
      }

      const html = await fetchText(source.events_url, source.name);
      console.log(`Parsing ${source.name} HTML...`);
      parsed = parseTournamentHtml(html, source, adapter)
        .map(record => ({
          ...record,
          sport: record.sport || sportFilter || 'baseball',
          state: record.state || ''
        }))
        .filter(record => {
          if (sportFilter && String(record.sport || '').toLowerCase() !== sportFilter.toLowerCase()) return false;
          if (stateFilter && String(record.state || '').toUpperCase() !== stateFilter.toUpperCase()) return false;
          return true;
        })
        .slice(0, maxEvents);
    }
    recordsFound = parsed.length;
    console.log(`${source.name} parsed records after filters: ${recordsFound}`);

    for (const [index, record] of parsed.entries()) {
      try {
        console.log(`Upserting ${index + 1}/${parsed.length}: ${record.name || 'Unnamed tournament'}`);
        const result = await upsertTournament(base44, source, record, dryRun, geoState, teamsState);
        if (result === 'created') recordsCreated += 1;
        else if (result === 'updated') recordsUpdated += 1;
        else recordsSkipped += 1;
      } catch (recordErr) {
        recordsSkipped += 1;
        console.warn(`Skipped record for ${source.name}:`, recordErr.message);
      }
      await sleep(REQUEST_DELAY_MS);
    }

    await finishJob(base44, job, source, {
      status: 'success',
      records_found: recordsFound,
      records_created: recordsCreated,
      records_updated: recordsUpdated,
      records_skipped: recordsSkipped,
      error_message: ''
    });

    return { source: source.name, parser_key: source.parser_key, status: 'success', records_found: recordsFound, records_created: recordsCreated, records_updated: recordsUpdated, records_skipped: recordsSkipped };
  } catch (err) {
    const status = err.blocked || err.timedOut ? 'blocked' : 'failed';
    await finishJob(base44, job, source, {
      status,
      records_found: recordsFound,
      records_created: recordsCreated,
      records_updated: recordsUpdated,
      records_skipped: recordsSkipped,
      error_message: err.message
    });
    return { source: source.name, parser_key: source.parser_key, status, records_found: recordsFound, records_created: recordsCreated, records_updated: recordsUpdated, records_skipped: recordsSkipped, error: err.message };
  }
}

async function runSource(base44, source, opts) {
  return await withTimeout(runSourceInner(base44, source, opts), SOURCE_TIMEOUT_MS, `Source sync ${source.name}`);
}

export default async function(req) {
  try {
    // Only enforce the X-Sync-Secret when TOURNAMENT_SYNC_SECRET is configured.
    // The Base44 scheduled-workflow invocation path has no inbound HTTP headers and
    // no secret to match, so when the secret is unset we skip the check entirely —
    // allowing the workflow to run while leaving direct external HTTP callers open
    // (there's no secret configured to protect against). When the secret IS set,
    // any direct external HTTP call must still supply the matching header.
    const expectedSecret = secrets.get('TOURNAMENT_SYNC_SECRET');
    if (expectedSecret) {
      const providedSecret = req.headers.get('x-sync-secret');
      if (!providedSecret || providedSecret !== expectedSecret) {
        return Response.json({ error: 'Unauthorized: missing or invalid X-Sync-Secret header.' }, { status: 401 });
      }
    }

    const url = new URL(req.url);
    const sourceParam = url.searchParams.get('source') || '';
    const stateFilter = (url.searchParams.get('state') || '').trim();
    const sportFilter = (url.searchParams.get('sport') || '').trim();
    const maxEvents = Math.max(1, Number(url.searchParams.get('max_events') || 150));
    const dryRun = (url.searchParams.get('dry_run') || 'false').toLowerCase() === 'true';

    const parserKeys = sourceParam
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    console.log(`Tournament sync config: source=${parserKeys.join(',') || 'all'}, state=${stateFilter || 'any'}, sport=${sportFilter || 'any'}, max_events=${maxEvents}, dry_run=${dryRun}`);

    const base44 = createClientFromRequest(req);
    const sources = await withTimeout(
      base44.asServiceRole.entities.TournamentSource.list('-created_date', 100),
      15000,
      'List TournamentSource'
    );

    const candidateSources = sources.filter(s =>
      s.sync_enabled &&
      s.sync_frequency === 'daily' &&
      s.events_url &&
      (!parserKeys.length || parserKeys.includes(s.parser_key))
    );

    console.log(`Candidate sources: ${candidateSources.map(s => `${s.name}(${s.parser_key})`).join(', ') || 'none'}`);

    const geoState = { cache: await loadGeoCache(base44), budgetUsed: 0 };
    const teamsState = { budgetUsed: 0 };

    const results = [];
    for (const source of candidateSources) {
      const result = await runSource(base44, source, { stateFilter, sportFilter, maxEvents, dryRun, geoState, teamsState });
      results.push(result);
      await sleep(REQUEST_DELAY_MS * 2);
    }

    const summary = {
      status: results.every(r => r.status === 'success') ? 'success' : (results.some(r => r.status === 'blocked') ? 'partial_blocked' : (results.some(r => r.status === 'failed') ? 'partial_failed' : 'success')),
      dry_run: dryRun,
      filters: {
        source: parserKeys,
        state: stateFilter || null,
        sport: sportFilter || null,
        max_events: maxEvents
      },
      sources_run: results.length,
      total_records_found: results.reduce((sum, r) => sum + (r.records_found || 0), 0),
      total_records_created: results.reduce((sum, r) => sum + (r.records_created || 0), 0),
      total_records_updated: results.reduce((sum, r) => sum + (r.records_updated || 0), 0),
      total_records_skipped: results.reduce((sum, r) => sum + (r.records_skipped || 0), 0),
      sources
    };

    return Response.json(summary);
  } catch (error) {
    console.error('tournament-sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}