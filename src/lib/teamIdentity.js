// Shared team-identity rules for duplicate detection, used by both the coach
// onboarding form (live warning at creation time) and the admin dedup
// scanner (retroactive cleanup). Keeping this in one place means both always
// agree on what counts as "the same team."
//
// Identity = normalized base name + age division + state. Classification is
// deliberately NOT part of identity: it's common for one org to run both an
// "A team" and "B team" at the same age with different classifications —
// those are legitimately different teams, not duplicates.

const DIVISION_TOKENS = /\b(\d{1,2}u|major|aaa|aa|a|open)\b/gi;

export function normalizeTeamName(name = '') {
  return name.toLowerCase().replace(DIVISION_TOKENS, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function teamIdentityKey(team = {}) {
  const name = normalizeTeamName(team.name || '');
  const age = (team.age_division || '').trim().toUpperCase();
  const state = (team.state || '').trim().toUpperCase();
  return `${name}|${age}|${state}`;
}
