import React from "react";
import { ArrowRight, MapPin, ShieldCheck, Trophy, Users } from "lucide-react";
import GameDayLogo from "@/components/GameDayLogo";

const brandFeatures = [
  {
    icon: Users,
    title: "Roster needs",
    body: "Post openings and find available players when weekends change."
  },
  {
    icon: Trophy,
    title: "Tournament finder",
    body: "Search events by market, age, association, and cost."
  },
  {
    icon: ShieldCheck,
    title: "Trusted network",
    body: "Parent-managed profiles and coach-driven opportunities."
  }
];

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  const HeaderIcon = Icon || ShieldCheck;

  return (
    <div className="gdr-auth-screen min-h-screen flex items-center justify-center px-4 py-6 sm:py-8">
      <div className="gdr-auth-shell gdr-auth-shell-modern w-full max-w-6xl overflow-hidden">
        <div className="grid lg:grid-cols-[0.92fr_1.08fr] min-h-[720px]">
          <section className="gdr-auth-brand-modern relative overflow-hidden p-7 sm:p-9 lg:p-11 flex flex-col justify-between">
            <div className="gdr-auth-brand-grid" aria-hidden="true" />
            <div className="gdr-auth-brand-orbit" aria-hidden="true" />
            <div className="gdr-auth-brand-redline" aria-hidden="true" />

            <div className="relative z-10 flex items-center justify-between gap-4">
              <GameDayLogo size={38} showText={true} light={true} />
              <span className="gdr-auth-badge gdr-auth-badge-clean">BETA</span>
            </div>

            <div className="relative z-10 max-w-xl py-12 lg:py-0">
              <p className="gdr-auth-kicker mb-4">Travel Baseball Marketplace</p>
              <h2 className="text-white leading-[0.96] tracking-[-0.07em] font-black text-[44px] sm:text-[58px] lg:text-[64px]">
                The roster network built around opportunity.
              </h2>
              <p className="mt-5 text-base sm:text-lg leading-relaxed max-w-lg" style={{ color: '#CBD5E1' }}>
                A cleaner way for travel baseball families, coaches, and organizations to connect when roster needs, pickup spots, and tournaments open up.
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {['Players', 'Coaches', 'Teams', 'Tournaments'].map(item => (
                  <span key={item} className="px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.16em]" style={{ backgroundColor: 'rgba(248,250,252,0.09)', border: '1px solid rgba(248,250,252,0.15)', color: '#E2E8F0' }}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative z-10 space-y-3">
              {brandFeatures.map(feature => {
                const FeatureIcon = feature.icon;
                return (
                  <div key={feature.title} className="gdr-auth-feature-row">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(193,18,31,0.18)' }}>
                      <FeatureIcon size={18} color="#FCA5A5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-white text-sm font-black uppercase tracking-[0.14em]">{feature.title}</h3>
                      <p className="text-sm mt-0.5 leading-snug" style={{ color: '#A9B4C7' }}>{feature.body}</p>
                    </div>
                    <ArrowRight size={16} color="rgba(248,250,252,0.38)" className="hidden sm:block" />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="gdr-auth-form-side bg-white px-5 py-8 sm:px-8 lg:px-12 lg:py-14 flex items-center">
            <div className="w-full max-w-xl mx-auto">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-2 mb-5" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
                  <MapPin size={14} color="#C1121F" />
                  <span className="text-[10px] font-black uppercase tracking-[0.16em]">GameDay access</span>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #C1121F, #8F0F1A)' }}>
                    <HeaderIcon className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl tracking-[-0.05em] font-black" style={{ color: '#0B1528' }}>{title}</h1>
                    {subtitle && <p className="mt-2 text-base leading-relaxed" style={{ color: '#64748B' }}>{subtitle}</p>}
                  </div>
                </div>
              </div>

              <div className="gdr-auth-form-card gdr-auth-form-card-modern border p-5 sm:p-7 lg:p-8">
                {children}
              </div>

              {footer && (
                <p className="text-center text-sm mt-6" style={{ color: '#64748B' }}>{footer}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}