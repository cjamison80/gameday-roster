import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { currentMonthKey, getPlanFromList, isLimitReached, loadPublicPlans, loadUserSubscription } from '@/lib/subscription';

const positionOptions = ['Pitcher', 'Catcher', 'Shortstop', 'Second Base', 'Third Base', 'First Base', 'Left Field', 'Center Field', 'Right Field', 'Outfield', 'Utility'];
const ageDivisions = ['8U', '9U', '10U', '11U', '12U', '13U', '14U', '15U', '16U', '17U', '18U'];
const classifications = ['Major', 'AAA', 'AA', 'A'];

export default function CreateOpportunity() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [form, setForm] = useState({
    title: '',
    type: 'pickup',
    sport: 'baseball',
    description: '',
    positions_needed: [],
    age_division: '',
    classification: '',
    event_date_start: '',
    event_date_end: '',
    city: '',
    state: '',
    player_cost: '',
    games_count: '',
    spots_available: '',
    overnight_required: false,
    application_deadline: '',
    requirements: '',
    notes: '',
    sanctioning_body: ''
  });

  useEffect(() => {
    checkAccess();
  }, []);

  const isAllowedToCreate = (user, profile) => {
    return user?.role === 'admin' || ['coach', 'organization', 'admin'].includes(profile?.role);
  };

  const checkAccess = async () => {
    try {
      const user = await base44.auth.me();
      const profiles = await base44.entities.UserProfile.filter({ user_id: user.id });
      const profile = profiles[0] || null;
      setCurrentUser(user);
      setCurrentProfile(profile);
      if (!isAllowedToCreate(user, profile)) {
        setAccessError('Only coach, organization, or admin accounts can create opportunities.');
      }
    } catch (e) {
      console.error(e);
      setAccessError('Could not verify your account permissions.');
    } finally {
      setAccessChecked(true);
    }
  };

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const togglePosition = (pos) => {
    setForm(f => ({
      ...f,
      positions_needed: f.positions_needed.includes(pos)
        ? f.positions_needed.filter(p => p !== pos)
        : [...f.positions_needed, pos]
    }));
  };

  const handleSubmit = async () => {
    setAccessError('');
    setSaving(true);
    try {
      const user = currentUser || await base44.auth.me();
      const profile = currentProfile || (await base44.entities.UserProfile.filter({ user_id: user.id }))[0] || null;
      if (!isAllowedToCreate(user, profile)) {
        setAccessError('Only coach, organization, or admin accounts can create opportunities.');
        return;
      }

      const planRows = await loadPublicPlans();
      const subscription = await loadUserSubscription(user, profile?.role || 'coach', planRows);
      const plan = getPlanFromList(planRows, subscription?.plan_code || 'coach_free');
      const existingPosts = await base44.entities.Opportunity.filter({ coach_id: user.id }, '-created_date', 100).catch(() => []);
      const monthKey = currentMonthKey();
      const postsThisMonth = existingPosts.filter(post => String(post.created_date || '').slice(0, 7) === monthKey).length;
      if (isLimitReached(plan, 'roster_posts_per_month', postsThisMonth)) {
        await base44.entities.BillingEvent.create({
          user_id: user.id,
          event_type: 'limit_reached',
          plan_code: plan.code,
          provider: 'system',
          metadata: { limit: 'roster_posts_per_month', used: postsThisMonth }
        }).catch(() => null);
        navigate('/billing?reason=roster_posts');
        return;
      }

      const payload = {
        ...form,
        player_cost: form.player_cost ? parseFloat(form.player_cost) : 0,
        games_count: form.games_count ? parseInt(form.games_count) : null,
        spots_available: form.spots_available ? parseInt(form.spots_available) : null,
        coach_id: user.id,
        status: 'active'
      };
      await base44.entities.Opportunity.create(payload);
      navigate('/discover');
    } catch (e) {
      console.error(e);
      setAccessError(e?.message || 'Could not create this opportunity.');
    } finally {
      setSaving(false);
    }
  };

  const steps = ['Listing Type', 'Listing Details', 'Team Needs', 'Details & Rules'];

  const isValid = () => {
    if (step === 0) return form.type;
    if (step === 1) return form.title && form.event_date_start && form.city;
    if (step === 2) return form.positions_needed.length > 0;
    return true;
  };

  if (!accessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#E2E8F0', borderTopColor: '#2563EB' }} />
      </div>
    );
  }

  if (accessError && !isAllowedToCreate(currentUser, currentProfile)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: '#F8FAFC' }}>
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-black" style={{ color: '#0B1528' }}>Coach tools only</h1>
        <p className="text-sm mt-2" style={{ color: '#64748B' }}>{accessError}</p>
        <button onClick={() => navigate('/profile')} className="mt-6 px-5 py-3 rounded-2xl font-bold text-white" style={{ backgroundColor: '#2563EB' }}>
          Back to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <div style={{ backgroundColor: '#0B1528' }} className="px-5 pt-14 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <h1 className="text-xl font-black text-white">Create Listing</h1>
        </div>
        {/* Progress */}
        <div className="flex gap-2">
          {steps.map((s, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full"
              style={{ backgroundColor: i <= step ? '#2563EB' : '#1E293B' }}
            />
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: '#64748B' }}>{steps[step]}</p>
      </div>

      <div className="px-5 py-6 space-y-5">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-black" style={{ color: '#0B1528' }}>What type of listing?</h2>
            {[
              { value: 'pickup', label: '⚡ Pickup Opportunity', desc: 'Fill roster spots for an upcoming tournament or event' },
              { value: 'tryout', label: '🎯 Tryout', desc: 'Find players for your roster' },
              { value: 'recruiting', label: '🌟 Recruiting', desc: 'Long-term recruiting for your program' }
            ].map(opt => (
              <button
                key={opt.value}
                aria-label={`Listing type ${opt.label}`}
                onClick={() => { update('type', opt.value); setStep(1); }}
                className="w-full text-left p-5 rounded-2xl border-2 transition-all"
                style={{
                  borderColor: form.type === opt.value ? '#2563EB' : '#E2E8F0',
                  backgroundColor: form.type === opt.value ? '#EFF6FF' : '#FFFFFF'
                }}
              >
                <div className="font-bold text-base" style={{ color: '#0B1528' }}>{opt.label}</div>
                <div className="text-sm mt-1" style={{ color: '#64748B' }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Listing Name *</label>
              <input
                id="opp-title"
                name="title"
                aria-label="Listing Name"
                value={form.title}
                onChange={e => update('title', e.target.value)}
                placeholder="e.g. Gold Glove Elite 11U Needs Shortstop"
                className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                style={{ color: '#0B1528' }}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Sport</label>
              <div className="flex gap-2">
                {['baseball', 'softball'].map(s => (
                  <button
                    key={s}
                    aria-label={`Sport ${s}`}
                    onClick={() => update('sport', s)}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm capitalize border-2 transition-all"
                    style={{
                      borderColor: form.sport === s ? '#2563EB' : '#E2E8F0',
                      backgroundColor: form.sport === s ? '#EFF6FF' : '#FFFFFF',
                      color: form.sport === s ? '#2563EB' : '#64748B'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Start Date *</label>
                <input
                  id="opp-start-date"
                  name="event_date_start"
                  aria-label="Start Date"
                  type="date"
                  value={form.event_date_start}
                  onChange={e => update('event_date_start', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>End Date</label>
                <input
                  id="opp-end-date"
                  name="event_date_end"
                  aria-label="End Date"
                  type="date"
                  value={form.event_date_end}
                  onChange={e => update('event_date_end', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>City *</label>
                <input
                  id="opp-city"
                  name="city"
                  aria-label="City"
                  value={form.city}
                  onChange={e => update('city', e.target.value)}
                  placeholder="Bentonville"
                  className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>State</label>
                <input
                  id="opp-state"
                  name="state"
                  aria-label="State"
                  value={form.state}
                  onChange={e => update('state', e.target.value)}
                  placeholder="AR"
                  maxLength={2}
                  className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Description</label>
              <textarea
                id="opp-description"
                name="description"
                aria-label="Description"
                value={form.description}
                onChange={e => update('description', e.target.value)}
                rows={3}
                placeholder="Tell players about this opportunity..."
                className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none resize-none"
                style={{ color: '#0B1528' }}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-black mb-1" style={{ color: '#0B1528' }}>Positions Needed *</h2>
              <p className="text-sm mb-4" style={{ color: '#64748B' }}>Select all positions you need to fill</p>
              <div className="flex flex-wrap gap-2">
                {positionOptions.map(pos => {
                  const selected = form.positions_needed.includes(pos);
                  return (
                    <button
                      key={pos}
                      aria-label={`Position ${pos}`}
                      onClick={() => togglePosition(pos)}
                      className="px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-1.5"
                      style={{
                        borderColor: selected ? '#2563EB' : '#E2E8F0',
                        backgroundColor: selected ? '#EFF6FF' : '#FFFFFF',
                        color: selected ? '#2563EB' : '#64748B'
                      }}
                    >
                      {selected && <Check size={12} />}
                      {pos}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Age Division</label>
                <select
                  id="opp-age-division"
                  name="age_division"
                  aria-label="Age Division"
                  value={form.age_division}
                  onChange={e => update('age_division', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                >
                  <option value="">Any</option>
                  {ageDivisions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Classification</label>
                <select
                  id="opp-classification"
                  name="classification"
                  aria-label="Classification"
                  value={form.classification}
                  onChange={e => update('classification', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                >
                  <option value="">Any</option>
                  {classifications.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Player Cost ($)</label>
                <input
                  id="opp-player-cost"
                  name="player_cost"
                  aria-label="Player Cost in dollars"
                  type="number"
                  value={form.player_cost}
                  onChange={e => update('player_cost', e.target.value)}
                  placeholder="75"
                  className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                />
              </div>
              <div>
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Games Count</label>
                <input
                  id="opp-games-count"
                  name="games_count"
                  aria-label="Games Count"
                  type="number"
                  value={form.games_count}
                  onChange={e => update('games_count', e.target.value)}
                  placeholder="4"
                  className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Tournament Sanction</label>
              <select
                id="opp-sanctioning-body"
                name="sanctioning_body"
                aria-label="Tournament Sanction"
                value={form.sanctioning_body}
                onChange={e => update('sanctioning_body', e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                style={{ color: '#0B1528' }}
              >
                <option value="">None / Open</option>
                {['USSSA', '2D', 'PG', 'NSA', 'AAU', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Requirements</label>
              <textarea
                id="opp-requirements"
                name="requirements"
                aria-label="Requirements"
                value={form.requirements}
                onChange={e => update('requirements', e.target.value)}
                rows={3}
                placeholder="e.g. Must have own equipment, verified profile required..."
                className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none resize-none"
                style={{ color: '#0B1528' }}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Application Deadline</label>
              <input
                id="opp-application-deadline"
                name="application_deadline"
                aria-label="Application Deadline"
                type="date"
                value={form.application_deadline}
                onChange={e => update('application_deadline', e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                style={{ color: '#0B1528' }}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Spots Available</label>
              <input
                id="opp-spots-available"
                name="spots_available"
                aria-label="Spots Available"
                type="number"
                value={form.spots_available}
                onChange={e => update('spots_available', e.target.value)}
                placeholder="2"
                className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
                style={{ color: '#0B1528' }}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100">
              <div>
                <p className="font-semibold" style={{ color: '#0B1528' }}>Overnight Stay Required</p>
                <p className="text-sm" style={{ color: '#64748B' }}>Players must arrange overnight accommodation</p>
              </div>
              <button
                aria-label="Toggle Overnight Stay Required"
                onClick={() => update('overnight_required', !form.overnight_required)}
                className="w-12 h-6 rounded-full transition-colors relative"
                style={{ backgroundColor: form.overnight_required ? '#2563EB' : '#E2E8F0' }}
              >
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: form.overnight_required ? '26px' : '4px' }} />
              </button>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Coach Notes (private)</label>
              <textarea
                id="opp-notes"
                name="notes"
                aria-label="Coach Notes private"
                value={form.notes}
                onChange={e => update('notes', e.target.value)}
                rows={2}
                placeholder="Internal notes for your team..."
                className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none resize-none"
                style={{ color: '#0B1528' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-5 py-4"
        style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
        {step < 3 ? (
          <button
            aria-label="Continue to next step"
            onClick={() => setStep(s => s + 1)}
            disabled={!isValid()}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-opacity"
            style={{ backgroundColor: '#2563EB', opacity: !isValid() ? 0.5 : 1 }}
          >
            Continue
          </button>
        ) : (
          <button
            aria-label="Publish Listing"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-white text-base"
            style={{ backgroundColor: '#16A34A' }}
          >
            {saving ? 'Publishing...' : '🚀 Publish Listing'}
          </button>
        )}
      </div>
    </div>
  );
}