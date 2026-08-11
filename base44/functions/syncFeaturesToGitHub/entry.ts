import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const REPO_REGEX = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const MAX_ERROR_LEN = 500;

function buildIssueBody(feat) {
  const lines = [];
  if (feat.description && feat.description.trim()) {
    lines.push(feat.description.trim());
    lines.push('');
    lines.push('---');
  }
  lines.push(`**Category:** ${feat.category || 'new_feature'}`);
  lines.push(`**Priority:** ${feat.priority || 'medium'}`);
  lines.push('');
  lines.push('_Synced automatically by GameDay Roster._');
  return lines.join('\n');
}

function buildLabels(feat) {
  const labels = Array.isArray(feat.labels) ? feat.labels.filter(Boolean) : [];
  return labels.length > 0 ? labels : undefined;
}

async function markRecord(base44, id, patch) {
  try {
    await base44.asServiceRole.entities.FeatureRequest.update(id, patch);
  } catch (e) {
    // Best-effort status write — the sync result is still returned to the caller.
  }
}

export default async function(req) {
  let base44;
  try {
    base44 = createClientFromRequest(req);
  } catch (e) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Scheduled workflows invoke this with no user session. If a real user is
  // calling it (e.g., from the admin dashboard), require the admin role.
  try {
    const authed = await base44.auth.isAuthenticated();
    if (authed) {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  } catch (e) {
    // No session — treat as scheduled/workflow invocation.
  }

  try {
    const pending = await base44.asServiceRole.entities.FeatureRequest.filter(
      { status: 'pending_sync' },
      '-created_date',
      100
    );

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('github');

    let synced = 0;
    let failed = 0;
    let skipped = 0;
    const errors = [];

    for (const feat of pending) {
      const repo = (feat.github_repo || '').trim();
      if (!repo) {
        skipped++;
        await markRecord(base44, feat.id, {
          status: 'skipped',
          github_sync_error: 'No github_repo set on this FeatureRequest record'
        });
        continue;
      }
      if (!REPO_REGEX.test(repo)) {
        failed++;
        const reason = `Invalid repo format: ${repo}`;
        errors.push({ id: feat.id, reason });
        await markRecord(base44, feat.id, { status: 'failed', github_sync_error: reason.slice(0, MAX_ERROR_LEN) });
        continue;
      }

      const issueBody = {
        title: feat.title,
        body: buildIssueBody(feat)
      };
      const labels = buildLabels(feat);
      if (labels) issueBody.labels = labels;

      try {
        const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
            'User-Agent': 'gameday-roster-sync'
          },
          body: JSON.stringify(issueBody)
        });

        if (!res.ok) {
          const errText = await res.text();
          failed++;
          const reason = `GitHub API ${res.status}: ${errText}`.slice(0, MAX_ERROR_LEN);
          errors.push({ id: feat.id, repo, reason });
          await markRecord(base44, feat.id, { status: 'failed', github_sync_error: reason });
          continue;
        }

        const issue = await res.json();
        synced++;
        await markRecord(base44, feat.id, {
          status: 'synced',
          github_issue_number: issue.number,
          github_issue_url: issue.html_url,
          github_synced_at: new Date().toISOString(),
          github_sync_error: ''
        });
      } catch (err) {
        failed++;
        const reason = String(err && err.message ? err.message : err).slice(0, MAX_ERROR_LEN);
        errors.push({ id: feat.id, repo, reason });
        await markRecord(base44, feat.id, { status: 'failed', github_sync_error: reason });
      }
    }

    return Response.json({
      ok: true,
      processed: pending.length,
      synced,
      failed,
      skipped,
      errors: errors.slice(0, 20)
    });
  } catch (err) {
    return Response.json({ error: String(err && err.message ? err.message : err) }, { status: 500 });
  }
}