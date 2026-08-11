import React from "react";
import GameDayLogo from "@/components/GameDayLogo";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="gdr-auth-screen min-h-screen flex items-center justify-center px-4 py-8">
      <div className="gdr-auth-shell w-full max-w-5xl overflow-hidden">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <section className="gdr-auth-ballpark relative min-h-[280px] lg:min-h-[680px] p-7 lg:p-10 flex flex-col justify-between">
            <div className="relative z-10 flex items-center justify-between">
              <GameDayLogo size={36} showText={true} light={true} />
              <span className="gdr-auth-badge">BASEBALL FIRST</span>
            </div>

            <div className="gdr-diamond-scene" aria-hidden="true">
              <div className="gdr-outfield-arc" />
              <div className="gdr-baseball-diamond">
                <span className="gdr-base gdr-home" />
                <span className="gdr-base gdr-first" />
                <span className="gdr-base gdr-second" />
                <span className="gdr-base gdr-third" />
                <span className="gdr-mound" />
              </div>
              <div className="gdr-foul-line gdr-left-line" />
              <div className="gdr-foul-line gdr-right-line" />
            </div>

            <div className="relative z-10 max-w-sm">
              <p className="gdr-editorial-kicker mb-3">GameDay Roster</p>
              <h2 className="text-4xl lg:text-5xl leading-[0.95] text-white">
                Build the roster before first pitch.
              </h2>
              <p className="mt-4 text-sm lg:text-base leading-relaxed" style={{ color: '#CBD5E1' }}>
                A trusted network for travel baseball and softball teams, families and pickup opportunities.
              </p>
            </div>
          </section>

          <section className="bg-white px-6 py-8 sm:px-8 lg:px-10 lg:py-12 flex items-center">
            <div className="w-full max-w-md mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-primary mb-4" style={{ borderRadius: 2 }}>
                  <Icon className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
                </div>
                <h1 className="text-4xl tracking-tight text-foreground">{title}</h1>
                {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
              </div>
              <div className="gdr-auth-form-card border border-border p-6 sm:p-8">
                {children}
              </div>
              {footer && (
                <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}