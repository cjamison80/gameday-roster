import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function CoachOnboardingForm({ user, onComplete }) {
  const [coach, setCoach] = useState({ first_name: '', last_name: '', city: '', state: '', bio: '', years_coaching: '' });
  const [team, setTeam] = useState({ name: '', age_division: '', classification: '', city: '', state: '' });
  const [saving, setSaving] = useState(false);

  const setCoachField = (k) => (e) => setCoach(f => ({ ...f, [k]: e.target.value }));
  const setTeamField = (k) => (e) => setTeam(f => ({ ...f, [k]: e.target.value }));
  const valid = coach.first_name && coach.last_name && team.name;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await base44.entities.CoachProfile.create({
        user_id: user.id,
        first_name: coach.first_name,
        last_name: coach.last_name,
        city: coach.city,
        state: coach.state,
        bio: coach.bio,
        years_coaching: coach.years_coaching ? parseInt(coach.years_coaching) : undefined,
        sports: ['baseball']
      });
      await base44.entities.Team.create({
        head_coach_id: user.id,
        name: team.name,
        sport: 'baseball',
        age_division: team.age_division,
        classification: team.classification,
        city: team.city || coach.city,
        state: team.state || coach.state,
        is_recruiting: true
      });
      onComplete();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className="px-6 space-y-5 flex-1">
      <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: '#94A3B8' }}>Coach Profile</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name *" value={coach.first_name} onChange={setCoachField('first_name')} placeholder="John" />
        <Field label="Last Name *" value={coach.last_name} onChange={setCoachField('last_name')} placeholder="Carter" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" value={coach.city} onChange={setCoachField('city')} placeholder="Rogers" />
        <Field label="State" value={coach.state} onChange={setCoachField('state')} placeholder="AR" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Years Coaching" value={coach.years_coaching} onChange={setCoachField('years_coaching')} placeholder="12" type="number" />
      </div>
      <Area label="Bio" value={coach.bio} onChange={setCoachField('bio')} placeholder="Tell families about your coaching philosophy..." />

      <h3 className="text-sm font-bold uppercase tracking-wide pt-2" style={{ color: '#94A3B8' }}>First Team</h3>
      <Field label="Team Name *" value={team.name} onChange={setTeamField('name')} placeholder="Gold Glove Elite 11U AAA" />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Age Division" value={team.age_division} onChange={setTeamField('age_division')}
          options={['8U','9U','10U','11U','12U','13U','14U','15U','16U','17U','18U']} />
        <Select label="Classification" value={team.classification} onChange={setTeamField('classification')}
          options={['AAA','AA','A','Open']} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Team City" value={team.city} onChange={setTeamField('city')} placeholder="Rogers" />
        <Field label="Team State" value={team.state} onChange={setTeamField('state')} placeholder="AR" />
      </div>

      <button
        onClick={submit}
        disabled={!valid || saving}
        className="w-full py-4 rounded-2xl font-bold text-white transition-opacity"
        style={{ backgroundColor: '#2563EB', opacity: valid ? 1 : 0.6 }}
      >
        {saving ? 'Creating...' : 'Create Team & Continue'}
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
function Area({ label, ...props }) {
  return (
    <div>
      <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>{label}</label>
      <textarea {...props} rows={3}
        className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none resize-none"
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