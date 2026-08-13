import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

// Consent text is versioned so a later edit to this string never retroactively
// changes what a specific parent already agreed to \u2014 each signature stores
// its own verbatim snapshot (see ParentalConsent.consent_text_snapshot).
// NOTE: this text is a starting point written for how the app actually
// behaves today. It has not been reviewed by a lawyer and should be before
// being treated as your final compliance document.
export const CONSENT_VERSION = 'v1-2026-08-13';
export const CONSENT_TEXT = `Parent/Guardian Consent for Player Profile

By signing below, you confirm that you are the parent or legal guardian of the player named on this profile, and that you consent to GameDay Roster collecting and displaying the following information about them: name, birth year/age division, photo, position(s), physical stats (height/weight), academic info (GPA) if provided, performance stats and video links if provided, links to external recruiting profiles (e.g. Perfect Game) if connected, and general location (city/state).

This information will be visible within the app to other registered coaches and families. If you choose to generate a "Public Link" for this profile, it becomes viewable by anyone who has that link, including outside the app.

You may review, correct, or request deletion of your child's information, or withdraw this consent and stop further collection, at any time by contacting support or through your account settings. GameDay Roster does not sell this information to third parties.

Typing your full legal name below and submitting this form constitutes your electronic signature and has the same effect as a handwritten signature.`;

export default function ParentalConsentForm({ playerFirstName, defaultName = '', defaultRelationship = '', onSigned, onCancel }) {
  const [fullName, setFullName] = useState(defaultName);
  const [relationship, setRelationship] = useState(defaultRelationship);
  const [affirmed, setAffirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const valid = fullName.trim().length >= 3 && relationship && affirmed;

  const submit = async () => {
    if (!valid || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const user = await base44.auth.me();
      onSigned({
        parent_user_id: user.id,
        signer_full_name: fullName.trim(),
        signer_relationship: relationship,
        consent_version: CONSENT_VERSION,
        consent_text_snapshot: CONSENT_TEXT,
        signed_at: new Date().toISOString()
      });
    } catch (e) {
      console.error(e);
      setError('Could not verify your account. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 max-h-64 overflow-y-auto text-xs leading-relaxed whitespace-pre-line" style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569' }}>
        {CONSENT_TEXT}
      </div>

      <div>
        <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Your Relationship to {playerFirstName || 'the Player'} *</label>
        <div className="grid grid-cols-3 gap-2">
          {['Mother', 'Father', 'Legal Guardian', 'Grandparent', 'Self', 'Other'].map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRelationship(relationship === r ? '' : r)}
              className="py-2.5 px-2 rounded-xl border-2 text-sm font-bold transition-all active:scale-[0.98]"
              style={{
                borderColor: relationship === r ? '#2563EB' : '#E2E8F0',
                backgroundColor: relationship === r ? '#EFF6FF' : '#FFFFFF',
                color: relationship === r ? '#2563EB' : '#64748B'
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Type Your Full Legal Name to Sign *</label>
        <input
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Your full name"
          className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
          style={{ color: '#0B1528', fontFamily: 'cursive', fontSize: '18px' }}
        />
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={affirmed}
          onChange={e => setAffirmed(e.target.checked)}
          className="mt-0.5 w-5 h-5 flex-shrink-0"
          style={{ accentColor: '#2563EB' }}
        />
        <span className="text-xs leading-relaxed" style={{ color: '#475569' }}>
          I have read the consent statement above, I am this player's parent or legal guardian, and I am electronically signing to give my consent.
        </span>
      </label>

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
        <button
          type="button"
          onClick={submit}
          disabled={!valid || submitting}
          className="flex-1 py-4 rounded-2xl font-bold text-white transition-opacity"
          style={{ backgroundColor: '#2563EB', opacity: valid ? 1 : 0.6 }}
        >
          {submitting ? 'Signing...' : 'Sign & Continue'}
        </button>
      </div>
    </div>
  );
}
