# Tournament Daily Sync Setup

The daily tournament sync runner has been added to the project.

## Files

- `scripts/tournament-sync/daily-sync.mjs` — scheduled runner that reads enabled daily `TournamentSource` rows, fetches public tournament pages, parses records, upserts `Tournament` rows, and writes `TournamentSyncJob` logs.
- `scripts/tournament-sync/scrape-core.mjs` — source adapters and normalization/parsing helpers.
- `.github/workflows/daily-tournament-sync.yml` — GitHub Actions cron wrapper for a daily run.

## NPM scripts

```bash
npm run sync:tournaments
npm run sync:tournaments:usssa-ar
npm run sync:tournaments:dry-run
```

## First live-source test: USSSA Arkansas baseball

Use this focused runner before enabling broader tournament sync:

```bash
npm run sync:tournaments:usssa-ar
```

This run sets:

- `SOURCE_FILTER=usssa`
- `STATE_FILTER=AR`
- `DEFAULT_STATE=AR`
- `SPORT_FILTER=baseball`
- `RUN_TYPE=test`
- `MAX_EVENTS_PER_SOURCE=50` by default

The matching GitHub Actions workflow is:

```text
.github/workflows/usssa-arkansas-tournament-test.yml
```

Trigger it manually from GitHub Actions after the Base44 secrets are configured.

## Required secrets / environment variables

Set these in GitHub Actions secrets or the production scheduler environment:

- `BASE44_APP_ID`
- `BASE44_ACCESS_TOKEN`
- `BASE44_APP_BASE_URL` optional, depending on the Base44 deployment environment

Optional runtime controls:

- `SOURCE_FILTER` comma-separated parser keys, for example `usssa`
- `STATE_FILTER` for focused tests, for example `AR`
- `DEFAULT_STATE` to apply when a source page is already scoped but parsed records do not include a state
- `SPORT_FILTER` for focused tests, for example `baseball`
- `RUN_TYPE` default `scheduled`, use `test` for one-off validation runs
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
