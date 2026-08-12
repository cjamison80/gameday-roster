import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share, Heart, MapPin, Calendar, DollarSign, Users, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDateRange, formatDate, calculateMatchScore } from '@/lib/utils';
import { currentMonthKey, getEntitledPlan, isLimitReached, loadPublicPlans, loadUserSubscription } from '@/lib/subscription';
import MatchScoreBadge from '@/components/MatchScoreBadge';
import { Image } from '@/components/ui/image';
import PlayerCreateForm from '@/components/player/PlayerCreateForm';

const tabs = ['Overview', 'Details', 'Team', 'Location'];

export default function OpportunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const [isSaved, setIsSaved] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [showSubmittedConfirmation, setShowSubmittedConfirmation] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [user, setUser] = useState(null);
  const [matchScore, setMatchScore] = useState(85);
  const [applicationMessage, setApplicationMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      let opp = null;
      try {
        opp = await base44.entities.Opportunity.get(id);
      } catch {
        const found = await base44.entities.Opportunity.filter({ id });
        opp = found[0] || null;
      }
      if (!opp) { setLoading(false); return; }
      const u = await base44.auth.me();
      setOpportunity(opp);
      setUser(u);
      const [saved, myPlayers, existingApps] = await Promise.all([
        base44.entities.SavedOpportunity.filter({ user_id: u.id, opportunity_id: id }),
        base44.entities.PlayerProfile.filter({ parent_id: u.id }),
        base44.entities.Application.filter({ opportunity_id: id, parent_id: u.id })
      ]);
      setIsSaved(saved.length > 0);
      setPlayers(myPlayers);
      if (myPlayers.length > 0) {
        setSelectedPlayer(myPlayers[0]);
        setMatchScore(calculateMatchScore({ player: myPlayers[0], opportunity: opp }));
      }
      if (existingApps.length > 0) {
        setApplied(true);
        setApplicationStatus(existingApps[0].status);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (isSaved) {
      const saved = await base44.entities.SavedOpportunity.filter({ user_id: user.id, opportunity_id: id });
      if (saved.length > 0) await base44.entities.SavedOpportunity.delete(saved[0].id);
      setIsSaved(false);
    } else {
      await base44.entities.SavedOpportunity.create({ user_id: user.id, opportunity_id: id });
      setIsSaved(true);
    }
  };

  const handleMessageCoach = async () => {
    if (!user || !opportunity || applicationStatus !== 'accepted') return;
    const coachId = opportunity.coach_id;
    if (!coachId) { navigate('/messages'); return; }
    try {
      const existing = await base44.entities.Conversation.filter({ opportunity_id: id });
      let conv = existing.find(c =>
        (c.participant_a_id === user.id || c.participant_b_id === user.id) &&
        (c.participant_a_id === coachId || c.participant_b_id === coachId)
      );
      if (!conv) {
        conv = await base44.entities.Conversation.create({
          participant_a_id: user.id,
          participant_b_id: coachId,
          participant_ids: [user.id, coachId],
          opportunity_id: id
        });
      }
      navigate(`/messages?conversation=${conv.id}`);
    } catch (e) {
      console.error(e);
      navigate('/messages');
    }
  };

  const handleApply = async () => {
    if (!selectedPlayer || !user || applying) return;
    setApplying(true);
    try {
      const planRows = await loadPublicPlans();
      const profileRows = await base44.entities.UserProfile.filter({ user_id: user.id }).catch(() => []);
      const subscription = await loadUserSubscription(user, profileRows[0]?.role || 'parent', planRows);
      const plan = getEntitledPlan(planRows, subscription, profileRows[0]?.role || 'parent');
      const allApps = await base44.entities.Application.filter({ parent_id: user.id }, '-created_date', 100).catch(() => []);
      const monthKey = currentMonthKey();
      const appsThisMonth = allApps.filter(app => String(app.created_date || '').slice(0, 7) === monthKey).length;
      if (isLimitReached(plan, 'applications_per_month', appsThisMonth)) {
        await base44.entities.BillingEvent.create({
          user_id: user.id,
          event_type: 'limit_reached',
          plan_code: plan.code,
          provider: 'system',
          metadata: { limit: 'applications_per_month', used: appsThisMonth }
        }).catch(() => null);
        navigate('/billing?reason=applications');
        return;
      }

      await base44.entities.Application.create({
        opportunity_id: id,
        parent_id: user.id,
        player_id: selectedPlayer.id,
        coach_id: opportunity.coach_id,
        message: applicationMessage,
        match_score: matchScore,
        status: 'pending'
      });
      setApplied(true);
      setApplicationStatus('pending');
      setShowApplyModal(false);
      setShowSubmittedConfirmation(true);
      if (opportunity.coach_id) {
        await base44.entities.Notification.create({
          user_id: opportunity.coach_id,
          type: 'application_received',
          title: 'New Application Received',
          body: `${selectedPlayer.first_name} ${selectedPlayer.last_name} applied for ${opportunity.title}.`,
          related_id: id,
          related_type: 'opportunity',
          action_url: '/coach-dashboard'
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#E2E8F0', borderTopColor: '#2563EB' }} />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-5xl mb-4">⚾</div>
        <h3 className="text-lg font-bold" style={{ color: '#0B1528' }}>Opportunity not found</h3>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm font-semibold" style={{ color: '#2563EB' }}>Go back</button>
      </div>
    );
  }

  const teamName = opportunity.team_name || 'Team';

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Hero */}
      <div className="relative" style={{ height: 240 }}>
        {opportunity.cover_image_url ? (
          <Image src={opportunity.cover_image_url} alt={opportunity.title} className="w-full h-60" fittingType="fill" />
        ) : (
          <div className="w-full h-60 flex items-center justify-center" style={{ backgroundColor: '#0B1528' }}>
            <div className="text-center">
              <div className="text-6xl mb-2">⚾</div>
              <p className="text-sm font-bold" style={{ color: '#64748B' }}>{teamName}</p>
            </div>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(11,21,40,0.3) 0%, transparent 50%)' }} />

        {/* Nav buttons */}
        <div className="absolute top-14 left-0 right-0 px-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(11,21,40,0.7)' }}
          >
            <ArrowLeft size={20} color="white" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={handleSave}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(11,21,40,0.7)' }}>
              <Heart size={20} fill={isSaved ? '#DC2626' : 'none'} color={isSaved ? '#DC2626' : 'white'} />
            </button>
          </div>
        </div>

        {/* Type badge */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
            style={{ backgroundColor: '#2563EB' }}>
            {opportunity.type === 'pickup' ? 'Pickup Opportunity' : opportunity.type}
          </span>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 px-5 pt-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-black leading-tight" style={{ color: '#0B1528' }}>
              {opportunity.title}
            </h1>
            <p className="text-base font-semibold mt-1" style={{ color: '#2563EB' }}>{teamName}</p>
          </div>
          <MatchScoreBadge score={matchScore} size="lg" />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          {[
            { icon: Calendar, label: 'Dates', value: formatDateRange(opportunity.event_date_start, opportunity.event_date_end) },
            { icon: DollarSign, label: 'Player Cost', value: opportunity.player_cost ? `$${opportunity.player_cost}` : 'Free' },
            { icon: Users, label: 'Positions Needed', value: opportunity.positions_needed?.join(', ') || 'Various' },
            { icon: Clock, label: 'Apply By', value: opportunity.application_deadline ? formatDate(opportunity.application_deadline) : 'Open' }
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-xl p-3" style={{ backgroundColor: '#F8FAFC' }}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} color="#2563EB" />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{label}</span>
              </div>
              <p className="text-sm font-bold" style={{ color: '#0B1528' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-5">
        <div className="flex gap-6 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="py-4 text-sm font-semibold flex-shrink-0 transition-colors border-b-2"
              style={{
                color: activeTab === tab ? '#2563EB' : '#94A3B8',
                borderColor: activeTab === tab ? '#2563EB' : 'transparent'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-5 py-5 pb-32">
        {activeTab === 'Overview' && (
          <div className="space-y-5">
            {opportunity.description && (
              <div>
                <h3 className="text-base font-bold mb-2" style={{ color: '#0B1528' }}>About This Opportunity</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{opportunity.description}</p>
              </div>
            )}
            {opportunity.requirements && (
              <div>
                <h3 className="text-base font-bold mb-2" style={{ color: '#0B1528' }}>Requirements</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{opportunity.requirements}</p>
              </div>
            )}
            <div>
              <h3 className="text-base font-bold mb-3" style={{ color: '#0B1528' }}>Details</h3>
              <div className="space-y-2">
                {[
                  { label: 'Games', value: opportunity.games_count ? `${opportunity.games_count} games guaranteed` : 'TBD' },
                  { label: 'Age Division', value: opportunity.age_division || 'Open' },
                  { label: 'Classification', value: opportunity.classification || 'Open' },
                  { label: 'Overnight', value: opportunity.overnight_required ? 'Required' : 'Not required' },
                  { label: 'Spots Available', value: opportunity.spots_available ? `${opportunity.spots_available - (opportunity.spots_filled || 0)} remaining` : 'Open' }
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50">
                    <span className="text-sm" style={{ color: '#64748B' }}>{label}</span>
                    <span className="text-sm font-semibold" style={{ color: '#0B1528' }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'Details' && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#F8FAFC' }}>
              <h3 className="font-bold mb-3" style={{ color: '#0B1528' }}>Positions Needed</h3>
              <div className="flex flex-wrap gap-2">
                {(opportunity.positions_needed || ['Various']).map(pos => (
                  <span key={pos} className="px-3 py-1.5 rounded-xl text-sm font-bold"
                    style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                    {pos}
                  </span>
                ))}
              </div>
            </div>
            {opportunity.notes && (
              <div>
                <h3 className="font-bold mb-2" style={{ color: '#0B1528' }}>Coach Notes</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{opportunity.notes}</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'Team' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 text-center">
              <div className="w-20 h-20 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                <span className="text-3xl font-black" style={{ color: '#2563EB' }}>
                  {teamName.split(' ').map(w => w[0]).join('').slice(0, 3)}
                </span>
              </div>
              <h3 className="text-xl font-black" style={{ color: '#0B1528' }}>{teamName}</h3>
              <div className="flex items-center justify-center gap-3 mt-2">
                {opportunity.age_division && (
                  <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
                    {opportunity.age_division}
                  </span>
                )}
                {opportunity.classification && (
                  <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ backgroundColor: '#FEFCE8', color: '#A4A017' }}>
                    {opportunity.classification}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'Location' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                  <MapPin size={20} color="#2563EB" />
                </div>
                <div>
                  <h3 className="font-bold" style={{ color: '#0B1528' }}>Event Location</h3>
                  <p className="text-sm mt-1" style={{ color: '#64748B' }}>
                    {opportunity.city}, {opportunity.state}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Apply CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4"
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
        {applied ? (
          applicationStatus === 'accepted' ? (
            <div className="flex gap-3">
              <div className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl" style={{ backgroundColor: '#DCFCE7' }}>
                <CheckCircle size={20} color="#16A34A" />
                <span className="font-bold" style={{ color: '#16A34A' }}>Accepted</span>
              </div>
              <button
                onClick={handleMessageCoach}
                className="flex-1 py-4 rounded-2xl font-bold text-white text-base"
                style={{ backgroundColor: '#0B1528' }}
              >
                Message Coach
              </button>
            </div>
          ) : applicationStatus === 'declined' ? (
            <div className="flex items-center justify-center gap-2 py-4 rounded-2xl" style={{ backgroundColor: '#FEE2E2' }}>
              <span className="font-bold" style={{ color: '#DC2626' }}>Application Declined</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 py-4 rounded-2xl" style={{ backgroundColor: '#FEF9C3' }}>
              <CheckCircle size={20} color="#F59E0B" />
              <span className="font-bold" style={{ color: '#A16207' }}>Application Pending</span>
            </div>
          )
        ) : (
          <button
            onClick={() => setShowApplyModal(true)}
            disabled={applying}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-transform active:scale-95"
            style={{ backgroundColor: '#2563EB' }}
          >
            Apply Now
          </button>
        )}
      </div>

      {/* Application Submitted Confirmation (SCR-016) */}
      {showSubmittedConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ backgroundColor: 'rgba(11,21,40,0.85)' }}>
          <div className="w-full max-w-sm bg-white rounded-3xl p-8 text-center">
            <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ backgroundColor: '#DCFCE7' }}>
              <CheckCircle size={44} color="#16A34A" />
            </div>
            <h2 className="text-2xl font-black" style={{ color: '#0B1528' }}>Application Submitted!</h2>
            <p className="text-sm mt-2" style={{ color: '#64748B' }}>
              Your application for {opportunity.title} has been sent. We'll notify you when the coach responds.
            </p>
            <div className="space-y-3 mt-6">
              <button onClick={() => { setShowSubmittedConfirmation(false); navigate('/activity'); }} className="w-full py-4 rounded-2xl font-bold text-white" style={{ backgroundColor: '#2563EB' }}>
                View My Applications
              </button>
              <button onClick={() => { setShowSubmittedConfirmation(false); navigate('/discover'); }} className="w-full py-4 rounded-2xl font-bold border-2" style={{ borderColor: '#E2E8F0', color: '#0B1528' }}>
                Return to Discover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full bg-white rounded-t-3xl p-6 pb-8 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto" />
            <h2 className="text-xl font-black" style={{ color: '#0B1528' }}>Apply Now</h2>
            <p className="text-sm" style={{ color: '#64748B' }}>Choose which player you're applying for:</p>

            {players.length === 0 ? (
              <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                <p className="text-sm font-bold" style={{ color: '#0B1528' }}>No player profiles yet</p>
                <p className="text-xs" style={{ color: '#64748B' }}>Quickly add a player to apply for this opportunity:</p>
                <PlayerCreateForm
                  user={user}
                  defaultAge={opportunity.age_division || ''}
                  defaultPositions={opportunity.positions_needed || []}
                  submitLabel="Add Player & Continue"
                  quick
                  onCreated={(p) => { setPlayers(prev => [...prev, p]); setSelectedPlayer(p); }}
                />
              </div>
            ) : (
              <div className="space-y-2">
                {players.map(p => (
                  <button
                    key={p.id}
                    aria-label={`Select player ${p.first_name} ${p.last_name}`}
                    onClick={() => setSelectedPlayer(p)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all"
                    style={{
                      borderColor: selectedPlayer?.id === p.id ? '#2563EB' : '#E2E8F0',
                      backgroundColor: selectedPlayer?.id === p.id ? '#EFF6FF' : '#FFFFFF'
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                      <span className="font-black" style={{ color: '#2563EB' }}>
                        {p.first_name[0]}{p.last_name[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: '#0B1528' }}>{p.first_name} {p.last_name}</p>
                      <p className="text-xs" style={{ color: '#64748B' }}>{p.positions?.join(', ')} · {p.age_division}</p>
                    </div>
                    {selectedPlayer?.id === p.id && <CheckCircle size={20} color="#2563EB" className="ml-auto" />}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label htmlFor="apply-message" className="text-sm font-semibold mb-2 block" style={{ color: '#0B1528' }}>Message (Optional)</label>
              <textarea
                id="apply-message"
                name="application_message"
                aria-label="Message to coach (optional)"
                value={applicationMessage}
                onChange={e => setApplicationMessage(e.target.value)}
                placeholder="Add a note to the coach..."
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none resize-none"
                style={{ color: '#0B1528' }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApplyModal(false)}
                className="flex-1 py-4 rounded-2xl font-bold border-2 border-gray-200"
                style={{ color: '#64748B' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={applying || !selectedPlayer}
                aria-label="Submit Application"
                className="flex-1 py-4 rounded-2xl font-bold text-white transition-opacity"
                style={{ backgroundColor: '#2563EB', opacity: (!selectedPlayer || applying) ? 0.6 : 1 }}
              >
                {applying ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}