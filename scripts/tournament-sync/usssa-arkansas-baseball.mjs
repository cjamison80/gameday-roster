#!/usr/bin/env node

// Focused live-source test runner for GameDay Roster.
// Scope: USSSA Arkansas baseball tournaments only.
//
// Required env vars:
// - BASE44_APP_ID
// - BASE44_ACCESS_TOKEN
// - BASE44_APP_BASE_URL optional
//
// Optional overrides:
// - MAX_EVENTS_PER_SOURCE default 50
// - REQUEST_DELAY_MS default 1500

process.env.SOURCE_FILTER = process.env.SOURCE_FILTER || 'usssa';
process.env.STATE_FILTER = process.env.STATE_FILTER || 'AR';
process.env.DEFAULT_STATE = process.env.DEFAULT_STATE || 'AR';
process.env.SPORT_FILTER = process.env.SPORT_FILTER || 'baseball';
process.env.RUN_TYPE = process.env.RUN_TYPE || 'test';
process.env.MAX_EVENTS_PER_SOURCE = process.env.MAX_EVENTS_PER_SOURCE || '50';
process.env.REQUEST_DELAY_MS = process.env.REQUEST_DELAY_MS || '1500';

console.log('Starting focused tournament sync: USSSA Arkansas baseball');

await import('./daily-sync.mjs');
