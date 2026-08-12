import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, CreditCard, ShieldCheck, Star, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import {
  formatMoney,
  formatPlanPrice,
  getDefaultPlanCode,
  getPlanFromList,
  getPlanLabel,
  getPlansForRole,
  isPaidPlan,
  loadPublicPlans,
  loadUserSubscription,
  recordBillingEvent
} from '@/lib/subscription';

const reasonCopy = {
  player_profiles: {
    title: 'Add more player profiles',
    body: 'Free Parent accounts include 1 player profile. Upgrade to Family Plan to manage multiple players.'
  },
  applications: {
    title: 'Unlimited applications',
    body: 'Free Parent accounts include 3 applications per month. Player Plus unlocks unlimited applications.'
  },
  roster_posts: {
    title: 'Post more roster needs',
    body: 'Free Coach accounts include 1 roster post per month. Coach Pro unlocks unlimited roster posts.'
  },
  teams: {
    title: 'Manage more teams',
    body: 'Upgrade to manage additional teams and organization-wide workflows.'
  }
};

export default function Billing() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [savingPlan, setSavingPlan] = useState('');
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const reason = searchParams.get('reason') || '';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const [profileRows, planRows] = await Promise.all([
        base44.entities.UserProfile.filter({ user_id: currentUser.id }),
        loadPublicPlans()
      ]);
      const currentProfile = profileRows[0] || { role: 'parent' };
      setProfile(currentProfile);
      setPlans(planRows);
      const sub = await loadUserSubscription(currentUser, currentProfile.role || 'parent', planRows);
      setSubscription(sub);
    } catch (e) {
      console.error(e);
      toast({ title: 'Billing could not load', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const role = profile?.role || 'parent';
  const visiblePlans = useMemo(() => getPlansForRole(plans, role), [plans, role]);
  const currentPlan = getPlanFromList(plans, subscription?.plan_code || getDefaultPlanCode(role));
  const currentPlanLabel = getPlanLabel(subscription, plans);
  const reasonDetails = reasonCopy[reason];

  const handleSelectPlan = async (plan) => {
    if (!user) return;
    setSavingPlan(plan.code);
    try {
      const interval = plan.monthly_price_cents > 0 ? billingInterval : 'none';
      const status = plan.monthly_price_cents > 0 ? 'incomplete' : 'free';
      const payload = {
        user_id: user.id,
        account_type: role,
        plan_code: plan.code,
        plan_name: plan.name,
        status,
        billing_interval: interval,
        limits_snapshot: plan.limits || {},
        notes: plan.monthly_price_cents > 0
          ? 'Stripe checkout is not connected yet. This records upgrade intent only.'
          : 'Free plan selected.'
      };

      const existing = await base44.entities.UserSubscription.filter({ user_id: user.id }, '-created_date', 1).catch(() => []);
      const saved = existing.length > 0
        ? await base44.entities.UserSubscription.update(existing[0].id, payload)
        : await base44.entities.UserSubscription.create(payload);

      await recordBillingEvent(user, {
        subscription_id: saved.id,
        event_type: plan.monthly_price_cents > 0 ? 'checkout_started' : 'plan_changed',
        plan_code: plan.code,
        amount_cents: billingInterval === 'annual' ? plan.annual_price_cents : plan.monthly_price_cents,
        currency: plan.currency || 'USD',
        metadata: { interval: billingInterval, stripe_connected: false },
        notes: plan.monthly_price_cents > 0
          ? 'Upgrade requested. Stripe checkout must be connected before paid status becomes active.'
          : 'Free plan selected.'
      });

      setSubscription(saved);
      if (isPaidPlan(plan)) {
        toast({
          title: 'Upgrade request saved',
          description: 'The plan is recorded. Next step is connecting Stripe checkout to collect payment.'
        });
      } else {
        toast({ title: 'Plan updated', description: `${plan.name} is now selected.` });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Could not update plan', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSavingPlan('');
    }
  };

  if (loading) {
    return (
      <div className="gdr-page flex items-center justify-center">
        <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#CBD5E1', borderTopColor: '#C1121F' }} />
      </div>
    );
  }

  return (
    <div className="gdr-page pb-8">
      <div className="gdr-hero px-5 pt-14 pb-7">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft size={24} color="white" />
          </button>
          <div>
            <p className="gdr-editorial-kicker mb-1">Subscription</p>
            <h1 className="text-3xl text-white" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: 900 }}>
              Billing & Plans
            </h1>
          </div>
        </div>

        <div className="gdr-glass p-4 rounded-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: '#94A3B8' }}>Current Plan</p>
              <h2 className="text-2xl text-white mt-1" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: 900 }}>
                {currentPlanLabel}
              </h2>
              <p className="text-sm mt-1" style={{ color: '#CBD5E1' }}>
                Status: <span className="font-bold capitalize">{subscription?.status || 'free'}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#C1121F' }}>
              <CreditCard size={22} color="white" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-5">
        {reasonDetails && (
          <div className="gdr-card p-4" style={{ borderColor: 'rgba(193,18,31,0.35)' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <Zap size={18} color="#C1121F" />
              </div>
              <div>
                <h3 className="font-black" style={{ color: '#0B1528' }}>{reasonDetails.title}</h3>
                <p className="text-sm mt-1" style={{ color: '#5B6475' }}>{reasonDetails.body}</p>
              </div>
            </div>
          </div>
        )}

        <div className="gdr-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black" style={{ color: '#0B1528' }}>Billing interval</h3>
              <p className="text-sm" style={{ color: '#5B6475' }}>Annual plans include a built-in discount.</p>
            </div>
            <div className="flex rounded-2xl p-1" style={{ backgroundColor: '#EEF2F7' }}>
              {['monthly', 'annual'].map(interval => (
                <button
                  key={interval}
                  onClick={() => setBillingInterval(interval)}
                  className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-[0.12em]"
                  style={{
                    backgroundColor: billingInterval === interval ? '#0B1528' : 'transparent',
                    color: billingInterval === interval ? '#FFFFFF' : '#5B6475'
                  }}
                >
                  {interval}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {visiblePlans.map(plan => {
            const isCurrent = currentPlan?.code === plan.code;
            const price = formatPlanPrice(plan, billingInterval);
            return (
              <div key={plan.code} className="gdr-card p-5 relative overflow-hidden" style={{ borderColor: plan.recommended ? 'rgba(193,18,31,0.45)' : undefined }}>
                {plan.recommended && (
                  <div className="absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white" style={{ backgroundColor: '#C1121F' }}>
                    Recommended
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl" style={{ color: '#0B1528', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: 900 }}>{plan.name}</h3>
                    <p className="text-sm mt-1" style={{ color: '#5B6475' }}>{plan.description}</p>
                  </div>
                  {isCurrent ? (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DCFCE7' }}>
                      <Check size={18} color="#16A34A" />
                    </div>
                  ) : plan.recommended ? (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                      <Star size={18} color="#C1121F" />
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 flex items-end gap-2">
                  <span className="text-3xl font-black tracking-[-0.05em]" style={{ color: '#0B1528' }}>{price}</span>
                  {billingInterval === 'annual' && plan.annual_price_cents > 0 && (
                    <span className="text-xs font-bold mb-1" style={{ color: '#16A34A' }}>
                      Save {formatMoney((plan.monthly_price_cents * 12) - plan.annual_price_cents)}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  {(plan.features || []).map(feature => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check size={15} color="#16A34A" className="mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-semibold" style={{ color: '#334155' }}>{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={savingPlan === plan.code || isCurrent}
                  className="w-full mt-5 py-3.5 rounded-2xl font-black uppercase tracking-[0.14em] text-xs disabled:opacity-60"
                  style={{
                    backgroundColor: isCurrent ? '#EEF2F7' : plan.recommended ? '#C1121F' : '#0B1528',
                    color: isCurrent ? '#64748B' : '#FFFFFF'
                  }}
                >
                  {isCurrent ? 'Current Plan' : savingPlan === plan.code ? 'Saving...' : isPaidPlan(plan) ? 'Request Upgrade' : 'Select Free Plan'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="gdr-card p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} color="#16A34A" className="mt-0.5" />
            <div>
              <h3 className="font-black" style={{ color: '#0B1528' }}>Stripe-ready billing model</h3>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: '#5B6475' }}>
                Plan records, subscription records, usage limits, and billing events are now in place. Paid checkout is not collecting money yet; the next step is connecting Stripe checkout and webhooks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
