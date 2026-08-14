import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Briefcase,
  Building2,
  CheckCircle,
  ChevronRight,
  Copy,
  CreditCard,
  Database,
  DollarSign,
  Eye,
  Flag,
  Megaphone,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
  XCircle,
  Zap
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { teamIdentityKey } from '@/lib/teamIdentity';
import { formatMoney } from '@/lib/subscription';

const ADMIN_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'verifications', label: 'Verifications' },
  { id: 'reports', label: 'Reports' },
  { id: 'billing', label: 'Billing' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'sync', label: 'Sync Health' },
  { id: 'duplicates', label: 'Duplicates' },
  { id: 'requests', label: 'Requests' }
];

const REPORT_STATUS_STYLES = {
  open: { label: 'Open', bg: '#FEE2E2', color: '#991B1B' },
  reviewing: { label: 'Reviewing', bg: '#FEF9C3', color: '#A16207' },
  resolved: { label: 'Resolved', bg: '#DCFCE7', color: '#166534' },
  dismissed: { label: 'Dismissed', bg: '#EEF2F7', color: '#475569' }
};

const SUBSCRIPTION_STATUS_STYLES = {
  active: { bg: '#DCFCE7', color: '#166534' },
  trialing: { bg: '#EFF6FF', color: '#1D4ED8' },
  past_due: { bg: '#FEF9C3', color: '#A16207' },
  canceled: { bg: '#EEF2F7', color: '#475569' },
  incomplete: { bg: '#FEE2E2', color: '#991B1B' },
  expired: { bg: '#FEE2E2', color: '#991B1B' },
  free: { bg: '#F1F5F9', color: '#475569' }
};

function money(cents = 0, currency = 'USD') {
  if (!cents) return '$0';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(cents) / 100);
  } catch {
    return formatMoney(cents);
  }
}

function countBy(rows = [], field, value) {
  return rows.filter(row => row?.[field] === value).length;
}

function initials(name = '') {
  return String(name || '?').split(' ').filter(Boolean).map(x => x[0]).join('').slice(0, 3).toUpperCase() || '?';
}

function dateLabel(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [authorized, setAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [mergingKey, setMergingKey] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [broadcast, setBroadcast] = useState({ audience: 'all', title: '', body: '', priority: 'normal' });
  const [broadcastResult, setBroadcastResult] = useState('');

  const [data, setData] = useState({
    users: [],
    userProfiles: [],
    players: [],
    coaches: [],
    orgs: [],
    teams: [],
    opportunities: [],
    applications: [],
    reports: [],
    subscriptions: [],
    billingEvents: [],
    notifications: [],
    tournamentSources: [],
    syncJobs: [],
    featureRequests: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const safeList = async (entityName, sort = '-created_date', limit = 500) => {
    try {
      const entity = base44.entities[entityName];
      if (!entity?.list) return [];
      return await entity.list(sort, limit);
    } catch (e) {
      console.warn(`Admin dashboard could not load ${entityName}`, e?.message || e);
      return [];
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id }).catch(() => []);
      const isAdmin = user?.role === 'admin' || profiles[0]?.role === 'admin';
      if (!isAdmin) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      setAdminUser(user);

      const [
        users,
        userProfiles,
        players,
        coaches,
        orgs,
        teams,
        opportunities,
        applications,
        reports,
        subscriptions,
        billingEvents,
        notifications,
        tournamentSources,
        syncJobs,
        featureRequests
      ] = await Promise.all([
        safeList('User', '-created_date', 1000),
        safeList('UserProfile', '-created_date', 1000),
        safeList('PlayerProfile', '-created_date', 1000),
        safeList('CoachProfile', '-created_date', 1000),
        safeList('Organization', '-created_date', 1000),
        safeList('Team', '-created_date', 1000),
        safeList('Opportunity', '-created_date', 1000),
        safeList('Application', '-created_date', 1000),
        safeList('Report', '-created_date', 250),
        safeList('UserSubscription', '-created_date', 1000),
        safeList('BillingEvent', '-created_date', 250),
        safeList('Notification', '-created_date', 250),
        safeList('TournamentSource', '-created_date', 100),
        safeList('TournamentSyncJob', '-created_date', 100),
        safeList('FeatureRequest', '-created_date', 100)
      ]);

      setData({ users, userProfiles, players, coaches, orgs, teams, opportunities, applications, reports, subscriptions, billingEvents, notifications, tournamentSources, syncJobs, featureRequests });
    } catch (e) {
      console.error(e);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const pendingCoaches = data.coaches.filter(c => c.verification_status === 'pending');
  const pendingOrgs = data.orgs.filter(o => o.verification_status === 'pending');
  const pendingTeams = data.teams.filter(t => t.verification_status === 'pending');
  const pendingVerificationCount = pendingCoaches.length + pendingOrgs.length + pendingTeams.length;
  const openReports = data.reports.filter(r => ['open', 'reviewing'].includes(r.status || 'open'));
  const unreadNotifications = data.notifications.filter(n => !n.is_read).length;
  const activePaidSubscriptions = data.subscriptions.filter(s => ['active', 'trialing'].includes(s.status) && s.plan_code && !String(s.plan_code).includes('free'));
  const pastDueSubscriptions = data.subscriptions.filter(s => ['past_due', 'incomplete', 'expired'].includes(s.status));
  const recentFailedSyncs = data.syncJobs.filter(j => ['failed', 'blocked'].includes(j.status)).slice(0, 8);
  const recentPayments = data.billingEvents.filter(e => e.event_type === 'payment_succeeded');
  const revenueCents = recentPayments.reduce((sum, event) => sum + Number(event.amount_cents || 0), 0);

  const duplicateClusters = useMemo(() => {
    const groups = new Map();
    for (const team of data.teams) {
      const key = teamIdentityKey(team);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(team);
    }
    return [...groups.entries()].filter(([, group]) => group.length > 1);
  }, [data.teams]);

  const userNameById = useMemo(() => {
    const map = {};
    data.users.forEach(user => { map[user.id] = user.full_name || user.email || user.id; });
    data.userProfiles.forEach(profile => { if (!map[profile.user_id]) map[profile.user_id] = profile.full_name || profile.email || profile.user_id; });
    return map;
  }, [data.users, data.userProfiles]);

  const updateCoachStatus = async (coach, status) => {
    setBusyId(coach.id);
    try {
      await base44.entities.CoachProfile.update(coach.id, { verification_status: status, is_verified: status === 'verified' });
      if (coach.user_id) {
        await base44.entities.Notification.create({
          user_id: coach.user_id,
          type: 'verification_update',
          title: status === 'verified' ? 'Coach profile verified' : 'Coach verification rejected',
          body: status === 'verified' ? 'Your coach profile has been verified.' : 'Your coach profile could not be verified yet.',
          related_id: coach.id,
          related_type: 'coach',
          action_url: `/coach/${coach.id}`,
          priority: status === 'verified' ? 'normal' : 'high',
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString()
        }).catch(() => null);
      }
      setData(prev => ({ ...prev, coaches: prev.coaches.map(c => c.id === coach.id ? { ...c, verification_status: status, is_verified: status === 'verified' } : c) }));
    } finally {
      setBusyId('');
    }
  };

  const updateTeamStatus = async (team, status) => {
    setBusyId(team.id);
    try {
      await base44.entities.Team.update(team.id, { verification_status: status, is_verified: status === 'verified' });
      if (team.head_coach_id) {
        await base44.entities.Notification.create({
          user_id: team.head_coach_id,
          type: 'verification_update',
          title: status === 'verified' ? 'Team verified' : 'Team verification rejected',
          body: status === 'verified' ? `${team.name} has been verified.` : `${team.name} could not be verified yet.`,
          related_id: team.id,
          related_type: 'team',
          action_url: `/team/${team.id}`,
          priority: status === 'verified' ? 'normal' : 'high',
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString()
        }).catch(() => null);
      }
      setData(prev => ({ ...prev, teams: prev.teams.map(t => t.id === team.id ? { ...t, verification_status: status, is_verified: status === 'verified' } : t) }));
    } finally {
      setBusyId('');
    }
  };

  const updateOrgStatus = async (org, status) => {
    setBusyId(org.id);
    try {
      await base44.entities.Organization.update(org.id, { verification_status: status, is_verified: status === 'verified' });
      if (org.owner_id) {
        await base44.entities.Notification.create({
          user_id: org.owner_id,
          type: 'verification_update',
          title: status === 'verified' ? 'Organization verified' : 'Organization verification rejected',
          body: status === 'verified' ? `${org.name} has been verified.` : `${org.name} could not be verified yet.`,
          related_id: org.id,
          related_type: 'organization',
          action_url: `/organization/${org.id}`,
          priority: status === 'verified' ? 'normal' : 'high',
          delivery_status: 'delivered',
          delivered_at: new Date().toISOString()
        }).catch(() => null);
      }
      setData(prev => ({ ...prev, orgs: prev.orgs.map(o => o.id === org.id ? { ...o, verification_status: status, is_verified: status === 'verified' } : o) }));
    } finally {
      setBusyId('');
    }
  };

  const updateReportStatus = async (report, status) => {
    setBusyId(report.id);
    try {
      const patch = {
        status,
        ...(status === 'resolved' || status === 'dismissed'
          ? { resolved_at: new Date().toISOString(), resolved_by_user_id: adminUser?.id || '', action_taken: status }
          : {})
      };
      const updated = await base44.entities.Report.update(report.id, patch);
      setData(prev => ({ ...prev, reports: prev.reports.map(r => r.id === report.id ? updated : r) }));
    } finally {
      setBusyId('');
    }
  };

  const keepTeam = async (clusterKey, keeperId, allIdsInCluster) => {
    const others = allIdsInCluster.filter(id => id !== keeperId);
    if (!window.confirm(`Keep this team and permanently delete the other ${others.length}? This cannot be undone.`)) return;
    setMergingKey(clusterKey);
    try {
      await base44.entities.Team.update(keeperId, { verification_status: 'verified', is_verified: true });
      for (const id of others) await base44.entities.Team.delete(id);
      setData(prev => ({
        ...prev,
        teams: prev.teams.filter(t => !others.includes(t.id)).map(t => t.id === keeperId ? { ...t, verification_status: 'verified', is_verified: true } : t)
      }));
    } catch (e) {
      console.error(e);
      alert('Something went wrong merging this cluster. Check the console.');
    } finally {
      setMergingKey(null);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcast.title.trim()) return;
    setBroadcastResult('Sending...');
    const targetProfiles = data.userProfiles.filter(profile => broadcast.audience === 'all' || profile.role === broadcast.audience);
    const targetIds = [...new Set(targetProfiles.map(profile => profile.user_id).filter(Boolean))];
    try {
      await Promise.all(targetIds.map(userId => base44.entities.Notification.create({
        user_id: userId,
        type: 'system',
        title: broadcast.title.trim(),
        body: broadcast.body.trim(),
        priority: broadcast.priority,
        related_type: 'admin_broadcast',
        action_url: '/activity',
        source_user_id: adminUser?.id || '',
        delivery_status: 'delivered',
        delivered_at: new Date().toISOString(),
        metadata: { audience: broadcast.audience }
      }).catch(() => null)));
      setBroadcastResult(`Sent to ${targetIds.length} users.`);
      setBroadcast({ audience: 'all', title: '', body: '', priority: 'normal' });
      await loadData();
    } catch (e) {
      console.error(e);
      setBroadcastResult('Broadcast failed.');
    }
  };

  const tabBadges = {
    verifications: pendingVerificationCount,
    reports: openReports.length,
    billing: pastDueSubscriptions.length,
    notifications: unreadNotifications,
    sync: recentFailedSyncs.length,
    duplicates: duplicateClusters.length,
    requests: data.featureRequests.filter(r => ['pending_sync', 'failed'].includes(r.status)).length
  };

  if (authorized === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-black" style={{ color: '#0B1528' }}>Admin access only</h1>
        <p className="text-sm mt-2" style={{ color: '#64748B' }}>You do not have permission to view the admin dashboard.</p>
        <button onClick={() => navigate('/discover')} className="mt-6 px-5 py-3 rounded-2xl font-bold text-white" style={{ backgroundColor: '#C1121F' }}>
          Back to Discover
        </button>
      </div>
    );
  }

  return (
    <div className="gdr-page pb-24">
      <div className="gdr-hero px-5 pt-14 pb-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2">
              <ArrowLeft size={24} color="white" />
            </button>
            <div>
              <p className="gdr-editorial-kicker mb-1">GameDay Ops</p>
              <h1 className="text-3xl font-black text-white tracking-[-0.05em]">Admin Dashboard</h1>
            </div>
          </div>
          <button onClick={loadData} disabled={loading} className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#17233A' }}>
            <RefreshCw size={18} color="#CBD5E1" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {(pendingVerificationCount > 0 || openReports.length > 0 || recentFailedSyncs.length > 0) && (
          <div className="gdr-glass p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle size={20} color="#FCA5A5" className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-black text-white text-sm">Admin attention needed</p>
              <p className="text-xs mt-1" style={{ color: '#CBD5E1' }}>
                {pendingVerificationCount} verifications · {openReports.length} open reports · {recentFailedSyncs.length} sync issues
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-b border-gray-100 overflow-x-auto no-scrollbar">
        <div className="flex px-5 min-w-max">
          {ADMIN_TABS.map(tab => {
            const badge = tabBadges[tab.id] || 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="py-4 mr-6 text-sm font-black uppercase tracking-[0.08em] border-b-2 transition-colors flex items-center gap-1.5"
                style={{ color: activeTab === tab.id ? '#C1121F' : '#94A3B8', borderColor: activeTab === tab.id ? '#C1121F' : 'transparent' }}
              >
                {tab.label}
                {badge > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] text-white" style={{ backgroundColor: tab.id === 'sync' || tab.id === 'reports' ? '#DC2626' : '#C1121F' }}>{badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <main className="px-5 py-5 space-y-5">
        {activeTab === 'overview' && (
          <OverviewTab
            loading={loading}
            stats={{
              users: data.users.length || data.userProfiles.length,
              players: data.players.length,
              coaches: data.coaches.length,
              orgs: data.orgs.length,
              teams: data.teams.length,
              opportunities: data.opportunities.length,
              applications: data.applications.length,
              paid: activePaidSubscriptions.length,
              revenueCents,
              reports: openReports.length,
              failedSyncs: recentFailedSyncs.length
            }}
            navigate={navigate}
          />
        )}

        {activeTab === 'verifications' && (
          <VerificationsTab
            coaches={pendingCoaches}
            orgs={pendingOrgs}
            teams={pendingTeams}
            busyId={busyId}
            onCoach={(coach, status) => updateCoachStatus(coach, status)}
            onOrg={(org, status) => updateOrgStatus(org, status)}
            onTeam={(team, status) => updateTeamStatus(team, status)}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab reports={data.reports} busyId={busyId} onStatus={updateReportStatus} navigate={navigate} userNameById={userNameById} />
        )}

        {activeTab === 'billing' && (
          <BillingTab subscriptions={data.subscriptions} events={data.billingEvents} userNameById={userNameById} navigate={navigate} />
        )}

        {activeTab === 'notifications' && (
          <NotificationsTab notifications={data.notifications} broadcast={broadcast} setBroadcast={setBroadcast} sendBroadcast={sendBroadcast} result={broadcastResult} userProfiles={data.userProfiles} />
        )}

        {activeTab === 'sync' && (
          <SyncTab sources={data.tournamentSources} jobs={data.syncJobs} navigate={navigate} />
        )}

        {activeTab === 'duplicates' && (
          <DuplicatesTab clusters={duplicateClusters} keepTeam={keepTeam} mergingKey={mergingKey} />
        )}

        {activeTab === 'requests' && (
          <RequestsTab requests={data.featureRequests} />
        )}
      </main>
    </div>
  );
}

function OverviewTab({ loading, stats, navigate }) {
  const cards = [
    { icon: Users, label: 'Users', value: stats.users, sub: 'Registered accounts', color: '#0B1528', bg: '#EEF2F7' },
    { icon: Trophy, label: 'Players', value: stats.players, sub: 'Player profiles', color: '#C1121F', bg: '#FEE2E2' },
    { icon: Briefcase, label: 'Coaches', value: stats.coaches, sub: 'Coach profiles', color: '#166534', bg: '#DCFCE7' },
    { icon: Building2, label: 'Organizations', value: stats.orgs, sub: 'Org profiles', color: '#1D4ED8', bg: '#EFF6FF' },
    { icon: ShieldCheck, label: 'Teams', value: stats.teams, sub: 'Team profiles', color: '#7C2D12', bg: '#FFEDD5' },
    { icon: Zap, label: 'Applications', value: stats.applications, sub: 'Submitted apps', color: '#A16207', bg: '#FEF9C3' }
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {cards.map(card => <StatCard key={card.label} {...card} value={loading ? '—' : card.value} />)}
      </div>

      <div className="grid grid-cols-1 gap-3">
        <AdminActionCard icon={CreditCard} title="Subscription Revenue" value={money(stats.revenueCents)} sub={`${stats.paid} active paid subscriptions`} onClick={() => navigate('/billing')} />
        <AdminActionCard icon={Flag} title="Open Reports" value={stats.reports} sub="Safety and moderation queue" danger={stats.reports > 0} />
        <AdminActionCard icon={Database} title="Tournament Sources" value={stats.failedSyncs > 0 ? `${stats.failedSyncs} issues` : 'Healthy'} sub="Manage source permissions, sync readiness and import jobs" danger={stats.failedSyncs > 0} onClick={() => navigate('/admin/tournament-sources')} />
      </div>
    </div>
  );
}

function VerificationsTab({ coaches, orgs, teams, busyId, onCoach, onOrg, onTeam }) {
  const empty = coaches.length === 0 && orgs.length === 0 && teams.length === 0;
  if (empty) return <EmptyState icon="✅" title="All caught up" body="No pending verifications." />;
  return (
    <div className="space-y-4">
      <SectionHeader title="Verification Queue" body="Review coaches, organizations, and teams before applying verified trust badges." />
      {teams.map(team => (
        <VerificationCard key={team.id} title={team.name} subtitle={[team.age_division, team.classification, team.city ? `${team.city}, ${team.state}` : team.state].filter(Boolean).join(' · ')} type="Team" note={team.duplicate_flag_note} busy={busyId === team.id} onApprove={() => onTeam(team, 'verified')} onReject={() => onTeam(team, 'rejected')} />
      ))}
      {coaches.map(coach => (
        <VerificationCard key={coach.id} title={`${coach.first_name || ''} ${coach.last_name || ''}`.trim() || 'Coach'} subtitle={[coach.city, coach.state].filter(Boolean).join(', ')} type="Coach" busy={busyId === coach.id} onApprove={() => onCoach(coach, 'verified')} onReject={() => onCoach(coach, 'rejected')} />
      ))}
      {orgs.map(org => (
        <VerificationCard key={org.id} title={org.name} subtitle={[org.city, org.state].filter(Boolean).join(', ')} type="Organization" busy={busyId === org.id} onApprove={() => onOrg(org, 'verified')} onReject={() => onOrg(org, 'rejected')} />
      ))}
    </div>
  );
}

function ReportsTab({ reports, busyId, onStatus, navigate, userNameById }) {
  if (!reports.length) return <EmptyState icon="🛡️" title="No reports yet" body="Safety, content, and abuse reports will appear here." />;
  return (
    <div className="space-y-4">
      <SectionHeader title="Moderation Reports" body="Prioritize minor safety, harassment, fake profiles, inappropriate content, and inaccurate opportunity reports." />
      {reports.map(report => {
        const status = REPORT_STATUS_STYLES[report.status || 'open'] || REPORT_STATUS_STYLES.open;
        return (
          <div key={report.id} className="gdr-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black px-2 py-1 uppercase tracking-[0.14em]" style={{ backgroundColor: status.bg, color: status.color }}>{status.label}</span>
                  <span className="text-[10px] font-black px-2 py-1 uppercase tracking-[0.14em]" style={{ backgroundColor: '#EEF2F7', color: '#475569' }}>{report.category || 'other'}</span>
                  {report.priority === 'urgent' || report.priority === 'high' ? <span className="text-[10px] font-black px-2 py-1 uppercase tracking-[0.14em]" style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>{report.priority}</span> : null}
                </div>
                <h3 className="font-black mt-3" style={{ color: '#0B1528' }}>{report.title}</h3>
                <p className="text-sm mt-1" style={{ color: '#64748B' }}>{report.description || 'No description provided.'}</p>
                <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>
                  Target: {report.target_type || 'other'} {report.target_id ? `· ${report.target_id.slice(-8)}` : ''} · Reporter: {userNameById[report.reporter_user_id] || 'Unknown'} · {dateLabel(report.created_date)}
                </p>
              </div>
              {report.target_id && (
                <button onClick={() => navigateForTarget(navigate, report.target_type, report.target_id)} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F1F5F9' }}>
                  <Eye size={16} color="#0B1528" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <AdminButton label="Review" disabled={busyId === report.id} onClick={() => onStatus(report, 'reviewing')} />
              <AdminButton label="Resolve" variant="success" disabled={busyId === report.id} onClick={() => onStatus(report, 'resolved')} />
              <AdminButton label="Dismiss" variant="muted" disabled={busyId === report.id} onClick={() => onStatus(report, 'dismissed')} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BillingTab({ subscriptions, events, userNameById }) {
  const active = subscriptions.filter(s => ['active', 'trialing'].includes(s.status));
  const issue = subscriptions.filter(s => ['past_due', 'incomplete', 'expired'].includes(s.status));
  const revenue = events.filter(e => e.event_type === 'payment_succeeded').reduce((sum, e) => sum + Number(e.amount_cents || 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MiniMetric label="Active" value={active.length} />
        <MiniMetric label="Issues" value={issue.length} danger={issue.length > 0} />
        <MiniMetric label="Revenue" value={money(revenue)} />
      </div>
      <SectionHeader title="Subscriptions" body="Review current plan status. Stripe remains the system of record for actual payment management." />
      {subscriptions.length === 0 ? <EmptyState icon="💳" title="No subscriptions yet" body="Paid or free subscription records will appear here." /> : subscriptions.slice(0, 40).map(sub => {
        const style = SUBSCRIPTION_STATUS_STYLES[sub.status] || SUBSCRIPTION_STATUS_STYLES.free;
        return (
          <div key={sub.id} className="gdr-card p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}><CreditCard size={19} color="#C1121F" /></div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black truncate" style={{ color: '#0B1528' }}>{sub.plan_name || sub.plan_code || 'Plan'}</h3>
              <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{userNameById[sub.user_id] || sub.user_id || 'Unknown user'} · {sub.billing_interval || 'none'} · renews {dateLabel(sub.next_invoice_at || sub.current_period_end)}</p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.12em] px-2.5 py-1" style={{ backgroundColor: style.bg, color: style.color }}>{sub.status || 'free'}</span>
          </div>
        );
      })}
      <SectionHeader title="Recent Billing Events" />
      {events.slice(0, 10).map(event => <EventRow key={event.id} event={event} userNameById={userNameById} />)}
    </div>
  );
}

function NotificationsTab({ notifications, broadcast, setBroadcast, sendBroadcast, result, userProfiles }) {
  const delivered = countBy(notifications, 'delivery_status', 'delivered');
  const failed = countBy(notifications, 'delivery_status', 'failed');
  const unread = notifications.filter(n => !n.is_read).length;
  const audienceCount = broadcast.audience === 'all'
    ? new Set(userProfiles.map(p => p.user_id).filter(Boolean)).size
    : new Set(userProfiles.filter(p => p.role === broadcast.audience).map(p => p.user_id).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MiniMetric label="Delivered" value={delivered} />
        <MiniMetric label="Unread" value={unread} />
        <MiniMetric label="Failed" value={failed} danger={failed > 0} />
      </div>

      <div className="gdr-card p-5 space-y-4">
        <SectionHeader title="Send Broadcast" body="Creates an in-app system notification for the selected audience." compact />
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Audience" value={broadcast.audience} onChange={v => setBroadcast(prev => ({ ...prev, audience: v }))} options={[['all', 'All users'], ['parent', 'Parents'], ['coach', 'Coaches'], ['organization', 'Organizations'], ['admin', 'Admins']]} />
          <SelectField label="Priority" value={broadcast.priority} onChange={v => setBroadcast(prev => ({ ...prev, priority: v }))} options={[['low', 'Low'], ['normal', 'Normal'], ['high', 'High'], ['urgent', 'Urgent']]} />
        </div>
        <InputField label="Title" value={broadcast.title} onChange={v => setBroadcast(prev => ({ ...prev, title: v }))} placeholder="Example: New tournament finder update" />
        <TextAreaField label="Message" value={broadcast.body} onChange={v => setBroadcast(prev => ({ ...prev, body: v }))} placeholder="Write the notification body..." />
        <button onClick={sendBroadcast} disabled={!broadcast.title.trim()} className="w-full py-3.5 rounded-2xl font-black text-white uppercase tracking-[0.14em] text-xs disabled:opacity-50" style={{ backgroundColor: '#C1121F' }}>
          Send to {audienceCount} users
        </button>
        {result && <p className="text-sm font-semibold" style={{ color: '#64748B' }}>{result}</p>}
      </div>

      <SectionHeader title="Recent Notifications" />
      {notifications.slice(0, 20).map(n => (
        <div key={n.id} className="gdr-card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: n.is_read ? '#F1F5F9' : '#FEE2E2' }}><Bell size={17} color={n.is_read ? '#64748B' : '#C1121F'} /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><h3 className="font-black text-sm" style={{ color: '#0B1528' }}>{n.title}</h3><span className="text-[10px] uppercase font-black" style={{ color: '#94A3B8' }}>{n.type}</span></div>
            <p className="text-sm mt-1" style={{ color: '#64748B' }}>{n.body || 'No body'}</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{dateLabel(n.created_date)} · {n.delivery_status || 'delivered'} · {n.is_read ? 'read' : 'unread'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function SyncTab({ sources, jobs, navigate }) {
  const enabled = sources.filter(s => s.sync_enabled).length;
  const failed = jobs.filter(j => ['failed', 'blocked'].includes(j.status));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <MiniMetric label="Sources" value={sources.length} />
        <MiniMetric label="Enabled" value={enabled} />
        <MiniMetric label="Issues" value={failed.length} danger={failed.length > 0} />
      </div>
      <button onClick={() => navigate('/admin/tournament-sources')} className="w-full gdr-card p-4 flex items-center gap-3 text-left">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}><Database size={20} color="#1D4ED8" /></div>
        <div className="flex-1"><h3 className="font-black" style={{ color: '#0B1528' }}>Open Tournament Source Manager</h3><p className="text-sm" style={{ color: '#64748B' }}>Permissions, source readiness, and recent sync jobs</p></div>
        <ChevronRight size={18} color="#94A3B8" />
      </button>
      <SectionHeader title="Recent Sync Jobs" />
      {jobs.length === 0 ? <EmptyState icon="📡" title="No sync jobs yet" body="Tournament sync jobs will appear after scheduled or manual runs." /> : jobs.slice(0, 30).map(job => (
        <div key={job.id} className="gdr-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: ['failed', 'blocked'].includes(job.status) ? '#FEE2E2' : '#EEF2F7' }}><Database size={17} color={['failed', 'blocked'].includes(job.status) ? '#C1121F' : '#0B1528'} /></div>
          <div className="flex-1 min-w-0"><h3 className="font-black truncate" style={{ color: '#0B1528' }}>{job.source_name || 'Source'}</h3><p className="text-xs" style={{ color: '#64748B' }}>{job.association} · {job.run_type || 'manual'} · found {job.records_found || 0}, created {job.records_created || 0}</p>{job.error_message && <p className="text-xs mt-1" style={{ color: '#C1121F' }}>{job.error_message}</p>}</div>
          <span className="text-[10px] font-black uppercase px-2 py-1" style={{ backgroundColor: job.status === 'success' ? '#DCFCE7' : ['failed', 'blocked'].includes(job.status) ? '#FEE2E2' : '#FEF9C3', color: job.status === 'success' ? '#166534' : ['failed', 'blocked'].includes(job.status) ? '#991B1B' : '#A16207' }}>{job.status}</span>
        </div>
      ))}
    </div>
  );
}

function DuplicatesTab({ clusters, keepTeam, mergingKey }) {
  if (!clusters.length) return <EmptyState icon="✅" title="No duplicates found" body="Every team has a unique name + age division + state." />;
  return (
    <div className="space-y-4">
      <SectionHeader title="Possible Duplicate Teams" body="Grouped by name + age division + state — the same rule used during coach onboarding." />
      {clusters.map(([key, group]) => (
        <div key={key} className="gdr-card p-4">
          <div className="flex items-center gap-2 mb-3"><Copy size={16} color="#D97706" /><p className="text-sm font-black" style={{ color: '#92400E' }}>{group.length} teams look like the same team</p></div>
          <div className="space-y-2">
            {group.map(team => (
              <div key={team.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ backgroundColor: '#F8FAFC' }}>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="font-black truncate" style={{ color: '#0B1528' }}>{team.name}</p>{team.is_verified && <span className="text-xs font-black px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>Verified</span>}</div><p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{[team.age_division, team.classification, team.city ? `${team.city}, ${team.state}` : team.state, team.created_date ? `created ${dateLabel(team.created_date)}` : null].filter(Boolean).join(' · ')}</p></div>
                <button onClick={() => keepTeam(key, team.id, group.map(g => g.id))} disabled={mergingKey === key} className="px-3 py-2 rounded-xl text-xs font-black text-white disabled:opacity-50" style={{ backgroundColor: '#16A34A' }}>{mergingKey === key ? 'Working...' : 'Keep'}</button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestsTab({ requests }) {
  if (!requests.length) return <EmptyState icon="🧭" title="No requests yet" body="Feature and bug requests synced to GitHub will appear here." />;
  return (
    <div className="space-y-4">
      <SectionHeader title="Feature Requests" body="Track build requests and GitHub sync status." />
      {requests.map(req => (
        <div key={req.id} className="gdr-card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: req.status === 'failed' ? '#FEE2E2' : '#EEF2F7' }}><Megaphone size={17} color={req.status === 'failed' ? '#C1121F' : '#0B1528'} /></div>
          <div className="flex-1 min-w-0"><h3 className="font-black" style={{ color: '#0B1528' }}>{req.title}</h3><p className="text-sm mt-1" style={{ color: '#64748B' }}>{req.description || 'No description.'}</p><p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{req.category || 'request'} · {req.priority || 'medium'} · {req.status || 'pending'}</p>{req.github_issue_url && <a href={req.github_issue_url} target="_blank" rel="noopener noreferrer" className="text-xs font-black mt-2 inline-block" style={{ color: '#C1121F' }}>Open GitHub issue</a>}</div>
        </div>
      ))}
    </div>
  );
}

function navigateForTarget(navigate, type, id) {
  const map = {
    player: `/player/${id}`,
    coach: `/coach/${id}`,
    team: `/team/${id}`,
    organization: `/organization/${id}`,
    opportunity: `/opportunity/${id}`,
    tournament: `/tournament/${id}`
  };
  navigate(map[type] || '/admin');
}

function StatCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className="gdr-card p-4">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}><Icon size={20} color={color} /></div>
      <div className="text-3xl font-black tracking-[-0.05em]" style={{ color: '#0B1528' }}>{value}</div>
      <div className="font-black text-sm" style={{ color: '#0B1528' }}>{label}</div>
      <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{sub}</div>
    </div>
  );
}

function MiniMetric({ label, value, danger = false }) {
  return <div className="gdr-card p-3 text-center"><p className="text-2xl font-black tracking-[-0.04em]" style={{ color: danger ? '#C1121F' : '#0B1528' }}>{value}</p><p className="text-[10px] font-black uppercase tracking-[0.14em] mt-1" style={{ color: '#94A3B8' }}>{label}</p></div>;
}

function AdminActionCard({ icon: Icon, title, value, sub, danger = false, onClick }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper onClick={onClick} className="gdr-card w-full p-4 flex items-center gap-3 text-left">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: danger ? '#FEE2E2' : '#EEF2F7' }}><Icon size={21} color={danger ? '#C1121F' : '#0B1528'} /></div>
      <div className="flex-1"><p className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: '#94A3B8' }}>{title}</p><p className="text-xl font-black" style={{ color: danger ? '#C1121F' : '#0B1528' }}>{value}</p><p className="text-sm" style={{ color: '#64748B' }}>{sub}</p></div>
      {onClick && <ChevronRight size={18} color="#94A3B8" />}
    </Wrapper>
  );
}

function VerificationCard({ title, subtitle, type, note, busy, onApprove, onReject }) {
  return (
    <div className="gdr-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#EEF2F7' }}><span className="font-black" style={{ color: '#0B1528' }}>{initials(title)}</span></div>
        <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h3 className="font-black truncate" style={{ color: '#0B1528' }}>{title}</h3><span className="text-[10px] font-black uppercase px-2 py-1" style={{ backgroundColor: '#FEF9C3', color: '#A16207' }}>{type}</span></div><p className="text-sm" style={{ color: '#64748B' }}>{subtitle || 'Pending review'}</p></div>
      </div>
      {note && <p className="text-xs p-3 rounded-2xl" style={{ backgroundColor: '#F8FAFC', color: '#64748B' }}>{note}</p>}
      <div className="grid grid-cols-2 gap-2"><AdminButton label="Reject" variant="danger" disabled={busy} onClick={onReject} /><AdminButton label="Verify" variant="success" disabled={busy} onClick={onApprove} /></div>
    </div>
  );
}

function AdminButton({ label, variant = 'primary', disabled, onClick }) {
  const style = {
    primary: { backgroundColor: '#0B1528', color: '#FFFFFF', borderColor: '#0B1528' },
    success: { backgroundColor: '#16A34A', color: '#FFFFFF', borderColor: '#16A34A' },
    danger: { backgroundColor: '#FFFFFF', color: '#C1121F', borderColor: '#FCA5A5' },
    muted: { backgroundColor: '#EEF2F7', color: '#475569', borderColor: '#EEF2F7' }
  }[variant];
  return <button onClick={onClick} disabled={disabled} className="py-2.5 rounded-xl text-sm font-black border-2 disabled:opacity-50" style={style}>{disabled ? 'Working...' : label}</button>;
}

function EventRow({ event, userNameById }) {
  return <div className="gdr-card p-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-black text-sm truncate" style={{ color: '#0B1528' }}>{event.event_type}</p><p className="text-xs" style={{ color: '#64748B' }}>{userNameById[event.user_id] || event.user_id || 'Unknown'} · {dateLabel(event.created_date)}</p></div><p className="text-sm font-black" style={{ color: '#0B1528' }}>{event.amount_cents ? money(event.amount_cents, event.currency || 'USD') : event.plan_code || '—'}</p></div>;
}

function SectionHeader({ title, body, compact = false }) {
  return <div className={compact ? '' : 'pt-1'}><h2 className="text-xl font-black tracking-[-0.04em]" style={{ color: '#0B1528' }}>{title}</h2>{body && <p className="text-sm mt-1 leading-relaxed" style={{ color: '#64748B' }}>{body}</p>}</div>;
}

function EmptyState({ icon, title, body }) {
  return <div className="gdr-card p-8 text-center"><div className="text-5xl mb-4">{icon}</div><h3 className="text-lg font-black" style={{ color: '#0B1528' }}>{title}</h3><p className="text-sm mt-1" style={{ color: '#64748B' }}>{body}</p></div>;
}

function InputField({ label, value, onChange, placeholder }) {
  return <label className="block"><span className="text-xs font-black uppercase tracking-[0.14em] mb-1.5 block" style={{ color: '#64748B' }}>{label}</span><input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="gdr-select w-full px-3 py-3 text-sm outline-none" style={{ color: '#0B1528' }} /></label>;
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return <label className="block"><span className="text-xs font-black uppercase tracking-[0.14em] mb-1.5 block" style={{ color: '#64748B' }}>{label}</span><textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className="gdr-select w-full px-3 py-3 text-sm outline-none resize-none" style={{ color: '#0B1528' }} /></label>;
}

function SelectField({ label, value, onChange, options }) {
  return <label className="block"><span className="text-xs font-black uppercase tracking-[0.14em] mb-1.5 block" style={{ color: '#64748B' }}>{label}</span><select value={value} onChange={e => onChange(e.target.value)} className="gdr-select w-full px-3 py-3 text-sm outline-none" style={{ color: '#0B1528' }}>{options.map(([val, text]) => <option key={val} value={val}>{text}</option>)}</select></label>;
}
