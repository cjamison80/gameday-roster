import React, { useState } from 'react';
import { Camera, Loader2, ShieldCheck, Calendar, AlertTriangle, ArrowLeft, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';

const POSITIONS = ['Pitcher', 'Catcher', 'Shortstop', 'Second Base', 'Third Base', 'First Base', 'Outfield', 'Utility'];
const AGE_DIVISIONS = ['8U', '9U', '10U', '11U', '12U', '13U', '14U', '15U', '16U', '17U', '18U', '18+'];
const HAND_OPTIONS = ['Right', 'Left', 'Switch'];

const currentYear = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 15 }, (_, i) => currentYear - 6 + i);

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d)) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export default function PlayerOnboardingForm({ user, onComplete, onBackToRole }) {
  const [stage, setStage] = useState('dob'); // dob | profile
  const [dob, setDob] = useState('');
  const [form, setForm] = useState({
    first_name: '', last_name: '',
    age_division: '', graduation_year: '',
    primary_position: '', secondary_position: '',
    bats: '', throws: '', bio: '',
    photo_url: '', city: '', state: ''
  });
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

  const age = calcAge(dob);
  const ageBlocked = dob && age !== null && age < 18;
  const ageVerified = dob && age !== null && age >= 18;

  const submit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    if (!form.first_name || !form.last_name || saving) return;
    setSaving(true);
    try {
      const positions = [form.primary_position, form.secondary_position].filter(Boolean);
      const dobObj = new Date(dob);
      await base44.entities.PlayerProfile.create({
        parent_id: user.id,
        first_name: form.first_name,
        last_name: form.last_name,
        photo_url: form.photo_url,
        bio: form.bio,
        birth_year: dobObj.getFullYear(),
        age_division: form.age_division,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year, 10) : undefined,
        positions,
        bats: form.bats,
        throws: form.throws,
        city: form.city,
        state: form.state,
        is_public: true,
        guardian_name: user.full_name,
        guardian_relationship: 'Self',
        guardian_email: user.email,
        has_accepted_parental_terms: true,
        parental_terms_accepted_at: new Date().toISOString()
      });
      onComplete();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Could not create your player profile. Please try again.');
      setSaving(false);
    }
  };

  if (stage === 'dob') {
    return (
      <form className="px-6 space-y-5 flex-1" onSubmit={(e) => { e.preventDefault(); if (ageVerified) setStage('profile'); }}>
        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#FEFCE8' }}>
            <Calendar size={26} color="#A4A017" />
          </div>
          <h2 className="text-lg font-black mt-3" style={{ color: '#0B1528' }}>Confirm your date of birth</h2>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Players must be at least 18 years old to set up and manage their own player account.
          </p>
        </div>

        <div>
          <label htmlFor="player-dob" className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>Date of Birth *</label>
          <input
            id="player-dob"
            name="date_of_birth"
            type="date"
            aria-label="Date of Birth"
            value={dob}
            onChange={(e) => { setDob(e.target.value); setError(''); }}
            className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none"
            style={{ color: '#0B1528' }}
            required
          />
        </div>

        {ageBlocked && (
          <div className="rounded-2xl p-4 flex gap-3" style={{ backgroundColor: '#FEE2E2' }}>
            <AlertTriangle size={20} color="#DC2626" className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold" style={{ color: '#DC2626' }}>You must be 18 or older</p>
              <p className="text-xs mt-1" style={{ color: '#991B1B' }}>
                Players under 18 need a parent or legal guardian to create and manage their profile. Please go back and choose the Parent account type.
              </p>
              <button
                type="button"
                onClick={onBackToRole}
                className="mt-3 text-sm font-bold inline-flex items-center gap-1"
                style={{ color: '#DC2626' }}
              >
                <ArrowLeft size={14} /> Back to account types
              </button>
            </div>
          </div>
        )}

        {ageVerified && (
          <div className="rounded-2xl p-3 flex items-center gap-2" style={{ backgroundColor: '#DCFCE7' }}>
            <Check size={18} color="#16A34A" />
            <span className="text-sm font-semibold" style={{ color: '#15803D' }}>Verified — you are {age} years old.</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!ageVerified}
          className="w-full py-4 rounded-2xl font-bold text-white transition-opacity"
          style={{ backgroundColor: '#A4A017', opacity: ageVerified ? 1 : 0.5 }}
        >
          Continue
        </button>
      </form>
    );
  }

  return (
    <form id="player-onboarding-form" onSubmit={submit} className="px-6 space-y-4 flex-1">
      <div className="rounded-2xl p-3 flex items-start gap-2" style={{ backgroundColor: '#FEFCE8' }}>
        <ShieldCheck size={18} color="#A4A017" className="flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed" style={{ color: '#713F12' }}>
          As an adult player, you manage your own profile. Please enter your details below.
        </p>
      </div>

      <div className="flex flex-col items-center pb-1">
        <label htmlFor="plo-photo" className="cursor-pointer">
          <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center relative"
            style={{ backgroundColor: '#FEFCE8', border: '2px solid #FEF08A' }}>
            {uploading ? (
              <Loader2 className="animate-spin" size={26} color="#A4A017" />
            ) : form.photo_url ? (
              <Image src={form.photo_url} alt="Player" className="w-24 h-24" fittingType="fill" />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Camera size={24} color="#A4A017" />
                <span className="text-xs font-semibold" style={{ color: '#A4A017' }}>Add Photo</span>
              </div>
            )}
          </div>
        </label>
        <input id="plo-photo" name="photo" type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        <span className="text-xs mt-2" style={{ color: '#94A3B8' }}>Profile photo (optional)</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field id="plo-first-name" label="First Name *" value={form.first_name} onChange={set('first_name')} placeholder="Alex" />
        <Field id="plo-last-name" label="Last Name *" value={form.last_name} onChange={set('last_name')} placeholder="Johnson" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select id="plo-age-division" name="age_division" label="Age Division" value={form.age_division} onChange={set('age_division')} options={AGE_DIVISIONS} />
        <Select id="plo-grad-year" name="graduation_year" label="Graduation Year" value={form.graduation_year} onChange={set('graduation_year')} options={GRAD_YEARS.map(String)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select id="plo-primary-position" name="primary_position" label="Primary Position" value={form.primary_position} onChange={set('primary_position')} options={POSITIONS} />
        <Select id="plo-secondary-position" name="secondary_position" label="Secondary Position" value={form.secondary_position} onChange={set('secondary_position')} options={POSITIONS} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select id="plo-bats" name="bats" label="Bats" value={form.bats} onChange={set('bats')} options={HAND_OPTIONS} />
        <Select id="plo-throws" name="throws" label="Throws" value={form.throws} onChange={set('throws')} options={['Right', 'Left']} />
      </div>

      <TextArea id="plo-bio" name="bio" label="Bio" value={form.bio} onChange={set('bio')} placeholder="Tell coaches about yourself..." />

      <div className="grid grid-cols-2 gap-3">
        <Field id="plo-city" label="City" value={form.city} onChange={set('city')} placeholder="Austin" />
        <Field id="plo-state" label="State" value={form.state} onChange={set('state')} placeholder="TX" />
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!form.first_name || !form.last_name || saving}
        className="w-full py-4 rounded-2xl font-bold text-white transition-opacity"
        style={{ backgroundColor: '#A4A017', opacity: (form.first_name && form.last_name) ? 1 : 0.6 }}
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