import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronRight, ArrowLeft, Check, Users, Briefcase, Building2 } from 'lucide-react';
import GameDayLogo from '@/components/GameDayLogo';

const roles = [
  {
    id: 'parent',
    icon: Users,
    title: 'Parent / Player',
    description: 'Find opportunities and manage player profiles',
    color: '#16A34A',
    bg: '#DCFCE7'
  },
  {
    id: 'coach',
    icon: Briefcase,
    title: 'Coach',
    description: 'Find players and manage your team roster',
    color: '#2563EB',
    bg: '#EFF6FF'
  },
  {
    id: 'organization',
    icon: Building2,
    title: 'Organization',
    description: 'Manage teams, coaches and run recruiting',
    color: '#8B5CF6',
    bg: '#F5F3FF'
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0=welcome, 1=role
  const [selectedRole, setSelectedRole] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleRoleSelect = async (role) => {
    setSelectedRole(role);
    setSaving(true);
    try {
      const user = await base44.auth.me();
      // Check if profile exists
      const existing = await base44.entities.UserProfile.filter({ user_id: user.id });
      if (existing.length > 0) {
        await base44.entities.UserProfile.update(existing[0].id, { role, onboarding_complete: false, onboarding_step: 1 });
      } else {
        await base44.entities.UserProfile.create({ user_id: user.id, role, onboarding_complete: false, onboarding_step: 1 });
      }
      navigate('/discover');
    } catch (e) {
      setSaving(false);
    }
  };

  if (step === 0) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0B1528' }}>
        {/* Background image overlay */}
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url(https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative z-10 flex flex-col min-h-screen">
          <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
            <GameDayLogo size={56} showText={true} light={true} />
            <div className="mt-8 text-center">
              <h1 className="text-4xl font-black text-white leading-tight">
                Connect.<br />Compete.<br />
                <span style={{ color: '#A4A017' }}>Win Together.</span>
              </h1>
              <p className="mt-4 text-lg" style={{ color: '#94A3B8' }}>
                The trusted network for travel sports.
              </p>
            </div>
          </div>

          <div className="px-6 pb-12 space-y-3">
            <button
              onClick={() => setStep(1)}
              className="w-full py-4 rounded-2xl font-bold text-white text-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
              style={{ backgroundColor: '#2563EB' }}
            >
              Get Started
              <ChevronRight size={20} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 rounded-2xl font-semibold text-center text-base"
              style={{ color: '#94A3B8' }}
            >
              Already have an account? <span className="text-white font-bold">Log In</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="px-6 pt-14 pb-6">
        <button onClick={() => setStep(0)} className="p-2 -ml-2 mb-4">
          <ArrowLeft size={24} color="#0B1528" />
        </button>
        <div className="flex items-center gap-3 mb-8">
          <GameDayLogo size={32} showText={true} />
        </div>
        <h1 className="text-3xl font-black" style={{ color: '#0B1528' }}>Welcome!</h1>
        <p className="mt-2 text-base" style={{ color: '#64748B' }}>
          Choose how you'll use GameDay Roster.
        </p>
      </div>

      <div className="px-6 space-y-4 flex-1">
        {roles.map(role => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => handleRoleSelect(role.id)}
              disabled={saving}
              className="w-full text-left rounded-2xl border-2 p-5 flex items-center gap-4 transition-all active:scale-[0.98]"
              style={{
                borderColor: isSelected ? role.color : '#E2E8F0',
                backgroundColor: isSelected ? role.bg : '#FFFFFF'
              }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: role.bg }}>
                <Icon size={26} color={role.color} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg" style={{ color: '#0B1528' }}>{role.title}</div>
                <div className="text-sm mt-0.5" style={{ color: '#64748B' }}>{role.description}</div>
              </div>
              <ChevronRight size={20} color="#94A3B8" />
            </button>
          );
        })}
      </div>

      <div className="px-6 py-8">
        <p className="text-xs text-center" style={{ color: '#94A3B8' }}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}