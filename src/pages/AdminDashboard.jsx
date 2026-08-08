import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Briefcase, Building2, Trophy, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ players: 0, coaches: 0, orgs: 0, opportunities: 0, applications: 0 });
  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      const isAdmin = user?.role === 'admin' || profiles[0]?.role === 'admin';
      if (!isAdmin) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      const [players, coachs, organizations, opps, apps] = await Promise.all([
        base44.entities.PlayerProfile.list(),
        base44.entities.CoachProfile.list(),
        base44.entities.Organization.list(),
        base44.entities.Opportunity.list(),
        base44.entities.Application.list()
      ]);
      setStats({
        players: players.length,
        coaches: coachs.length,
        orgs: organizations.length,
        opportunities: opps.length,
        applications: apps.length
      });
      setCoaches(coachs.filter(c => c.verification_status === 'pending'));
      setOrgs(organizations.filter(o => o.verification_status === 'pending'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const verifyCoach = async (coachId) => {
    await base44.entities.CoachProfile.update(coachId, { verification_status: 'verified', is_verified: true });
    setCoaches(prev => prev.filter(c => c.id !== coachId));
  };

  const rejectCoach = async (coachId) => {
    await base44.entities.CoachProfile.update(coachId, { verification_status: 'rejected' });
    setCoaches(prev => prev.filter(c => c.id !== coachId));
  };

  const statCards = [
    { icon: Users, label: 'Players', value: stats.players, color: '#2563EB', bg: '#EFF6FF' },
    { icon: Briefcase, label: 'Coaches', value: stats.coaches, color: '#16A34A', bg: '#DCFCE7' },
    { icon: Building2, label: 'Organizations', value: stats.orgs, color: '#8B5CF6', bg: '#F5F3FF' },
    { icon: Trophy, label: 'Opportunities', value: stats.opportunities, color: '#A4A017', bg: '#FEFCE8' }
  ];

  if (authorized === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-black" style={{ color: '#0B1528' }}>Admin access only</h1>
        <p className="text-sm mt-2" style={{ color: '#64748B' }}>You do not have permission to view the admin dashboard.</p>
        <button onClick={() => navigate('/discover')} className="mt-6 px-5 py-3 rounded-2xl font-bold text-white" style={{ backgroundColor: '#2563EB' }}>
          Back to Discover
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-5">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
        </div>
        {coaches.length > 0 || orgs.length > 0 ? (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl" style={{ backgroundColor: '#1E293B' }}>
            <AlertCircle size={16} color="#F59E0B" />
            <span className="text-sm font-semibold" style={{ color: '#F59E0B' }}>
              {coaches.length + orgs.length} pending verifications
            </span>
          </div>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="flex px-5">
          {['overview', 'verifications'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="py-4 mr-6 text-sm font-semibold capitalize border-b-2 transition-colors"
              style={{
                color: activeTab === tab ? '#2563EB' : '#94A3B8',
                borderColor: activeTab === tab ? '#2563EB' : 'transparent'
              }}
            >
              {tab}
              {tab === 'verifications' && (coaches.length + orgs.length) > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: '#DC2626' }}>
                  {coaches.length + orgs.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {statCards.map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: bg }}>
                    <Icon size={20} color={color} />
                  </div>
                  <div className="text-3xl font-black" style={{ color: '#0B1528' }}>
                    {loading ? '—' : value}
                  </div>
                  <div className="text-sm mt-1" style={{ color: '#94A3B8' }}>{label}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h3 className="font-bold mb-1" style={{ color: '#0B1528' }}>Applications</h3>
              <div className="text-3xl font-black" style={{ color: '#0B1528' }}>{loading ? '—' : stats.applications}</div>
              <div className="text-sm mt-1" style={{ color: '#94A3B8' }}>Total submitted</div>
            </div>
          </div>
        )}

        {activeTab === 'verifications' && (
          <div className="space-y-4">
            <h2 className="text-lg font-black" style={{ color: '#0B1528' }}>Pending Verifications</h2>
            {coaches.length === 0 && orgs.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle size={40} color="#16A34A" className="mx-auto mb-3" />
                <p className="font-bold" style={{ color: '#0B1528' }}>All caught up!</p>
                <p className="text-sm" style={{ color: '#94A3B8' }}>No pending verifications.</p>
              </div>
            ) : (
              <>
                {coaches.map(coach => (
                  <div key={coach.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                        <span className="font-black" style={{ color: '#2563EB' }}>
                          {coach.first_name?.[0]}{coach.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: '#0B1528' }}>{coach.first_name} {coach.last_name}</p>
                        <div className="flex items-center gap-1">
                          <Clock size={12} color="#F59E0B" />
                          <span className="text-xs font-semibold" style={{ color: '#F59E0B' }}>Coach Verification Pending</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => rejectCoach(coach.id)}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm border-2 border-gray-200"
                        style={{ color: '#DC2626' }}>
                        Reject
                      </button>
                      <button onClick={() => verifyCoach(coach.id)}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
                        style={{ backgroundColor: '#16A34A' }}>
                        Verify
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}