import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Database, ExternalLink, Play, ShieldAlert, UploadCloud } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SOURCE_STATUS_LABELS, SOURCE_TYPE_LABELS, buildSyncJobPayload, getPipelineNextStep, validateSourceForSync } from '@/lib/tournament-source-pipeline';

export default function TournamentSourcesAdmin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [authorized, setAuthorized] = useState(null);
  const [sources, setSources] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      const profiles = await base44.entities.UserProfile.filter({ user_id: u.id });
      const isAdmin = u?.role === 'admin' || profiles[0]?.role === 'admin';
      setAuthorized(isAdmin);
      if (!isAdmin) return;
      const [sourceRows, jobRows] = await Promise.all([
        base44.entities.TournamentSource.list('-created_date', 100),
        base44.entities.TournamentSyncJob.list('-created_date', 50)
      ]);
      const visibleJobs = (jobRows || []).filter(job =>
        job.run_type !== 'archived_cleanup' &&
        !String(job.notes || '').includes('REMOVED_FROM_BETA_CLEANUP') &&
        !String(job.error_message || '').includes('Archived during beta cleanup')
      );
      setSources(sourceRows);
      setJobs(visibleJobs);
    } catch (e) {
      console.error(e);
      setAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const runReadinessCheck = async (source) => {
    setBusyId(source.id);
    try {
      const validation = validateSourceForSync(source);
      const status = validation.ok ? 'success' : source.requires_permission && source.permission_status !== 'approved' ? 'blocked' : 'failed';
      const job = await base44.entities.TournamentSyncJob.create({
        ...buildSyncJobPayload(source, user, status, { run_type: 'test', notes: validation.reason }),
        finished_at: new Date().toISOString(),
        records_found: 0,
        records_created: 0,
        records_updated: 0,
        records_skipped: 0,
        error_message: validation.ok ? '' : validation.reason
      });
      await base44.entities.TournamentSource.update(source.id, {
        last_status: status,
        last_synced_at: new Date().toISOString()
      });
      setJobs(prev => [job, ...prev]);
      setSources(prev => prev.map(s => s.id === source.id ? { ...s, last_status: status, last_synced_at: new Date().toISOString() } : s));
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const toggleSync = async (source) => {
    setBusyId(source.id);
    try {
      const next = !source.sync_enabled;
      const updated = await base44.entities.TournamentSource.update(source.id, { sync_enabled: next });
      setSources(prev => prev.map(s => s.id === source.id ? updated : s));
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const markApproved = async (source) => {
    setBusyId(source.id);
    try {
      const updated = await base44.entities.TournamentSource.update(source.id, { permission_status: 'approved' });
      setSources(prev => prev.map(s => s.id === source.id ? updated : s));
    } catch (e) {
      console.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const summary = useMemo(() => ({
    total: sources.length,
    enabled: sources.filter(s => s.sync_enabled).length,
    approved: sources.filter(s => s.permission_status === 'approved').length,
    blocked: sources.filter(s => s.last_status === 'blocked').length
  }), [sources]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#E2E8F0', borderTopColor: '#2563EB' }} /></div>;
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-black" style={{ color: '#0B1528' }}>Admin access only</h1>
        <p className="text-sm mt-2" style={{ color: '#64748B' }}>Tournament source management is restricted to admins.</p>
        <button onClick={() => navigate('/discover')} className="mt-6 px-5 py-3 rounded-2xl font-bold text-white" style={{ backgroundColor: '#2563EB' }}>Back to Discover</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-6">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 mb-4"><ArrowLeft size={24} color="white" /></button>
        <h1 className="text-2xl font-black text-white">Tournament Sources</h1>
        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Manage compliant tournament ingestion sources and sync readiness.</p>
        <div className="grid grid-cols-4 gap-2 mt-5">
          <MiniStat label="Sources" value={summary.total} />
          <MiniStat label="Enabled" value={summary.enabled} />
          <MiniStat label="Approved" value={summary.approved} />
          <MiniStat label="Blocked" value={summary.blocked} />
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        <div className="rounded-2xl p-4 flex gap-3" style={{ backgroundColor: '#FEFCE8', border: '1px solid #FEF08A' }}>
          <ShieldAlert size={20} color="#A16207" className="flex-shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed" style={{ color: '#713F12' }}>
            Daily scrape mode is enabled for public tournament sources. The production runner should still check robots/terms each run, use rate limits, preserve source attribution, and stop automatically if a source blocks or disallows access.
          </p>
        </div>

        <div className="space-y-3">
          {sources.map(source => {
            const validation = validateSourceForSync(source);
            return (
              <div key={source.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black" style={{ color: '#0B1528' }}>{source.name}</h3>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>{source.association}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: source.sync_enabled ? '#DCFCE7' : '#F1F5F9', color: source.sync_enabled ? '#16A34A' : '#64748B' }}>{source.sync_enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: '#64748B' }}>{SOURCE_TYPE_LABELS[source.source_type] || source.source_type} · {source.sync_frequency || 'manual'} sync · Permission: {source.permission_status}</p>
                    <p className="text-sm mt-2" style={{ color: validation.ok ? (validation.warning ? '#A16207' : '#16A34A') : '#DC2626' }}>{getPipelineNextStep(source)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold" style={{ color: '#94A3B8' }}>Last status</p>
                    <p className="text-sm font-black" style={{ color: source.last_status === 'success' ? '#16A34A' : source.last_status === 'blocked' ? '#DC2626' : '#0B1528' }}>{SOURCE_STATUS_LABELS[source.last_status] || source.last_status}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {source.events_url && <a href={source.events_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: '#F1F5F9', color: '#0B1528' }}><ExternalLink size={13} /> Events</a>}
                  {source.robots_url && <a href={source.robots_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: '#F1F5F9', color: '#0B1528' }}><ExternalLink size={13} /> Robots</a>}
                  {source.terms_url && <a href={source.terms_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold" style={{ backgroundColor: '#F1F5F9', color: '#0B1528' }}><ExternalLink size={13} /> Terms</a>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                  <button onClick={() => runReadinessCheck(source)} disabled={busyId === source.id} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white" style={{ backgroundColor: '#2563EB', opacity: busyId === source.id ? 0.6 : 1 }}><Play size={15} /> Test Readiness</button>
                  <button onClick={() => toggleSync(source)} disabled={busyId === source.id} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold border-2" style={{ borderColor: '#E2E8F0', color: '#0B1528' }}><Database size={15} /> {source.sync_enabled ? 'Disable' : 'Enable'}</button>
                  {source.permission_status !== 'approved' ? (
                    <button onClick={() => markApproved(source)} disabled={busyId === source.id} className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold border-2" style={{ borderColor: '#DCFCE7', color: '#16A34A' }}><CheckCircle size={15} /> Mark Approved</button>
                  ) : (
                    <button disabled className="flex items-center justify-center gap-2 py-3 rounded-xl font-bold" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}><CheckCircle size={15} /> Approved</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3"><UploadCloud size={18} color="#2563EB" /><h2 className="font-black" style={{ color: '#0B1528' }}>Recent Sync Jobs</h2></div>
          {jobs.length === 0 ? <p className="text-sm" style={{ color: '#94A3B8' }}>No sync jobs yet.</p> : (
            <div className="space-y-2">
              {jobs.slice(0, 8).map(job => (
                <div key={job.id} className="rounded-xl p-3" style={{ backgroundColor: '#F8FAFC' }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#0B1528' }}>{job.source_name}</p>
                      <p className="text-xs" style={{ color: '#64748B' }}>{job.association} · {job.run_type}</p>
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: job.status === 'success' ? '#DCFCE7' : job.status === 'blocked' || job.status === 'failed' ? '#FEE2E2' : '#FEF9C3', color: job.status === 'success' ? '#16A34A' : job.status === 'blocked' || job.status === 'failed' ? '#DC2626' : '#A16207' }}>{job.status}</span>
                  </div>
                  {(job.error_message || job.notes) && <p className="text-xs mt-1" style={{ color: '#64748B' }}>{job.error_message || job.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl p-3 text-center" style={{ backgroundColor: '#1E293B' }}>
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-[10px] font-semibold" style={{ color: '#94A3B8' }}>{label}</p>
    </div>
  );
}
