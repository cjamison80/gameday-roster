import { base44 } from '@/api/base44Client';

export async function startStripeCheckout({ plan, interval = 'monthly', role = 'parent' }) {
  if (!plan?.code) throw new Error('Plan is required.');

  const result = await base44.functions.invoke('create-stripe-checkout', {
    plan_code: plan.code,
    interval,
    account_type: role
  });

  const data = result?.data || result;

  if (data?.free) return data;
  if (!data?.url) {
    throw new Error(data?.error || 'Stripe Checkout did not return a checkout URL.');
  }

  window.location.assign(data.url);
  return data;
}
