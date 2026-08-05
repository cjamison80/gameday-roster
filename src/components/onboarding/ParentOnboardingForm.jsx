import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PARENTAL_TERMS = 'I understand that this player page is created and managed by a parent or legal guardian. Player profiles on GameDay Roster are owned, controlled, and posted by the parent/guardian on behalf of their athlete. I confirm I am the parent or legal guardian of this player and am authorized to create this page. I agree to provide accurate guardian information and to comply with all safety and community guidelines.';

export default function ParentOnboardingForm({ user, onComplete }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', age_division: '', position: '', city: '', state: '',
    guardian_name: user?.full_name || '', guardian_relationship: '', guardian_email: user?.email || '', guardian_phone: ''
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const valid = form.first_name && form.last_name && form.guardian_name && form.guardian_relationship && acceptedTerms;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await base44.entities.PlayerProfile.create({
        parent_id: user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        age_division: form.age_division,
        positions: form.position ? [form.position] : [],
        city: form.city,
        state: form.state,
        is_public: true,
        guardian_name: form.guardian_name,
        guardian_relationship: form.guardian_relationship,
        guardian_email: form.guardian_email,
        guardian_phone: form.guardian_phone,
        has_accepted_parental_terms: true,
        parental_terms_accepted_at: new Date().toISOString()
      });
      onComplete();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className="px-6 space-y-4 flex-1">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name *" value={form.first_name} onChange={set('first_name')} placeholder="Knox" />
        <Field label="Last Name *" value={form.last_name} onChange={set('last_name')} placeholder="Jamison" />
      </div>
      <Select label="Age Division" value={form.age_division} onChange={set('age_division')}
        options={['8U','9U','10U','11U','12U','13U','14U','15U','16U','17U','18U']} />
      <Select label="Primary Position" value={form.position} onChange={set('position')}
        options={['Pitcher','Catcher','Shortstop','Second Base','Third Base','First Base','Outfield','Utility']} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" value={form.city} onChange={set('city')} placeholder="Rogers" />
        <Field label="State" value={form.state} onChange={set('state')} placeholder="AR" />
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE' }}>
        <div className="flex items-start gap-2 mb-3">
          <ShieldCheck size={18} color="#2563EB" className="flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed font-semibold" style={{ color: '#1E3A8A' }}>
            Player pages are parent/guardian-run. Please provide the parent or guardian's information for this player.
          </p>
        </div>
        <Field label="Parent / Guardian Name *" value={form.guardian_name} onChange={set('guardian_name')} placeholder="Jamie Jamison" />
        <div className="h-3" />
        <Select label="Relationship *" value={form.guardian_relationship} onChange={set('guardian_relationship')}
          options={['Mother','Father','Legal Guardian','Grandparent','Other']} />
        <div className="h-3" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email" value={form.guardian_email} onChange={set('guardian_email')} placeholder="jamie@email.com" />
          <Field label="Phone" value={form.guardian_phone} onChange={set('guardian_phone')} placeholder="(555) 123-4567" />
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={e => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded flex-shrink-0"
          style={{ accentColor: '#2563EB' }}
        />
        <span className="text-xs leading-relaxed" style={{ color: '#475569' }}>{PARENTAL_TERMS}</span>
      </label>

      <button
        onClick={submit}
        disabled={!valid || saving}
        className="w-full py-4 rounded-2xl font-bold text-white transition-opacity"
        style={{ backgroundColor: '#2563EB', opacity: valid ? 1 : 0.6 }}
      >
        {saving ? 'Saving...' : 'Save & Continue'}
      </button>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>{label}</label>
      <input {...props}
        className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
        style={{ color: '#0B1528' }} />
    </div>
  );
}

function Select({ label, options, ...props }) {
  return (
    <div>
      <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>{label}</label>
      <select {...props}
        className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
        style={{ color: '#0B1528' }}>
        <option value="">Select {label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}