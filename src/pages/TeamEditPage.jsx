import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SkeletonCard } from '@/components/SkeletonCard';

export default function TeamEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
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
      const t = await base44.entities.Team.get(id);
      setTeam(t);
      if (t.head_coach_id !== user.id) {
        setAuthorized(false);
        return;
      }
      setAuthorized(true);
      setForm({
        bio: t.bio || '',
        philosophy: t.philosophy || '',
        wins: t.wins ?? '',
        losses: t.losses ?? '',
        ties: t.ties ?? '',
        season_label: t.season_label || '',
        roster_size: t.roster_size ?? '',
        is_recruiting: !!t.is_recruiting,
        assistant_coaches: t.assistant_coaches?.length ? t.assistant_coaches : []
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const addAssistant = () => setForm(f => ({ ...f, assistant_coaches: [...f.assistant_coaches, { name: '', role: '' }] }));
  const updateAssistant = (idx, key, value) => setForm(f => ({
    ...f,
    assistant_coaches: f.assistant_coaches.map((a, i) => i === idx ? { ...a, [key]: value } : a)
  }));
  const removeAssistant = (idx) => setForm(f => ({ ...f, assistant_coaches: f.assistant_coaches.filter((_, i) => i !== idx) }));

  const save = async () => {
    setSaving(true);
    try {
      await base44.entities.Team.update(id, {
        bio: form.bio,
        philosophy: form.philosophy,
        wins: form.wins === '' ? undefined : parseInt(form.wins),
        losses: form.losses === '' ? undefined : parseInt(form.losses),
        ties: form.ties === '' ? undefined : parseInt(form.ties),
        season_label: form.season_label,
        roster_size: form.roster_size === '' ? undefined : parseInt(form.roster_size),
        is_recruiting: form.is_recruiting,
        assistant_coaches: form.assistant_coaches.filter(a => a.name?.trim())
      });
      navigate(`/team/${id}`);
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
        <p className="font-semibold" style={{ color: '#0B1528' }}>You can only edit your own team</p>
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
          <h1 className="text-2xl text-white">Edit {team.name}</h1>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5 pb-24">
        <Section title="About">
          <TextArea label="Team Bio" value={form.bio} onChange={setField('bio')} placeholder="Tell families about your team..." />
          <TextArea label="Team Philosophy" value={form.philosophy} onChange={setField('philosophy')} placeholder="Playing style, coaching approach, development focus..." />
        </Section>

        <Section title="Record">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Wins" type="number" value={form.wins} onChange={setField('wins')} placeholder="0" />
            <Field label="Losses" type="number" value={form.losses} onChange={setField('losses')} placeholder="0" />
            <Field label="Ties" type="number" value={form.ties} onChange={setField('ties')} placeholder="0" />
          </div>
          <Field label="Season" value={form.season_label} onChange={setField('season_label')} placeholder="2026 Fall Season" />
        </Section>

        <Section title="Roster">
          <Field label="Roster Size" type="number" value={form.roster_size} onChange={setField('roster_size')} placeholder="12" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recruiting} onChange={setField('is_recruiting')} />
            <span className="text-sm font-semibold" style={{ color: '#0B1528' }}>Currently recruiting players</span>
          </label>
        </Section>

        <Section title="Coaching Staff">
          <div className="space-y-3">
            {form.assistant_coaches.map((a, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={a.name}
                  onChange={e => updateAssistant(idx, 'name', e.target.value)}
                  placeholder="Name"
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                />
                <input
                  value={a.role}
                  onChange={e => updateAssistant(idx, 'role', e.target.value)}
                  placeholder="Role (e.g. Pitching Coach)"
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm border border-gray-200 outline-none"
                  style={{ color: '#0B1528' }}
                />
                <button onClick={() => removeAssistant(idx)} className="p-2 flex-shrink-0" style={{ color: '#DC2626' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            <button
              onClick={addAssistant}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border-2 border-dashed"
              style={{ color: '#2563EB', borderColor: '#BFDBFE' }}
            >
              <Plus size={16} />
              Add Assistant Coach
            </button>
          </div>
        </Section>

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

function Section({ title, children }) {
  return (
    <div className="gdr-card p-5 space-y-3">
      <h2 className="font-semibold" style={{ color: '#0B1528' }}>{title}</h2>
      {children}
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
      <textarea {...props} rows={3}
        className="w-full rounded-xl px-4 py-3 text-sm border border-gray-200 outline-none resize-none"
        style={{ color: '#0B1528' }} />
    </div>
  );
}
