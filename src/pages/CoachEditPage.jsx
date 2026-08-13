import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SkeletonCard } from '@/components/SkeletonCard';

export default function CoachEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coach, setCoach] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const c = await base44.entities.CoachProfile.get(id);
      setCoach(c);
      if (c.user_id !== user.id) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      setForm({
        bio: c.bio || '',
        years_coaching: c.years_coaching ?? '',
        city: c.city || '',
        state: c.state || '',
        phone: c.phone || ''
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.CoachProfile.update(id, {
        bio: form.bio,
        years_coaching: form.years_coaching === '' ? undefined : parseInt(form.years_coaching),
        city: form.city,
        state: form.state,
        phone: form.phone
      });
      navigate(`/coach/${id}`);
    } catch (e) {
      console.error(e);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="gdr-page">
        <div className="px-5 py-5 space-y-3">{[1, 2].map(i => <SkeletonCard key={i} />)}</div>
      </div>
    );
  }

  if (authorized === false) {
    return (
      <div className="gdr-page flex flex-col items-center justify-center px-6 text-center">
        <p className="font-semibold" style={{ color: '#0B1528' }}>You can only edit your own profile</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-sm font-semibold" style={{ color: '#C1121F' }}>Go back</button>
      </div>
    );
  }

  return (
    <div className="gdr-page">
      <div className="gdr-hero px-5 pt-14 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <h1 className="text-2xl text-white">Edit Profile</h1>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5 pb-24">
        <div className="gdr-card p-5 space-y-3">
          <TextArea label="About Me" value={form.bio} onChange={setField('bio')} placeholder="Tell families about your coaching philosophy..." />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Years Coaching" type="number" value={form.years_coaching} onChange={setField('years_coaching')} placeholder="12" />
            <Field label="Phone" value={form.phone} onChange={setField('phone')} placeholder="(555) 555-5555" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" value={form.city} onChange={setField('city')} placeholder="Rogers" />
            <Field label="State" value={form.state} onChange={setField('state')} placeholder="AR" />
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-4 rounded-2xl font-bold text-white transition-opacity"
          style={{ backgroundColor: '#2563EB', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
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

function TextArea({ label, ...props }) {
  return (
    <div>
      <label className="text-sm font-semibold mb-1.5 block" style={{ color: '#64748B' }}>{label}</label>
      <textarea {...props} rows={4}
        className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none resize-none"
        style={{ color: '#0B1528' }} />
    </div>
  );
}
