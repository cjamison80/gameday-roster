import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, FileText, ShieldCheck, Users, Camera, CreditCard, Flag, Scale } from 'lucide-react';
import GameDayLogo from '@/components/GameDayLogo';

const LAST_UPDATED = 'August 14, 2026';
const SUPPORT_EMAIL = 'support@gamedayroster.com';

const documents = {
  terms: {
    title: 'Terms of Service',
    subtitle: 'Rules for using GameDay Roster.',
    icon: FileText,
    sections: [
      {
        heading: '1. Acceptance of Terms',
        body: [
          'By creating an account, accessing, or using GameDay Roster, you agree to these Terms of Service and any policies referenced here. If you do not agree, do not use the service.',
          'GameDay Roster is designed for travel sports families, coaches, organizations, and administrators to discover roster opportunities, player profiles, teams, organizations, and tournaments.'
        ]
      },
      {
        heading: '2. Accounts and Eligibility',
        body: [
          'You must provide accurate account information and keep your login credentials secure. You are responsible for activity that occurs under your account.',
          'Player profiles for minors must be created and managed by a parent or legal guardian. Coaches and organizations may not create, control, or impersonate a minor player profile unless they are also that player’s parent or legal guardian.',
          'GameDay Roster may suspend or remove accounts that provide false information, misuse the platform, or create safety concerns.'
        ]
      },
      {
        heading: '3. Parent-Managed Minor Profiles',
        body: [
          'The platform is built around parent/guardian control for youth athletes. Parents and guardians are responsible for deciding what information, photos, videos, stats, and contact details are shared.',
          'Coaches must communicate through parent/guardian-controlled channels. Direct coach-to-minor messaging is not allowed through GameDay Roster.'
        ]
      },
      {
        heading: '4. User Content',
        body: [
          'Users may upload or submit profile information, photos, videos, stats, availability, messages, opportunity listings, and other content.',
          'You represent that you have the rights and permissions needed to submit the content you upload, including permission from a parent or legal guardian when the content includes a minor.',
          'GameDay Roster may remove content that violates these Terms, safety rules, community standards, intellectual property rights, or applicable law.'
        ]
      },
      {
        heading: '5. Coaches, Organizations, and Opportunities',
        body: [
          'Coaches and organizations are responsible for the accuracy of team information, roster needs, tryouts, tournaments, costs, schedules, and eligibility requirements they post.',
          'Posting an opportunity does not guarantee applications, attendance, player performance, tournament acceptance, or team placement.',
          'Users are responsible for independently verifying coaches, teams, organizations, event details, fees, and travel requirements before participating.'
        ]
      },
      {
        heading: '6. Subscriptions and Billing',
        body: [
          'Certain features may require a paid subscription. Subscription features, limits, billing intervals, and prices may vary by plan.',
          'Paid subscriptions are handled through the payment provider available for your platform, such as Stripe for web/PWA checkout or applicable app-store billing systems for native mobile apps if implemented.',
          'Unless otherwise stated, subscriptions renew automatically until canceled according to the cancellation process made available in the app or by the payment provider.'
        ]
      },
      {
        heading: '7. Prohibited Conduct',
        body: [
          'You may not harass, threaten, exploit, groom, spam, misrepresent identity, scrape user data, bypass account limits, post unsafe opportunities, or use the service for unlawful purposes.',
          'You may not collect contact information for minors outside parent/guardian-controlled processes or attempt to move communications with minors into private channels.'
        ]
      },
      {
        heading: '8. No Guarantee of Results',
        body: [
          'GameDay Roster helps users discover and manage connections. We do not guarantee player placement, roster fills, team selection, tournament entry, playing time, coaching quality, athlete performance, or safety at third-party events.'
        ]
      },
      {
        heading: '9. Safety, Reports, and Enforcement',
        body: [
          'Users should report suspicious, unsafe, inaccurate, or abusive activity. GameDay Roster may review, restrict, suspend, or remove accounts, profiles, content, messages, and listings at its discretion.',
          'For urgent safety concerns or emergencies, contact local authorities first.'
        ]
      },
      {
        heading: '10. Changes to the Service or Terms',
        body: [
          'GameDay Roster may modify features, plans, prices, policies, and these Terms over time. Continued use of the service after updates means you accept the updated terms.'
        ]
      },
      {
        heading: '11. Contact',
        body: [
          `Questions about these Terms can be sent to ${SUPPORT_EMAIL}. Before public launch, GameDay Roster should replace this with the final legal entity name, support email, and mailing address.`
        ]
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How GameDay Roster collects, uses, and protects information.',
    icon: ShieldCheck,
    sections: [
      {
        heading: '1. Information We Collect',
        body: [
          'We collect account information such as name, email address, role, login information, and subscription status.',
          'We collect sports-related profile information such as player name, age division, positions, location, team, photos, videos, stats, measurables, availability, external profile links, coach profiles, team profiles, organization profiles, tournament preferences, applications, messages, and notifications.',
          'We may collect usage information such as pages viewed, features used, device/browser details, timestamps, and diagnostic information.'
        ]
      },
      {
        heading: '2. Minor Athlete Information',
        body: [
          'GameDay Roster is designed so minor player profiles are created and managed by a parent or legal guardian.',
          'Parents/guardians control what information is added to a minor player profile and are responsible for keeping it accurate and appropriate.',
          'We do not knowingly allow coaches to directly manage or privately message minor athletes unless the coach is also the parent/legal guardian associated with that account.'
        ]
      },
      {
        heading: '3. How We Use Information',
        body: [
          'We use information to operate the platform, show player profiles and opportunities, match players with roster needs, support applications and messaging, manage subscriptions, improve safety, prevent abuse, and provide support.',
          'We may use profile and availability information to surface relevant opportunities, players, teams, organizations, and tournaments.'
        ]
      },
      {
        heading: '4. Sharing and Visibility',
        body: [
          'Certain profile information may be visible to other users based on account settings, profile visibility, and product features.',
          'Applications may share relevant player profile details with the coach or team receiving the application.',
          'We may share payment-related information with payment processors, analytics/hosting providers, and service providers needed to operate the app.'
        ]
      },
      {
        heading: '5. Payments',
        body: [
          'Payment details are processed by third-party payment providers. GameDay Roster should not store full card numbers in the app database.',
          'We may store subscription status, plan, provider customer identifiers, billing events, and payment status needed to manage access.'
        ]
      },
      {
        heading: '6. Safety, Moderation, and Legal Compliance',
        body: [
          'We may access, preserve, or disclose information when needed to investigate safety reports, enforce policies, prevent fraud, respond to legal requests, or protect users and the platform.',
          'Reports involving minors, suspected exploitation, harassment, or unsafe conduct may result in account restrictions and referral to appropriate authorities where required.'
        ]
      },
      {
        heading: '7. Data Choices',
        body: [
          'Users may update profile information in the app. Parents/guardians can edit or remove minor player profile information they control.',
          `For account or data deletion requests, contact ${SUPPORT_EMAIL}. Before public launch, this should be replaced with the final support process and verified legal entity contact information.`
        ]
      },
      {
        heading: '8. Security',
        body: [
          'We use reasonable technical and organizational measures to protect information. No system is perfectly secure, and users should protect their login credentials and use caution when sharing personal information.'
        ]
      },
      {
        heading: '9. Children and Consent',
        body: [
          'GameDay Roster is not intended to be used independently by children without parent/guardian involvement. Parent/guardian consent and control is required for minor player profiles.',
          'Before public launch, counsel should review this policy for COPPA, state privacy laws, app-store requirements, and any youth sports specific compliance obligations.'
        ]
      },
      {
        heading: '10. Contact',
        body: [
          `Questions about privacy can be sent to ${SUPPORT_EMAIL}.`
        ]
      }
    ]
  },
  'minor-safety': {
    title: 'Minor Safety & Guardian Consent',
    subtitle: 'Safety rules for youth athlete profiles and communications.',
    icon: Users,
    sections: [
      {
        heading: '1. Parent/Guardian Control',
        body: [
          'Minor player profiles must be created, managed, and monitored by a parent or legal guardian.',
          'Parents/guardians are responsible for deciding whether to share photos, videos, stats, location, team information, external profile links, and availability.'
        ]
      },
      {
        heading: '2. No Coach-to-Minor Direct Messaging',
        body: [
          'Coaches and organizations may not use GameDay Roster to privately message minors directly. Communication about a minor athlete must go through the parent/guardian-controlled account.',
          'Users should report any attempt to bypass parent/guardian communication channels.'
        ]
      },
      {
        heading: '3. Safe Profile Practices',
        body: [
          'Do not post sensitive personal information such as school schedules, home addresses, private phone numbers for minors, or real-time location details.',
          'Use general market/location information unless a parent/guardian intentionally chooses to share more in a controlled context.'
        ]
      },
      {
        heading: '4. Coach and Organization Responsibility',
        body: [
          'Coaches and organizations must represent themselves accurately and keep roster opportunities, fees, schedules, and travel details current.',
          'Coaches and organizations are responsible for following applicable team, tournament, league, background check, safeguarding, and youth sports rules outside the app.'
        ]
      },
      {
        heading: '5. Reporting Safety Concerns',
        body: [
          'Report suspicious, unsafe, harassing, exploitative, or inappropriate conduct immediately. For emergencies or immediate danger, contact local authorities first.',
          `Non-emergency platform safety concerns can be sent to ${SUPPORT_EMAIL} until an in-app safety reporting workflow is finalized.`
        ]
      }
    ]
  },
  'photo-video': {
    title: 'Photo & Video Policy',
    subtitle: 'Rules for uploading media involving players and minors.',
    icon: Camera,
    sections: [
      {
        heading: '1. Permission to Upload',
        body: [
          'Only upload photos, videos, logos, or other media that you own or have permission to use.',
          'If media includes a minor, the parent/legal guardian associated with the minor must have permission to upload and share it.'
        ]
      },
      {
        heading: '2. Appropriate Sports Content',
        body: [
          'Media should be appropriate for a youth sports platform and related to player profiles, teams, organizations, tournaments, or roster opportunities.',
          'Do not upload embarrassing, unsafe, explicit, harassing, misleading, or non-consensual media.'
        ]
      },
      {
        heading: '3. Visibility and Sharing',
        body: [
          'Media may be visible to other users depending on profile visibility, application workflows, team pages, and feature settings.',
          'Parents/guardians should review every photo and video before adding it to a minor player profile.'
        ]
      },
      {
        heading: '4. Removal',
        body: [
          'GameDay Roster may remove media that violates policies, creates safety concerns, infringes rights, or is reported as inappropriate.',
          `Removal requests can be sent to ${SUPPORT_EMAIL} until the in-app media reporting workflow is finalized.`
        ]
      }
    ]
  },
  refunds: {
    title: 'Refund & Cancellation Policy',
    subtitle: 'Subscription cancellation and refund expectations.',
    icon: CreditCard,
    sections: [
      {
        heading: '1. Subscriptions',
        body: [
          'GameDay Roster may offer monthly and annual subscription plans for parents, players, coaches, families, and organizations.',
          'Subscription access continues until the end of the active billing period unless otherwise stated by the applicable payment provider or app-store billing system.'
        ]
      },
      {
        heading: '2. Cancellation',
        body: [
          'Users may cancel according to the cancellation process made available in the app or through the payment provider used for the subscription.',
          'Canceling prevents future renewals but does not automatically refund the current billing period unless required by law or expressly approved by GameDay Roster.'
        ]
      },
      {
        heading: '3. Refunds',
        body: [
          'Unless otherwise required by law, subscription fees are generally non-refundable after payment is processed.',
          'GameDay Roster may evaluate refund requests case-by-case for duplicate charges, technical billing errors, or other exceptional circumstances.',
          'App-store purchases, if implemented for native mobile apps, may be subject to Apple App Store or Google Play refund processes rather than direct GameDay Roster refund handling.'
        ]
      },
      {
        heading: '4. Plan Changes',
        body: [
          'Upgrades, downgrades, and plan changes may take effect immediately or at the next billing cycle depending on the payment provider and plan configuration.',
          'Feature access may change when a subscription expires, is canceled, is refunded, or becomes past due.'
        ]
      },
      {
        heading: '5. Contact',
        body: [
          `Billing questions can be sent to ${SUPPORT_EMAIL}. Before accepting real payments, this policy should be reviewed against the final Stripe, Apple, Google, and state-law requirements that apply.`
        ]
      }
    ]
  },
  'community-guidelines': {
    title: 'Community Guidelines',
    subtitle: 'Standards for a trusted youth sports network.',
    icon: Flag,
    sections: [
      {
        heading: '1. Be Accurate',
        body: [
          'Use real identities, accurate team affiliations, current roster needs, true event details, and honest player profile information.',
          'Do not impersonate coaches, organizations, parents, athletes, or tournament operators.'
        ]
      },
      {
        heading: '2. Protect Minors',
        body: [
          'Respect parent/guardian control over minor athlete profiles and communications.',
          'Do not request private contact information from minors, attempt to bypass parents, or move minor communications to unsupervised channels.'
        ]
      },
      {
        heading: '3. Respect the Game',
        body: [
          'No harassment, bullying, threats, hate, abusive recruiting tactics, deceptive roster posts, spam, or pressure tactics.',
          'No public player shaming, public star ratings of minors, or misleading claims about player placement or team status.'
        ]
      },
      {
        heading: '4. Post Responsible Opportunities',
        body: [
          'Roster opportunities should include clear dates, location, age division, classification, cost, positions needed, and expectations.',
          'Coaches should update or close listings when spots are filled or details change.'
        ]
      },
      {
        heading: '5. Report Problems',
        body: [
          'Report suspicious behavior, unsafe listings, false profiles, inappropriate messages, media concerns, or policy violations.',
          'GameDay Roster may remove content, restrict messaging, suspend accounts, or take other action to protect the community.'
        ]
      }
    ]
  }
};

const legalList = [
  { slug: 'terms', label: 'Terms of Service', description: 'Platform rules, accounts, subscriptions, safety, and user responsibilities.' },
  { slug: 'privacy', label: 'Privacy Policy', description: 'Information collected, profile visibility, minors, payments, and data choices.' },
  { slug: 'minor-safety', label: 'Minor Safety & Guardian Consent', description: 'Parent-managed profiles, no coach-to-minor direct messaging, and safety reporting.' },
  { slug: 'photo-video', label: 'Photo & Video Policy', description: 'Permissions, youth media, visibility, and removal requests.' },
  { slug: 'refunds', label: 'Refund & Cancellation Policy', description: 'Subscriptions, cancellations, refunds, plan changes, and billing support.' },
  { slug: 'community-guidelines', label: 'Community Guidelines', description: 'Conduct standards for parents, players, coaches, organizations, and teams.' }
];

export default function Legal() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const doc = slug ? documents[slug] : null;

  if (!slug) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
        <LegalHeader title="Legal Center" subtitle="Policies for the GameDay Roster private beta." onBack={() => navigate(-1)} />
        <main className="px-5 py-6 max-w-3xl mx-auto space-y-4">
          <div className="gdr-card p-5 border-l-4" style={{ borderLeftColor: '#C1121F' }}>
            <div className="flex items-start gap-3">
              <Scale size={22} color="#C1121F" className="mt-0.5 flex-shrink-0" />
              <div>
                <h2 className="font-black" style={{ color: '#0B1528' }}>Beta legal draft</h2>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: '#5B6475' }}>
                  These policies are structured for private beta readiness. Before public launch, have counsel review the final operating entity, privacy obligations, youth-safety requirements, payment terms, app-store rules, support contacts, and refund language.
                </p>
              </div>
            </div>
          </div>

          {legalList.map(item => (
            <Link key={item.slug} to={`/legal/${item.slug}`} className="gdr-card p-5 flex items-center gap-4 text-left gdr-card-hover">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEE2E2' }}>
                <FileText size={18} color="#C1121F" />
              </div>
              <div className="flex-1">
                <h3 className="font-black" style={{ color: '#0B1528' }}>{item.label}</h3>
                <p className="text-sm mt-1" style={{ color: '#64748B' }}>{item.description}</p>
              </div>
              <ChevronRight size={18} color="#94A3B8" />
            </Link>
          ))}
        </main>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
        <LegalHeader title="Policy not found" subtitle="This policy page does not exist." onBack={() => navigate('/legal')} />
        <main className="px-5 py-6 max-w-3xl mx-auto">
          <Link to="/legal" className="font-black" style={{ color: '#C1121F' }}>Back to Legal Center</Link>
        </main>
      </div>
    );
  }

  const Icon = doc.icon || FileText;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8FAFC' }}>
      <LegalHeader title={doc.title} subtitle={doc.subtitle} onBack={() => navigate('/legal')} />
      <main className="px-5 py-6 max-w-3xl mx-auto space-y-5 pb-12">
        <div className="gdr-card p-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEE2E2' }}>
              <Icon size={22} color="#C1121F" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: '#94A3B8' }}>Last updated</p>
              <h2 className="text-xl font-black mt-1" style={{ color: '#0B1528' }}>{LAST_UPDATED}</h2>
              <p className="text-sm mt-2 leading-relaxed" style={{ color: '#64748B' }}>
                Beta legal draft for private testing. Attorney review is required before broad public launch or real-money scale.
              </p>
            </div>
          </div>
        </div>

        <article className="gdr-card p-5 sm:p-7 space-y-7">
          {doc.sections.map(section => (
            <section key={section.heading}>
              <h2 className="text-xl font-black" style={{ color: '#0B1528' }}>{section.heading}</h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph, idx) => (
                  <p key={idx} className="text-sm sm:text-base leading-relaxed" style={{ color: '#334155' }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </article>

        <div className="flex flex-wrap gap-3">
          <Link to="/legal" className="px-4 py-3 rounded-2xl font-black text-sm" style={{ backgroundColor: '#0B1528', color: '#FFFFFF' }}>
            Legal Center
          </Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="px-4 py-3 rounded-2xl font-black text-sm" style={{ backgroundColor: '#FEE2E2', color: '#C1121F' }}>
            Contact Support
          </a>
        </div>
      </main>
    </div>
  );
}

function LegalHeader({ title, subtitle, onBack }) {
  return (
    <header className="gdr-hero px-5 pt-14 pb-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="p-2 -ml-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </button>
          <GameDayLogo size={34} showText light />
        </div>
        <p className="gdr-editorial-kicker mb-2">GameDay Roster</p>
        <h1 className="text-3xl sm:text-4xl font-black text-white">{title}</h1>
        <p className="text-sm sm:text-base mt-2 max-w-2xl" style={{ color: '#CBD5E1' }}>{subtitle}</p>
      </div>
    </header>
  );
}
