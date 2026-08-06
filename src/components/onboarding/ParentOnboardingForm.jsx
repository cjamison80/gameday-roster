import React, { useState } from 'react';
import { ShieldCheck, Camera, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';

const PARENTAL_TERMS = 'I understand that this player page is created and managed by a parent or legal guardian. Player profiles on GameDay Roster are owned, controlled, and posted by the parent/guardian on behalf of their athlete. I confirm I am the parent or legal guardian of this player and am authorized to create this page. I agree to provide accurate guardian information and to comply with all safety and community guidelines.';

const POSITIONS = ['Pitcher', 'Catcher', 'Shortstop', 'Second Base', 'Third Base', 'First Base', 'Outfield', 'Utility'];
const AGE_DIVISIONS = ['8U', '9U', '10U', '11U', '12U', '13U', '14U', '15U', '16U', '17U', '18U'];
const HAND_OPTIONS = ['Right', 'Left', 'Switch'];

const currentYear = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 8 }, (_, i) => currentYear + i);

export default function ParentOnboardingForm({ user, onComplete }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '',
    age_division: '', graduation_year: '',
    primary_position: '', secondary_position: '',
    bats: '', throws: '',
    bio: '',
    photo_url: '',
    city: '', state: '',
    guardian_name: user?.full_name || '', guardian_relationship: '', guardian_email: user?.email || '', guardian_phone: ''
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, photo_url: file_url }));
    } catch (err) {
      console.error(err);
      setError('Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const valid = form.first_name && form.last_name && form.guardian_name && form.guardian_relationship && acceptedTerms;

  const submit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (!valid || saving) return;
    setSaving(true);
    try {
      const positions = [form.primary_position, form.secondary_position].filter(Boolean);
      await base44.entities.PlayerProfile.create({
        parent_id: user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        photo_url: form.photo_url,
        bio: form.bio,
        age_division: form.age_division,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year, 10) : undefined,
        positions,
        bats: form.bats,
        throws: form.throws,
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
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not create player. Please try again.');
      setSaving(false);
    }
  };

  return (
    <form id="parent-onboarding-form" onSubmit={submit} className="px-6 space-y-4 flex-1">
      {/* Profile photo */}
      <div className="flex flex-col items-center pb-1">
        <label htmlFor="po-photo" className="cursor-pointer">
          <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center relative"
            style={{ backgroundColor: '#EFF6FF', border: '2px solid #DBEAFE' }}>
            {uploading ? (
              <Loader2 className="animate-spin" size={26} color="#2563EB" />
            ) : form.photo_url ? (
              <Image src={form.photo_url} alt="Player" className="w-24 h-24" fittingType="fill" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Camera size={24} color="#2563EB" />
                <span className="text-xs font-semibold" style={{ color: '#2563EB' }}>Add Photo</span>
              </div>
            )}
          </div>
        </label>
        <input id="po-photo" name="photo" type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        <span className="text-xs mt-2" style={{ color: '#94A3B8' }}>Profile photo (optional)</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field id="po-first-name" label="First Name *" value={form.first_name} onChange={set('first_name')} placeholder="Alex" />
        <Field id="po-last-name" label="Last Name *" value={form.last_name} onChange={set('last_name')} placeholder="Johnson" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select id="po-age-division" name="age_division" label="Age Division" value={form.age_division} onChange={set('age_division')} options={AGE_DIVISIONS} />
        <Select id="po-grad-year" name="graduation_year" label="Graduation Year" value={form.graduation_year} onChange={set('graduation_year')} options={GRAD_YEARS.map(String)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select id="po-primary-position" name="primary_position" label="Primary Position" value={form.primary_position} onChange={set('primary_position')} options={POSITIONS} />
        <Select id="po-secondary-position" name="secondary_position" label="Secondary Position" value={form.secondary_position} onChange={set('secondary_position')} options={POSITIONS} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select id="po-bats" name="bats" label="Bats" value={form.bats} onChange={set('bats')} options={HAND_OPTIONS} />
        <Select id="po-throws" name="throws" label="Throws" value={form.throws} onChange={set('throws')} options={['Right', 'Left']} />
      </div>

      <TextArea id="po-bio" name="bio" label="Bio" value={form.bio} onChange={set('bio')} placeholder="Tell coaches about your player..." />

      <div className="grid grid-cols-2 gap-3">
        <Field id="po-city" label="City" value={form.city} onChange={set('city')} placeholder="Austin" />
        <Field id="po-state" label="State" value={form.state} onChange={set('state')} placeholder="TX" />
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE' }}>
        <div className="flex items-start gap-2 mb-3">
          <ShieldCheck size={18} color="#2563EB" className="flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed font-semibold" style={{ color: '#1E3A8A' }}>
            Player pages are parent/guardian-run. Please provide the parent or guardian's information for this player.
          </p>
        </div>
        <Field id="po-guardian-name" label="Parent / Guardian Name *" value={form.guardian_name} onChange={set('guardian_name')} placeholder="Jamie Johnson" />
        <div className="h-3" />
        <Select id="po-guardian-relationship" name="guardian_relationship" label="Relationship *" value={form.guardian_relationship} onChange={set('guardian_relationship')} options={['Mother', 'Father', 'Legal Guardian', 'Grandparent', 'Other']} />
        <div className="h-3" />
        <div className="grid grid-cols-2 gap-3">
          <Field id="po-guardian-email" label="Email" value={form.guardian_email} onChange={set('guardian_email')} placeholder="jamie@email.com" />
          <Field id="po-guardian-phone" label="Phone" value={form.guardian_phone} onChange={set('guardian_phone')} placeholder="(555) 123-4567" />
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer" htmlFor="po-terms">
        <input
          id="po-terms"
          type="checkbox"
          checked={acceptedTerms}
          onChange={e => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded flex-shrink-0"
          style={{ accentColor: '#2563EB' }}
        />
        <span className="text-xs leading-relaxed" style={{ color: '#475569' }}>{PARENTAL_TERMS}</span>
      </label>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!valid || saving}
        className="w-full py-4 rounded-2xl font-bold text-white transition-opacity"
        style={{ backgroundColor: '#2563EB', opacity: valid ? 1 : 0.6 }}
      >
        {saving ? 'Saving...' : 'Save & Continue'}
      </button>
    </form>
  );
}

function Field({ id, label, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>{label}</label>
      <input id={id} {...props}
        className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
        style={{ color: '#0B1528' }} />
    </div>
  );
}

function TextArea({ id, label, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>{label}</label>
      <textarea id={id} rows={3} {...props}
        className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none resize-none"
        style={{ color: '#0B1528' }} />
    </div>
  );
}

function Select({ id, name, label, options, value, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>{label}</label>
      <select id={id} name={name} value={value} onChange={onChange}
        className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
        style={{ color: '#0B1528' }}>
        <option value="">Select {label.replace(' *', '')}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}