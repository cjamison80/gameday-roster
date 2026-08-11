#!/usr/bin/env node

// Focused live-source test runner for GameDay Roster.
// Scope: USSSA Arkansas baseball tournaments only.

process.env.SOURCE_FILTER = process.env.SOURCE_FILTER || 'usssa';
process.env.STATE_FILTER = process.env.STATE_FILTER || 'AR';
process.env.DEFAULT_STATE = process.env.DEFAULT_STATE || 'AR';
process.env.SPORT_FILTER = process.env.SPORT_FILTER || 'baseball';
process.env.RUN_TYPE = process.env.RUN_TYPE || 'test';
process.env.MAX_EVENTS_PER_SOURCE = process.env.MAX_EVENTS_PER_SOURCE || '5';
process.env.REQUEST_DELAY_MS = process.env.REQUEST_DELAY_MS || '250';
process.env.FETCH_TIMEOUT_MS = process.env.FETCH_TIMEOUT_MS || '15000';
process.env.SOURCE_TIMEOUT_MS = process.env.SOURCE_TIMEOUT_MS || '120000';

console.log('Starting focused tournament sync: USSSA Arkansas baseball');

await import('./daily-sync.mjs');
