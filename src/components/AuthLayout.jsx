import React from "react";
import GameDayLogo from "@/components/GameDayLogo";
import { Trophy, MapPinned, Users, ShieldCheck } from "lucide-react";

export default function AuthLayout({ title, kicker, subtitle, footer, children, panelMode = "login" }) {
  const highlights = panelMode === "register"
    ? [
        { icon: Users, label: "Parents", text: "Manage player profiles and weekend availability." },
        { icon: Trophy, label: "Coaches", text: "Post roster needs and review applicants fast." },
        { icon: MapPinned, label: "Tournaments", text: "Search events by age, association, and location." }
      ]
    : [
        { icon: Trophy, label: "Roster Needs", text: "Find the right fit before first pitch." },
        { icon: MapPinned, label: "Tournament Finder", text: "Discover events by market and association." },
        { icon: ShieldCheck, label: "Trusted Network", text: "Parent-managed profiles and coach-driven opportunities." }
      ];

  return (
    <div className="gdr-auth-screen min-h-screen flex items-center justify-center px-4 py-6 sm:py-8">
      <div className="gdr-auth-shell w-full max-w-6xl overflow-hidden rounded-[28px]">
        <div className="grid lg:grid-cols-[1.02fr_0.98fr]">
          <section className="gdr-auth-ballpark gdr-premium-auth-panel relative min-h-[330px] lg:min-h-[760px] p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div className="relative z-10 flex items-center justify-between gap-4">
              <GameDayLogo size={42} showText={true} light={true} />
              <span className="gdr-auth-badge rounded-full">BASEBALL FIRST</span>
            </div>

            <div className="gdr-diamond-scene gdr-auth-diamond-focus" aria-hidden="true">
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

            <div className="relative z-10 max-w-xl pt-14 lg:pt-0">
              <p className="gdr-auth-kicker mb-4">TRAVEL BASEBALL MARKETPLACE</p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl leading-[0.92] text-white font-black tracking-[-0.06em]">
                Every connection creates an opportunity.
              </h2>
              <p className="mt-5 text-sm sm:text-base leading-relaxed max-w-md" style={{ color: '#CBD5E1' }}>
                A premium roster network for travel baseball families, coaches, organizations, and tournament discovery.
              </p>
            </div>

            <div className="relative z-10 grid sm:grid-cols-3 lg:grid-cols-1 gap-3 mt-8 lg:mt-0">
              {highlights.map(item => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="gdr-auth-value-card rounded-2xl p-4 flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(193,18,31,0.20)' }}>
                      <Icon size={19} color="#FCA5A5" />
                    </div>
                    <div>
                      <div className="text-white text-sm font-black uppercase tracking-[0.12em]">{item.label}</div>
                      <div className="text-xs leading-relaxed mt-1" style={{ color: '#CBD5E1' }}>{item.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-white px-5 py-7 sm:px-8 lg:px-12 lg:py-14 flex items-center">
            <div className="w-full max-w-md mx-auto">
              <div className="mb-7">
                <p className="gdr-auth-kicker mb-3" style={{ color: '#C1121F' }}>{kicker}</p>
                <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.05em]" style={{ color: '#0B1528' }}>{title}</h1>
                {subtitle && <p className="mt-3 text-sm sm:text-base leading-relaxed" style={{ color: '#64748B' }}>{subtitle}</p>}
              </div>

              <div className="gdr-auth-form-card rounded-[24px] border p-5 sm:p-6">
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