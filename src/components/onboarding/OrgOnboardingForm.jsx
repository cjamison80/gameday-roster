import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function OrgOnboardingForm({ user, onComplete }) {
  const [form, setForm] = useState({ name: '', city: '', state: '', description: '', website: '' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const valid = form.name;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await base44.entities.Organization.create({
        owner_id: user.id,
        name: form.name,
        city: form.city,
        state: form.state,
        description: form.description,
        website: form.website,
        sports: ['baseball']
      });
      onComplete();
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  return (
    <div className="px-6 space-y-4 flex-1">
      <Field label="Organization Name *" value={form.name} onChange={set('name')} placeholder="Gold Glove Elite" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="City" value={form.city} onChange={set('city')} placeholder="Rogers" />
        <Field label="State" value={form.state} onChange={set('state')} placeholder="AR" />
      </div>
      <Field label="Website" value={form.website} onChange={set('website')} placeholder="https://..." />
      <Area label="Description" value={form.description} onChange={set('description')} placeholder="Tell families about your organization..." />
      <button
        onClick={submit}
        disabled={!valid || saving}
        className="w-full py-4 rounded-2xl font-bold text-white transition-opacity"
        style={{ backgroundColor: '#8B5CF6', opacity: valid ? 1 : 0.6 }}
      >
        {saving ? 'Creating...' : 'Create Organization & Continue'}
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