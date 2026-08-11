# Tournament Daily Sync Setup

The daily tournament sync runner has been added to the project.

## Files

- `scripts/tournament-sync/daily-sync.mjs` — scheduled runner that reads enabled daily `TournamentSource` rows, fetches public tournament pages, parses records, upserts `Tournament` rows, and writes `TournamentSyncJob` logs.
- `scripts/tournament-sync/scrape-core.mjs` — source adapters and normalization/parsing helpers.
- `.github/workflows/daily-tournament-sync.yml` — GitHub Actions cron wrapper for a daily run.

## NPM scripts

```bash
npm run sync:tournaments
npm run sync:tournaments:dry-run
```

## Required secrets / environment variables

Set these in GitHub Actions secrets or the production scheduler environment:

- `BASE44_APP_ID`
- `BASE44_ACCESS_TOKEN`
- `BASE44_APP_BASE_URL` optional, depending on the Base44 deployment environment

Optional runtime controls:

- `MAX_EVENTS_PER_SOURCE` default `75`
- `REQUEST_DELAY_MS` default `1500`
- `DRY_RUN=true` for dry-run mode

## Schedule

The workflow currently runs daily at:

```yaml
cron: '15 10 * * *'
```

That is approximately early morning Central Time depending on daylight saving time.

## Safeguards

The runner:

- Uses one daily run per enabled source.
- Uses a delay between records.
- Preserves `source_url`, `source_system`, and `last_synced_at` on tournament records.
- Marks jobs as `blocked` if a source returns 401, 403, or 429.
- Does not attempt login bypass, CAPTCHA bypass, or anti-bot bypass.

## Current limitation

The parser is intentionally conservative. It can extract structured data, public event links, dates, costs, age divisions, classifications, and status hints from public pages, but each association may need a dedicated parser refinement after reviewing the live HTML structure.
