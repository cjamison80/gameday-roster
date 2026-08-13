import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, CreditCard, ShieldCheck, Star, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { startStripeCheckout } from '@/lib/stripeBilling';
import {
  formatMoney,
  formatPlanPrice,
  getDefaultPlanCode,
  getPlanFromList,
  getPlanLabel,
  getPlansForRole,
  isPaidPlan,
  loadPublicPlans,
  loadUserSubscription
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
  coach_player_plus: {
    title: 'Coach Pro includes 1 Player Plus profile',
    body: 'Coach Pro includes Player Plus benefits for one player profile owned by the coach account. Add more children with a Family Plan or future Coach + Family bundle.'
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
  const checkoutStatus = searchParams.get('checkout') || '';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (checkoutStatus === 'success') {
      toast({ title: 'Checkout complete', description: 'Your subscription is being activated. This page will update after Stripe confirms payment.' });
    } else if (checkoutStatus === 'cancelled') {
      toast({ title: 'Checkout cancelled', description: 'No payment was processed.' });
    }
  }, [checkoutStatus]);

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

      if (isPaidPlan(plan)) {
        await startStripeCheckout({ plan, interval: billingInterval, role });
        return;
      }

      const data = await startStripeCheckout({ plan, interval, role });
      if (data?.subscription) setSubscription(data.subscription);
      toast({ title: 'Plan updated', description: `${plan.name} is now selected.` });
      await loadData();
    } catch (e) {
      console.error(e);
      toast({ title: 'Could not start checkout', description: e?.message || 'Please try again.', variant: 'destructive' });
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
                  {isCurrent ? 'Current Plan' : savingPlan === plan.code ? 'Redirecting...' : isPaidPlan(plan) ? 'Upgrade with Stripe' : 'Select Free Plan'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="gdr-card p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} color="#16A34A" className="mt-0.5" />
            <div>
              <h3 className="font-black" style={{ color: '#0B1528' }}>Stripe Checkout connected</h3>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: '#5B6475' }}>
                Paid upgrades now route through Stripe Checkout. Subscriptions activate automatically after the Stripe webhook confirms payment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
