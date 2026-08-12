import { base44 } from '@/api/base44Client';

export const DEFAULT_PLAN_BY_ROLE = {
  parent: 'parent_free',
  player: 'parent_free',
  coach: 'coach_free',
  organization: 'org_starter',
  admin: 'org_pro'
};

export const FALLBACK_PLANS = [
  {
    code: 'parent_free',
    name: 'Free Parent',
    account_type: 'parent',
    tier: 'free',
    monthly_price_cents: 0,
    annual_price_cents: 0,
    recommended: false,
    display_order: 10,
    description: 'Create a player profile, browse opportunities and tournaments, and apply a few times each month.',
    features: ['1 player profile', 'Browse opportunities', 'Browse tournaments', 'Weekly availability check-in', 'Public player profile link', '3 applications per month'],
    limits: { player_profiles: 1, applications_per_month: 3, videos_per_player: 1, saved_searches: 0 }
  },
  {
    code: 'player_plus',
    name: 'Player Plus',
    account_type: 'parent',
    tier: 'plus',
    monthly_price_cents: 599,
    annual_price_cents: 5900,
    recommended: true,
    display_order: 20,
    description: 'For serious travel families that want more exposure and unlimited applications.',
    features: ['Unlimited applications', 'Enhanced player profile', 'Perfect Game and GameChanger links', 'Player stats and measurables', 'Multiple videos', 'Priority opportunity alerts', 'Saved searches'],
    limits: { player_profiles: 1, applications_per_month: -1, videos_per_player: 6, saved_searches: 5 }
  },
  {
    code: 'family',
    name: 'Family Plan',
    account_type: 'parent',
    tier: 'family',
    monthly_price_cents: 999,
    annual_price_cents: 9900,
    recommended: false,
    display_order: 30,
    description: 'For families managing multiple players in travel sports.',
    features: ['Up to 4 player profiles', 'Unlimited applications', 'All Player Plus features', 'Family dashboard', 'Shared availability management'],
    limits: { player_profiles: 4, applications_per_month: -1, videos_per_player: 6, saved_searches: 10 }
  },
  {
    code: 'coach_free',
    name: 'Free Coach',
    account_type: 'coach',
    tier: 'free',
    monthly_price_cents: 0,
    annual_price_cents: 0,
    recommended: false,
    display_order: 40,
    description: 'Try GameDay Roster with one team and one roster need per month.',
    features: ['1 team', '1 roster post per month', 'View applicants', 'Browse tournaments', 'Basic coach profile'],
    limits: { teams: 1, roster_posts_per_month: 1, saved_players: 10, advanced_player_search: false }
  },
  {
    code: 'coach_pro',
    name: 'Coach Pro',
    account_type: 'coach',
    tier: 'pro',
    monthly_price_cents: 2499,
    annual_price_cents: 24900,
    recommended: true,
    display_order: 50,
    description: 'For coaches who need to find players quickly and manage roster needs all season.',
    features: ['Unlimited roster posts', 'Player search by position, age, class and availability', 'Applicant management', 'Save players', 'Tournament Finder', 'Team profile enhancements'],
    limits: { teams: 3, roster_posts_per_month: -1, saved_players: -1, advanced_player_search: true }
  },
  {
    code: 'org_starter',
    name: 'Organization Starter',
    account_type: 'organization',
    tier: 'starter',
    monthly_price_cents: 7900,
    annual_price_cents: 79900,
    recommended: false,
    display_order: 60,
    description: 'For smaller organizations managing several teams and coaches.',
    features: ['Up to 5 teams', 'Up to 5 coaches', 'Organization profile', 'Team management', 'Roster need posting', 'Tournament Finder'],
    limits: { teams: 5, coaches: 5, roster_posts_per_month: -1, featured_profile: false }
  },
  {
    code: 'org_pro',
    name: 'Organization Pro',
    account_type: 'organization',
    tier: 'pro',
    monthly_price_cents: 14900,
    annual_price_cents: 149900,
    recommended: true,
    display_order: 70,
    description: 'For larger organizations that want advanced visibility, team management and recruiting workflows.',
    features: ['Unlimited teams', 'Unlimited coaches', 'Featured organization profile', 'Advanced player search', 'Organization-wide applicant dashboard', 'Tryout promotion', 'Priority visibility'],
    limits: { teams: -1, coaches: -1, roster_posts_per_month: -1, featured_profile: true, priority_visibility: true }
  }
];

export function formatMoney(cents = 0) {
  if (!cents) return 'Free';
  return `$${(Number(cents) / 100).toFixed(Number(cents) % 100 === 0 ? 0 : 2)}`;
}

export function formatPlanPrice(plan, interval = 'monthly') {
  const cents = interval === 'annual' ? plan.annual_price_cents : plan.monthly_price_cents;
  if (!cents) return 'Free';
  return `${formatMoney(cents)}/${interval === 'annual' ? 'yr' : 'mo'}`;
}

export function getDefaultPlanCode(role = 'parent') {
  return DEFAULT_PLAN_BY_ROLE[role] || 'parent_free';
}

export function isPaidPlan(planOrCode) {
  const plan = typeof planOrCode === 'string'
    ? FALLBACK_PLANS.find(p => p.code === planOrCode)
    : planOrCode;
  return !!plan && Number(plan.monthly_price_cents || 0) > 0;
}

export function getPlanFromList(plans, code) {
  return (plans || []).find(p => p.code === code) || FALLBACK_PLANS.find(p => p.code === code) || FALLBACK_PLANS[0];
}

export function getPlansForRole(plans, role = 'parent') {
  const normalizedRole = role === 'player' ? 'parent' : role;
  const source = plans?.length ? plans : FALLBACK_PLANS;
  return source
    .filter(p => p.is_active !== false && (p.account_type === normalizedRole || p.account_type === 'all'))
    .sort((a, b) => (a.display_order || 100) - (b.display_order || 100));
}

export function isUnlimited(value) {
  return Number(value) === -1;
}

export function getLimit(plan, key) {
  const value = plan?.limits?.[key];
  return value === undefined || value === null ? null : value;
}

export function isLimitReached(plan, key, used = 0) {
  const limit = getLimit(plan, key);
  if (limit === null || isUnlimited(limit)) return false;
  return Number(used || 0) >= Number(limit);
}

export function currentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function loadPublicPlans() {
  try {
    const rows = await base44.entities.SubscriptionPlan.list('display_order', 100);
    return rows?.length ? rows : FALLBACK_PLANS;
  } catch (e) {
    return FALLBACK_PLANS;
  }
}

export async function loadUserSubscription(user, role = 'parent', plans = FALLBACK_PLANS) {
  if (!user?.id) return null;
  const defaultCode = getDefaultPlanCode(role);
  try {
    const rows = await base44.entities.UserSubscription.filter({ user_id: user.id }, '-created_date', 1);
    if (rows.length > 0) return rows[0];
  } catch (e) {
    // fall through to virtual free plan
  }
  const defaultPlan = getPlanFromList(plans, defaultCode);
  return {
    user_id: user.id,
    account_type: role,
    plan_code: defaultCode,
    plan_name: defaultPlan?.name || 'Free Plan',
    status: 'free',
    billing_interval: 'none',
    limits_snapshot: defaultPlan?.limits || {}
  };
}

export async function recordBillingEvent(user, event) {
  if (!user?.id) return null;
  try {
    return await base44.entities.BillingEvent.create({
      user_id: user.id,
      provider: 'system',
      ...event
    });
  } catch (e) {
    return null;
  }
}

export function getPlanLabel(subscription, plans) {
  const plan = getPlanFromList(plans, subscription?.plan_code);
  return plan?.name || subscription?.plan_name || 'Free Plan';
}
