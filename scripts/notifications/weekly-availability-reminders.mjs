#!/usr/bin/env node

import { createClient } from '@base44/sdk';

const APP_ID = process.env.BASE44_APP_ID || process.env.VITE_BASE44_APP_ID;
const ADMIN_EMAIL = process.env.BASE44_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.BASE44_ADMIN_PASSWORD;
const APP_BASE_URL = process.env.BASE44_APP_BASE_URL || process.env.VITE_BASE44_APP_BASE_URL || 'https://gameday-roster-hub.base44.app';
const API_BASE_URL = process.env.BASE44_API_BASE_URL || APP_BASE_URL;
const DRY_RUN = process.env.DRY_RUN === 'true';
const REMINDER_WEEKDAY = process.env.REMINDER_WEEKDAY || 'Wednesday';

if (!APP_ID) {
  console.error('Missing BASE44_APP_ID.');
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing BASE44_ADMIN_EMAIL / BASE44_ADMIN_PASSWORD.');
  process.exit(1);
}

const base44 = createClient({
  appId: APP_ID,
  appBaseUrl: APP_BASE_URL,
  requiresAuth: false,
  serverUrl: API_BASE_URL
});

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

function weekendRangeFromWeekStart(weekStart) {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const friday = new Date(start); friday.setUTCDate(start.getUTCDate() + 4);
  const sunday = new Date(start); sunday.setUTCDate(start.getUTCDate() + 6);
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${fmt.format(friday)} – ${fmt.format(sunday)}`;
}

async function main() {
  console.log(`Weekly availability reminder run starting for ${REMINDER_WEEKDAY}.`);
  const { user } = await base44.auth.loginViaEmailPassword(ADMIN_EMAIL.trim(), ADMIN_PASSWORD.trim());
  if (user?.role !== 'admin') {
    throw new Error(`Logged in user must be admin. Current role: ${user?.role || 'unknown'}`);
  }

  const weekStart = getWeekStart();
  const weekendRange = weekendRangeFromWeekStart(weekStart);
  const profiles = await base44.entities.UserProfile.list('-created_date', 500);
  const parentProfiles = profiles.filter(profile =>
    ['parent', 'coach'].includes(profile.role || 'parent') &&
    profile.availability_reminders !== false &&
    profile.system_notifications !== false
  );

  let created = 0;
  let skipped = 0;

  for (const profile of parentProfiles) {
    try {
      const players = await base44.entities.PlayerProfile.filter({ parent_id: profile.user_id }, '-created_date', 20);
      if (!players.length) { skipped += 1; continue; }

      const availabilityRows = await base44.entities.Availability.filter({ parent_id: profile.user_id, week_start: weekStart }, '-created_date', 20);
      const coveredPlayerIds = new Set(availabilityRows.map(row => row.player_id));
      const needsCheckin = players.filter(player => !coveredPlayerIds.has(player.id));
      if (!needsCheckin.length) { skipped += 1; continue; }

      const existing = await base44.entities.Notification.filter({
        user_id: profile.user_id,
        type: 'availability_reminder',
        related_id: weekStart
      }, '-created_date', 1);
      if (existing.length) { skipped += 1; continue; }

      const playerLabel = needsCheckin.length === 1
        ? `${needsCheckin[0].first_name || 'Your player'} ${needsCheckin[0].last_name || ''}`.trim()
        : `${needsCheckin.length} players`;

      if (DRY_RUN) {
        console.log(`[dry-run] Would remind ${profile.user_id} for ${playerLabel}`);
      } else {
        await base44.entities.Notification.create({
          user_id: profile.user_id,
          type: 'availability_reminder',
          title: 'Set weekend availability',
          body: `${playerLabel} still needs availability for ${weekendRange}.`,
          related_id: weekStart,
          related_type: 'availability_week',
          action_url: '/activity',
          priority: 'normal',
          channel: 'in_app',
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString(),
          metadata: { week_start: weekStart, player_count: needsCheckin.length }
        });
      }
      created += 1;
    } catch (err) {
      skipped += 1;
      console.warn(`Skipped profile ${profile.user_id}: ${err.message}`);
    }
  }

  console.log(`Weekly availability reminders complete. created=${created}, skipped=${skipped}, week_start=${weekStart}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
