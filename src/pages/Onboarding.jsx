import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ChevronRight, ArrowLeft, CheckCircle2, Users, Trophy, Building2, MapPinned } from 'lucide-react';
import GameDayLogo from '@/components/GameDayLogo';
import ParentOnboardingForm from '@/components/onboarding/ParentOnboardingForm';
import CoachOnboardingForm from '@/components/onboarding/CoachOnboardingForm';
import OrgOnboardingForm from '@/components/onboarding/OrgOnboardingForm';

const roles = [
  {
    id: 'parent',
    icon: Users,
    title: 'Parent / Player',
    description: 'Create player profiles, set availability, and find pickup opportunities.',
    setupTitle: 'Create your player profile.',
    setupText: "Let's add your first player and get your family ready for weekend opportunities."
  },
  {
    id: 'coach',
    icon: Trophy,
    title: 'Coach',
    description: 'Post roster needs, review applicants, and find available players.',
    setupTitle: 'Set up your coach profile.',
    setupText: 'Create your coach profile and connect it to your first team.'
  },
  {
    id: 'organization',
    icon: Building2,
    title: 'Organization',
    description: 'Manage teams, coaches, roster needs, and tournament discovery.',
    setupTitle: 'Set up your organization.',
    setupText: 'Create the organization profile coaches and families will recognize.'
  }
];

const valueProps = [
  {
    icon: Users,
    title: 'Find Players',
    body: 'Post roster needs and discover available athletes nearby.'
  },
  {
    icon: Trophy,
    title: 'Find Opportunities',
    body: 'Build a player profile and apply for pickup spots.'
  },
  {
    icon: MapPinned,
    title: 'Find Tournaments',
    body: 'Search events by association, age, location, and cost.'
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('welcome');
  const [selectedRole, setSelectedRole] = useState(null);
  const [user, setUser] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [initialRoleHandled, setInitialRoleHandled] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || initialRoleHandled) return;
    const requestedRole = searchParams.get('role') || localStorage.getItem('gdr_selected_role') || '';
    const validRole = roles.some(r => r.id === requestedRole) ? requestedRole : '';
    if (validRole) {
      handleRoleSelect(validRole, { silent: true });
      localStorage.removeItem('gdr_selected_role');
    }
    setInitialRoleHandled(true);
  }, [user, initialRoleHandled, searchParams]);

  const saveRoleProfile = async (role) => {
    try {
      const u = user || await base44.auth.me();
      if (!u) return null;
      const existing = await base44.entities.UserProfile.filter({ user_id: u.id }).catch(() => []);
      const payload = { user_id: u.id, role, onboarding_complete: false, onboarding_step: 2 };
      if (existing.length > 0) {
        await base44.entities.UserProfile.update(existing[0].id, payload);
        return existing[0].id;
      }
      const created = await base44.entities.UserProfile.create(payload);
      return created.id;
    } catch (e) {
      return null;
    }
  };

  const handleRoleSelect = (role, options = {}) => {
    setSelectedRole(role);
    setStep(role);
    saveRoleProfile(role).then(id => {
      if (id) setProfileId(id);
    });
  };

  const finishOnboarding = (dest) => {
    if (profileId) {
      base44.entities.UserProfile.update(profileId, { onboarding_complete: true, onboarding_step: 3 }).catch(() => {});
    }
    navigate(dest);
  };

  const onCompleteByRole = {
    parent: () => finishOnboarding('/discover'),
    coach: () => finishOnboarding('/coach-dashboard'),
    organization: () => finishOnboarding('/discover')
  };

  if (step === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col gdr-auth-ballpark gdr-premium-auth-panel relative overflow-hidden" style={{ backgroundColor: '#0B1528' }}>
        <div className="gdr-diamond-scene gdr-launch-diamond" aria-hidden="true">
          <div className="gdr-outfield-arc" />
          <div className="gdr-foul-line gdr-left-line" />
          <div className="gdr-foul-line gdr-right-line" />
          <div className="gdr-baseball-diamond">
            <span className="gdr-base gdr-home" />
            <span className="gdr-base gdr-first" />
            <span className="gdr-base gdr-second" />
            <span className="gdr-base gdr-third" />
            <span className="gdr-mound" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col min-h-screen px-6 pt-12 pb-8">
          <div className="flex items-center justify-between">
            <GameDayLogo size={44} showText={true} light={true} />
            <span className="gdr-auth-badge rounded-full">START FREE</span>
          </div>

          <div className="flex-1 flex flex-col justify-center py-10">
            <p className="gdr-auth-kicker mb-4">TRAVEL BASEBALL NETWORK</p>
            <h1 className="text-5xl sm:text-6xl font-black text-white leading-[0.90] tracking-[-0.07em]">
              Find the right players, teams, and tournaments.
            </h1>
            <p className="mt-5 text-base sm:text-lg leading-relaxed max-w-xl" style={{ color: '#CBD5E1' }}>
              GameDay Roster connects travel baseball families, coaches, and organizations when opportunity opens up.
            </p>

            <div className="grid gap-3 mt-8 max-w-2xl">
              {valueProps.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="gdr-auth-value-card rounded-2xl p-4 flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(193,18,31,0.22)' }}>
                      <Icon size={20} color="#FCA5A5" />
                    </div>
                    <div>
                      <h3 className="text-white text-sm font-black uppercase tracking-[0.12em]">{item.title}</h3>
                      <p className="text-sm leading-relaxed mt-1" style={{ color: '#CBD5E1' }}>{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setStep('role')}
              className="w-full py-4 rounded-2xl font-black text-white text-sm uppercase tracking-[0.14em] flex items-center justify-center gap-2 transition-transform active:scale-95"
              style={{ background: 'linear-gradient(135deg, #C1121F, #8F0F1A)', boxShadow: '0 18px 36px rgba(193,18,31,0.28)' }}
            >
              Get Started
              <ChevronRight size={19} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.14em] border transition-transform active:scale-95"
              style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              Sign In
            </button>
            <p className="text-center text-xs pt-2" style={{ color: '#94A3B8' }}>
              Built for parents, players, coaches, and organizations.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'role') {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F7FB' }}>
        <div className="px-6 pt-14 pb-6">
          <button onClick={() => setStep('welcome')} className="p-2 -ml-2 mb-5 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
            <ArrowLeft size={22} color="#0B1528" />
          </button>
          <GameDayLogo size={38} showText={true} />
          <p className="gdr-auth-kicker mt-8 mb-3" style={{ color: '#C1121F' }}>CHOOSE YOUR ROLE</p>
          <h1 className="text-4xl font-black tracking-[-0.06em]" style={{ color: '#0B1528' }}>Start building your roster network.</h1>
          <p className="mt-3 text-base leading-relaxed" style={{ color: '#64748B' }}>Choose how you’ll use GameDay Roster. You can add more roles later.</p>
        </div>

        <div className="px-6 space-y-4 flex-1">
          {roles.map(role => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                className="w-full text-left rounded-[22px] border p-5 flex items-start gap-4 transition-all active:scale-[0.98]"
                style={{
                  borderColor: isSelected ? '#C1121F' : '#E2E8F0',
                  backgroundColor: isSelected ? '#FFF1F2' : '#FFFFFF',
                  boxShadow: isSelected ? '0 18px 42px rgba(193,18,31,0.14)' : '0 12px 28px rgba(11,21,40,0.06)'
                }}
              >
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isSelected ? '#C1121F' : '#F1F5F9' }}>
                  <Icon size={25} color={isSelected ? '#FFFFFF' : '#0B1528'} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-black text-lg" style={{ color: '#0B1528' }}>{role.title}</div>
                    {isSelected ? <CheckCircle2 size={20} color="#C1121F" /> : <ChevronRight size={20} color="#94A3B8" />}
                  </div>
                  <div className="text-sm mt-1 leading-relaxed" style={{ color: '#64748B' }}>{role.description}</div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-6 py-8">
          <p className="text-xs text-center leading-relaxed" style={{ color: '#94A3B8' }}>
            Start free. Upgrade when you need more exposure, unlimited applications, or advanced roster tools.
          </p>
        </div>
      </div>
    );
  }

  const roleConfig = roles.find(r => r.id === step) || roles[0];
  const Icon = roleConfig.icon;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F5F7FB' }}>
      <div className="px-6 pt-14 pb-6">
        <button onClick={() => setStep('role')} className="p-2 -ml-2 mb-5 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0' }}>
          <ArrowLeft size={22} color="#0B1528" />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-13 h-13 rounded-2xl flex items-center justify-center" style={{ width: 52, height: 52, backgroundColor: '#0B1528' }}>
            <Icon size={24} color="#FFFFFF" />
          </div>
          <div>
            <p className="gdr-auth-kicker" style={{ color: '#C1121F' }}>{roleConfig.title}</p>
            <h1 className="text-2xl font-black tracking-[-0.04em]" style={{ color: '#0B1528' }}>{roleConfig.setupTitle}</h1>
          </div>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{roleConfig.setupText}</p>
      </div>

      {step === 'parent' && user && <ParentOnboardingForm user={user} onComplete={onCompleteByRole.parent} />}
      {step === 'coach' && user && <CoachOnboardingForm user={user} onComplete={onCompleteByRole.coach} />}
      {step === 'organization' && user && <OrgOnboardingForm user={user} onComplete={onCompleteByRole.organization} />}

      {!user && (
        <div className="px-6 py-10">
          <div className="gdr-card p-5 text-center">
            <div className="w-8 h-8 border-4 rounded-full animate-spin mx-auto" style={{ borderColor: '#CBD5E1', borderTopColor: '#C1121F' }} />
            <p className="text-sm font-semibold mt-4" style={{ color: '#64748B' }}>Preparing your account...</p>
          </div>
        </div>
      )}

      <div className="px-6 py-8" />
    </div>
  );
}