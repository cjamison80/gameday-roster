import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bell, Building2, CheckCircle2, MapPinned, MessageCircle, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react';
import GameDayLogo from '@/components/GameDayLogo';

const audiences = [
  {
    icon: Users,
    title: 'Parents & Players',
    description: 'Create a parent-managed player profile, set weekend availability, apply to pickup roster opportunities, and share a clean player page with coaches.',
    points: ['Parent/guardian controlled profiles', 'Availability check-ins', 'Applications and player links']
  },
  {
    icon: Trophy,
    title: 'Coaches',
    description: 'Post roster needs, review applicants, search available players, manage team pages, and open parent-controlled conversations when there is a fit.',
    points: ['Roster posts', 'Applicant management', 'Team and coach profiles']
  },
  {
    icon: Building2,
    title: 'Organizations',
    description: 'Build a trusted organization presence, organize teams and coaches, centralize recruiting visibility, and help families understand who you are.',
    points: ['Organization profile', 'Team visibility', 'Coach and roster workflows']
  },
  {
    icon: MapPinned,
    title: 'Tournament Discovery',
    description: 'Find tournaments by association, state, age division, classification, cost, distance, and entered teams as source data becomes available.',
    points: ['USSSA / 2D / PG-ready model', 'Entered teams', 'Distance and cost filters']
  }
];

const steps = [
  {
    number: '01',
    title: 'Build trusted profiles',
    body: 'Families, coaches, teams, and organizations create structured profiles so opportunity is not buried in random texts, Facebook posts, or group chats.'
  },
  {
    number: '02',
    title: 'Post or discover opportunities',
    body: 'Coaches publish roster needs and families discover pickup spots, tryouts, teams, tournaments, and relevant connections.'
  },
  {
    number: '03',
    title: 'Apply and communicate safely',
    body: 'Parents submit applications for their players. Coaches review applicants and conversations stay tied to parent/guardian-controlled accounts.'
  },
  {
    number: '04',
    title: 'Keep the network moving',
    body: 'Availability, notifications, verification, reports, billing, and admin tools keep the community organized as the platform grows.'
  }
];

const trustItems = [
  'Parent-managed minor player profiles',
  'No coach-to-minor direct messaging',
  'Coach, team, and organization verification workflows',
  'Report and moderation tools',
  'Legal, privacy, media, refund, and community policy pages',
  'Admin oversight for safety, duplicates, billing, tournaments, and support'
];

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <header className="relative overflow-hidden" style={{ backgroundColor: '#0B1528' }}>
        <div className="absolute inset-0 opacity-40" aria-hidden="true" style={{
          background: 'radial-gradient(circle at 20% 10%, rgba(193,18,31,0.34), transparent 32%), radial-gradient(circle at 82% 30%, rgba(37,99,235,0.22), transparent 34%), linear-gradient(135deg, rgba(255,255,255,0.06) 0 1px, transparent 1px)',
          backgroundSize: 'auto, auto, 42px 42px'
        }} />
        <div className="relative z-10 px-5 pt-12 pb-12 max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-12">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <ArrowLeft size={22} color="#FFFFFF" />
            </button>
            <GameDayLogo size={40} showText={true} light={true} />
            <Link to="/login" className="text-xs font-black uppercase tracking-[0.16em] px-3 py-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#FFFFFF' }}>
              Sign In
            </Link>
          </div>

          <div className="max-w-4xl">
            <p className="gdr-auth-kicker mb-4">How GameDay Roster Works</p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.92] tracking-[-0.07em] text-white">
              The trusted network for travel baseball opportunity.
            </h1>
            <p className="mt-6 text-lg sm:text-xl leading-relaxed max-w-3xl" style={{ color: '#CBD5E1' }}>
              GameDay Roster helps parents, players, coaches, and organizations find the right roster opportunities, available players, teams, and tournaments — without relying on scattered texts, social posts, or word of mouth.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-black text-white text-sm uppercase tracking-[0.14em]" style={{ background: 'linear-gradient(135deg, #C1121F, #8F0F1A)' }}>
                Start Free <ArrowRight size={18} />
              </Link>
              <Link to="/legal/minor-safety" className="inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.14em] border" style={{ color: '#FFFFFF', borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.06)' }}>
                Safety First <ShieldCheck size={18} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="px-5 py-8 max-w-6xl mx-auto space-y-10 pb-16">
        <section className="gdr-card p-5 sm:p-7 border-l-4" style={{ borderLeftColor: '#C1121F' }}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEE2E2' }}>
              <Sparkles size={22} color="#C1121F" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: '#94A3B8' }}>The Problem</p>
              <h2 className="text-2xl sm:text-3xl font-black mt-1" style={{ color: '#0B1528' }}>
                Travel baseball moves fast. The tools have not caught up.
              </h2>
              <p className="text-base leading-relaxed mt-3" style={{ color: '#475569' }}>
                A team loses a player before the weekend. A family is available to guest play. A coach needs one more arm. A parent wants to know where the right tournaments are. Most of that still happens through private texts, Facebook groups, screenshots, and word of mouth. GameDay Roster organizes that activity into one trusted sports network.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <p className="gdr-editorial-kicker mb-2">What We Do</p>
              <h2 className="text-3xl font-black tracking-[-0.04em]" style={{ color: '#0B1528' }}>One platform for the people around the roster.</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {audiences.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="gdr-card p-5 sm:p-6 gdr-card-hover">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#FEE2E2' }}>
                    <Icon size={22} color="#C1121F" />
                  </div>
                  <h3 className="text-xl font-black" style={{ color: '#0B1528' }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed mt-2" style={{ color: '#64748B' }}>{item.description}</p>
                  <div className="mt-4 space-y-2">
                    {item.points.map(point => (
                      <div key={point} className="flex items-center gap-2">
                        <CheckCircle2 size={15} color="#16A34A" />
                        <span className="text-sm font-semibold" style={{ color: '#334155' }}>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid lg:grid-cols-[0.95fr_1.05fr] gap-5 items-start">
          <div className="gdr-card p-5 sm:p-6" style={{ backgroundColor: '#0B1528' }}>
            <p className="gdr-auth-kicker mb-3">Why It Matters</p>
            <h2 className="text-3xl font-black tracking-[-0.05em] text-white">Every connection creates an opportunity.</h2>
            <p className="text-base leading-relaxed mt-4" style={{ color: '#CBD5E1' }}>
              The goal is not just to list players or post openings. The goal is to help the right family, the right coach, and the right opportunity find each other faster — while keeping youth sports communication safer and more organized.
            </p>
            <div className="mt-6 grid gap-3">
              {[
                { icon: Bell, label: 'Alerts when something changes' },
                { icon: MessageCircle, label: 'Communication tied to real opportunities' },
                { icon: ShieldCheck, label: 'Parent-first trust and safety model' }
              ].map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 rounded-2xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                    <Icon size={18} color="#FCA5A5" />
                    <span className="text-sm font-black uppercase tracking-[0.12em]" style={{ color: '#FFFFFF' }}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            {steps.map(step => (
              <div key={step.number} className="gdr-card p-5 flex gap-4">
                <div className="text-2xl font-black tracking-[-0.05em] flex-shrink-0" style={{ color: '#C1121F' }}>{step.number}</div>
                <div>
                  <h3 className="font-black" style={{ color: '#0B1528' }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed mt-1" style={{ color: '#64748B' }}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="gdr-card p-5 sm:p-7">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E7EDE2' }}>
              <ShieldCheck size={23} color="#4F7A59" />
            </div>
            <div>
              <p className="gdr-editorial-kicker mb-1">Safety & Trust</p>
              <h2 className="text-2xl sm:text-3xl font-black" style={{ color: '#0B1528' }}>Built for youth sports realities.</h2>
              <p className="text-sm leading-relaxed mt-2" style={{ color: '#64748B' }}>
                Because the platform involves minor athletes, the trust model is intentionally centered on parents and guardians.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {trustItems.map(item => (
              <div key={item} className="flex items-start gap-2 p-3 rounded-2xl" style={{ backgroundColor: '#F8FAFC' }}>
                <CheckCircle2 size={16} color="#16A34A" className="mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold leading-relaxed" style={{ color: '#334155' }}>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="gdr-card p-6 sm:p-8 text-center" style={{ background: 'linear-gradient(135deg, #FFFFFF, #FEE2E2)' }}>
          <h2 className="text-3xl font-black tracking-[-0.05em]" style={{ color: '#0B1528' }}>Ready to build your roster network?</h2>
          <p className="text-sm sm:text-base leading-relaxed mt-3 max-w-2xl mx-auto" style={{ color: '#64748B' }}>
            Start with a free account, create your profile, and begin connecting with the people who create opportunities in travel baseball.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-white text-sm uppercase tracking-[0.14em]" style={{ backgroundColor: '#C1121F' }}>
              Create Account <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.14em] border" style={{ color: '#0B1528', borderColor: '#CBD5E1', backgroundColor: '#FFFFFF' }}>
              Sign In
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
