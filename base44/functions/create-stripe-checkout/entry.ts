import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

const APP_ID = '6a7241ea32bb526f5d76609a';
const DEFAULT_APP_URL = 'https://gameday-roster-hub.base44.app';

function getSecret(name, fallback = '') {
  try {
    return secrets.get(name) || fallback;
  } catch {
    return fallback;
  }
}

function moneyFromPlan(plan, interval) {
  return interval === 'annual' ? Number(plan.annual_price_cents || 0) : Number(plan.monthly_price_cents || 0);
}

function getStripePriceId(plan, interval) {
  return interval === 'annual' ? plan.stripe_annual_price_id : plan.stripe_monthly_price_id;
}

async function stripeRequest(secretKey, path, params, method = 'POST') {
  const url = `https://api.stripe.com/v1${path}`;
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  if (params) {
    init.body = new URLSearchParams(params as Record<string, string>).toString();
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }

  if (!res.ok) {
    const message = body?.error?.message || body?.raw || `Stripe API ${res.status}`;
    throw new Error(message);
  }

  return body;
}

async function findPlan(base44, planCode) {
  const rows = await base44.asServiceRole.entities.SubscriptionPlan.filter({ code: planCode }, '-created_date', 1);
  return rows[0] || null;
}

async function upsertSubscription(base44, userId, payload) {
  const existing = await base44.asServiceRole.entities.UserSubscription.filter({ user_id: userId }, '-created_date', 1).catch(() => []);
  if (existing.length > 0) {
    return await base44.asServiceRole.entities.UserSubscription.update(existing[0].id, payload);
  }
  return await base44.asServiceRole.entities.UserSubscription.create(payload);
}

export default async function(req: Request) {
  const stripeSecretKey = getSecret('STRIPE_SECRET_KEY');
  if (!stripeSecretKey) {
    return Response.json({
      error: 'Stripe is not configured yet. Add STRIPE_SECRET_KEY to Base44 function secrets.'
    }, { status: 500 });
  }

  let base44;
  try {
    base44 = createClientFromRequest(req);
  } catch {
    return Response.json({ error: 'Invalid Base44 request.' }, { status: 400 });
  }

  try {
    const isAuthed = await base44.auth.isAuthenticated();
    if (!isAuthed) return Response.json({ error: 'Authentication required.' }, { status: 401 });
  } catch {
    return Response.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const user = await base44.auth.me();
  if (!user?.id) return Response.json({ error: 'User not found.' }, { status: 401 });

  const input = await req.json().catch(() => ({}));
  const planCode = String(input.plan_code || '').trim();
  const interval = input.interval === 'annual' ? 'annual' : 'monthly';
  const accountType = String(input.account_type || input.role || 'parent');

  if (!planCode) return Response.json({ error: 'plan_code is required.' }, { status: 400 });

  try {
    const plan = await findPlan(base44, planCode);
    if (!plan || plan.is_active === false || plan.is_public === false) {
      return Response.json({ error: 'Plan not found or inactive.' }, { status: 404 });
    }

    const amountCents = moneyFromPlan(plan, interval);
    if (amountCents <= 0) {
      const payload = {
        user_id: user.id,
        account_type: accountType,
        plan_code: plan.code,
        plan_name: plan.name,
        status: 'free',
        billing_interval: 'none',
        limits_snapshot: plan.limits || {},
        notes: 'Free plan selected through billing screen.'
      };
      const saved = await upsertSubscription(base44, user.id, payload);
      await base44.asServiceRole.entities.BillingEvent.create({
        user_id: user.id,
        subscription_id: saved.id,
        event_type: 'plan_changed',
        plan_code: plan.code,
        amount_cents: 0,
        currency: plan.currency || 'USD',
        provider: 'system',
        metadata: { interval: 'none' },
        notes: 'Free plan selected.'
      }).catch(() => null);
      return Response.json({ ok: true, free: true, subscription: saved });
    }

    const priceId = getStripePriceId(plan, interval);
    if (!priceId) {
      return Response.json({
        error: `Stripe ${interval} price ID is not configured for ${plan.name}. Add it to SubscriptionPlan.${interval === 'annual' ? 'stripe_annual_price_id' : 'stripe_monthly_price_id'}.`
      }, { status: 400 });
    }

    const appUrl = getSecret('APP_BASE_URL', getSecret('BASE44_APP_BASE_URL', DEFAULT_APP_URL)).replace(/\/$/, '');
    const existing = await base44.asServiceRole.entities.UserSubscription.filter({ user_id: user.id }, '-created_date', 1).catch(() => []);
    let customerId = existing[0]?.stripe_customer_id || '';

    if (!customerId) {
      const customer = await stripeRequest(stripeSecretKey, '/customers', {
        email: user.email || '',
        name: user.full_name || user.name || '',
        'metadata[user_id]': user.id,
        'metadata[app_id]': APP_ID
      });
      customerId = customer.id;
    }

    const session = await stripeRequest(stripeSecretKey, '/checkout/sessions', {
      mode: 'subscription',
      customer: customerId,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      allow_promotion_codes: 'true',
      success_url: `${appUrl}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing?checkout=cancelled&plan=${encodeURIComponent(plan.code)}`,
      'metadata[user_id]': user.id,
      'metadata[plan_code]': plan.code,
      'metadata[account_type]': accountType,
      'metadata[interval]': interval,
      'metadata[app_id]': APP_ID,
      'subscription_data[metadata][user_id]': user.id,
      'subscription_data[metadata][plan_code]': plan.code,
      'subscription_data[metadata][account_type]': accountType,
      'subscription_data[metadata][interval]': interval,
      'subscription_data[metadata][app_id]': APP_ID
    });

    const saved = await upsertSubscription(base44, user.id, {
      user_id: user.id,
      account_type: accountType,
      plan_code: plan.code,
      plan_name: plan.name,
      status: 'incomplete',
      billing_interval: interval,
      limits_snapshot: plan.limits || {},
      stripe_customer_id: customerId,
      stripe_price_id: priceId,
      checkout_session_id: session.id,
      notes: 'Stripe Checkout session created. Paid limits unlock after webhook confirms active/trialing subscription.'
    });

    await base44.asServiceRole.entities.BillingEvent.create({
      user_id: user.id,
      subscription_id: saved.id,
      event_type: 'checkout_started',
      plan_code: plan.code,
      amount_cents: amountCents,
      currency: plan.currency || 'USD',
      provider: 'stripe',
      provider_event_id: session.id,
      metadata: { interval, price_id: priceId, checkout_session_id: session.id },
      notes: 'Stripe Checkout session created.'
    }).catch(() => null);

    return Response.json({ ok: true, url: session.url, session_id: session.id, plan_code: plan.code, interval });
  } catch (err: any) {
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
