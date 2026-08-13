import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import ParentalConsentForm from '@/components/onboarding/ParentalConsentForm';

/**
 * Reusable player-profile creation form.
 * Pre-fills the parent/guardian name + email from the logged-in user,
 * uses tappable chips for age / positions / relationship for reliable
 * state persistence, and always ends with a real e-signed parental
 * consent step (ParentalConsentForm) before the profile is created —
 * no bypass, including in "quick" mode (which only trims which optional
 * fields are shown, not the consent requirement itself).
 */
export default function PlayerCreateForm({ user, defaultAge = '', defaultPositions = [], onCreated, onCancel, submitLabel = 'Create Player', quick = false }) {
  const [step, setStep] = useState('details');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [age, setAge] = useState(defaultAge);
  const [positions, setPositions] = useState(defaultPositions);
  const [guardianName, setGuardianName] = useState(user?.full_name || '');
  const [guardianRelationship, setGuardianRelationship] = useState(quick ? 'Legal Guardian' : '');
  const [guardianEmail, setGuardianEmail] = useState(user?.email || '');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const detailsValid = first && last && guardianName && guardianRelationship;

  const goToConsent = (e) => {
    e?.preventDefault?.();
    setError('');
    if (!user) { setError('Please wait for your account to load.'); return; }
    if (!detailsValid) { setError('First/last name and parent/guardian name and relationship are required.'); return; }
    setStep('consent');
  };

  const handleSigned = async (consent) => {
    setCreating(true);
    setError('');
    try {
      const p = await base44.entities.PlayerProfile.create({
        first_name: first,
        last_name: last,
        age_division: age,
        positions,
        parent_id: user.id,
        guardian_name: guardianName,
        guardian_email: guardianEmail || user.email,
        guardian_phone: guardianPhone,
        guardian_relationship: guardianRelationship,
        has_accepted_parental_terms: true,
        parental_terms_accepted_at: consent.signed_at
      });
      await base44.entities.ParentalConsent.create({
        player_id: p.id,
        ...consent
      });
      onCreated?.(p);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not create player. Please try again.');
      setStep('details');
    } finally {
      setCreating(false);
    }
  };

  if (step === 'consent') {
    return (
      <div className="space-y-4">
        <p className="text-sm font-semibold" style={{ color: '#0B1528' }}>One more step — parent/guardian consent</p>
        <ParentalConsentForm
          playerFirstName={first}
          defaultName={guardianName}
          defaultRelationship={guardianRelationship}
          onSigned={handleSigned}
          onCancel={() => setStep('details')}
        />
        {creating && <p className="text-xs text-center" style={{ color: '#94A3B8' }}>Creating player profile...</p>}
      </div>
    );
  }

  return (
    <form onSubmit={goToConsent} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="np-first-name" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>First Name *</label>
          <input
            id="np-first-name"
            name="first_name"
            value={first}
            onChange={e => setFirst(e.target.value)}
            placeholder="Knox"
            className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
            style={{ color: '#0B1528' }}
          />
        </div>
        <div>
          <label htmlFor="np-last-name" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Last Name *</label>
          <input
            id="np-last-name"
            name="last_name"
            value={last}
            onChange={e => setLast(e.target.value)}
            placeholder="Jamison"
            className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
            style={{ color: '#0B1528' }}
          />
        </div>
      </div>

      <div>
        <span id="np-age" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Age Division</span>
        <div role="group" aria-labelledby="np-age" className="grid grid-cols-4 gap-2">
          {['8U','9U','10U','11U','12U','13U','14U','15U','16U','17U','18U'].map(a => (
            <button
              key={a}
              type="button"
              onClick={() => { setAge(age === a ? '' : a); setError(''); }}
              className="py-2.5 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98]"
              style={{
                borderColor: age === a ? '#2563EB' : '#E2E8F0',
                backgroundColor: age === a ? '#EFF6FF' : '#FFFFFF',
                color: age === a ? '#2563EB' : '#64748B'
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span id="np-position" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Positions</span>
        <div role="group" aria-labelledby="np-position" className="grid grid-cols-3 gap-2">
          {['Pitcher', 'Catcher', 'Shortstop', 'Second Base', 'Third Base', 'First Base', 'Outfield', 'Utility'].map(pos => {
            const selected = positions.includes(pos);
            return (
              <button
                key={pos}
                type="button"
                onClick={() => {
                  setPositions(selected ? positions.filter(x => x !== pos) : [...positions, pos]);
                  setError('');
                }}
                className="py-2.5 px-2 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98]"
                style={{
                  borderColor: selected ? '#2563EB' : '#E2E8F0',
                  backgroundColor: selected ? '#EFF6FF' : '#FFFFFF',
                  color: selected ? '#2563EB' : '#64748B'
                }}
              >
                {pos}
              </button>
            );
          })}
        </div>
        <p className="text-xs mt-1.5" style={{ color: '#94A3B8' }}>Tap to select one or more (primary, secondary, etc.)</p>
      </div>

      <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE' }}>
        <p className="text-xs font-semibold" style={{ color: '#1E3A8A' }}>
          Parent / Guardian Information (required — player pages are parent/guardian-run)
        </p>
        <div>
          <label htmlFor="np-guardian-name" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Parent / Guardian Name *</label>
          <input
            id="np-guardian-name"
            name="guardian_name"
            value={guardianName}
            onChange={e => setGuardianName(e.target.value)}
            placeholder="Parent / Guardian name"
            className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
            style={{ color: '#0B1528' }}
          />
        </div>
        <div>
          <span id="np-guardian-relationship" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Relationship *</span>
          <div role="group" aria-labelledby="np-guardian-relationship" className="grid grid-cols-3 gap-2">
            {['Mother', 'Father', 'Legal Guardian', 'Grandparent', 'Other'].map(r => (
              <button
                key={r}
                type="button"
                onClick={() => { setGuardianRelationship(guardianRelationship === r ? '' : r); setError(''); }}
                className="py-3 px-2 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98]"
                style={{
                  borderColor: guardianRelationship === r ? '#2563EB' : '#E2E8F0',
                  backgroundColor: guardianRelationship === r ? '#EFF6FF' : '#FFFFFF',
                  color: guardianRelationship === r ? '#2563EB' : '#64748B'
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="np-guardian-email" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Email</label>
            <input
              id="np-guardian-email"
              name="guardian_email"
              value={guardianEmail}
              onChange={e => setGuardianEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
              style={{ color: '#0B1528' }}
            />
          </div>
          <div>
            <label htmlFor="np-guardian-phone" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Phone</label>
            <input
              id="np-guardian-phone"
              name="guardian_phone"
              value={guardianPhone}
              onChange={e => setGuardianPhone(e.target.value)}
              placeholder="Phone"
              className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
              style={{ color: '#0B1528' }}
            />
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed px-1" style={{ color: '#94A3B8' }}>
        Next, you'll review and electronically sign a parent/guardian consent statement.
      </p>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-1 py-4 rounded-2xl font-bold border-2 border-gray-200" style={{ color: '#64748B' }}>
            Cancel
          </button>
        )}
        <button type="submit" className="flex-1 py-4 rounded-2xl font-bold text-white transition-opacity" style={{ backgroundColor: '#2563EB' }}>
          Continue to Consent
        </button>
      </div>
    </form>
  );
}
