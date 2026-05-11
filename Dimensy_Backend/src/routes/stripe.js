const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const authMiddleware = require('../middleware/auth');

const BILLING_PLANS = {
  ilimitado: {
    priceId: process.env.STRIPE_PRICE_ID_SUBSCRIPTION || process.env.PRICE_UNLIMITED,
    plano: 'ilimitado',
    nome: 'Assinatura Dimensy',
    creditos: 999999,
    mode: 'subscription'
  }
};

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return require('stripe')(process.env.STRIPE_SECRET_KEY);
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)[0] || 'http://localhost:5173';
}

async function ativarPlanoIlimitado(userId, session, origem = 'stripe') {
  await supabase
    .from('profiles')
    .update({ plano: 'ilimitado', creditos: 999999 })
    .eq('id', userId);

  const registroPagamento = {
    user_id: userId,
    plano: 'ilimitado',
    creditos: 999999,
    stripe_session_id: session.id,
    valor: typeof session.amount_total === 'number' ? session.amount_total / 100 : null,
    status: session.payment_status || session.status || origem
  };

  const { error } = await supabase.from('pagamentos').insert(registroPagamento);
  if (error && error.code !== '23505') {
    console.error('Erro ao registrar pagamento:', error);
  }
}

async function atualizarStatusAssinatura(userId, subscriptionStatus) {
  if (!userId) return;

  const statusAtivo = ['trialing', 'active', 'past_due'].includes(subscriptionStatus);

  await supabase
    .from('profiles')
    .update({
      plano: statusAtivo ? 'ilimitado' : 'free',
      creditos: statusAtivo ? 999999 : 0
    })
    .eq('id', userId);
}

router.post('/create-checkout', authMiddleware, async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({
        error: 'Stripe ainda não configurado no backend.',
        requiresStripeConfig: true
      });
    }

    const planKey = req.body?.planKey || 'ilimitado';
    const plan = BILLING_PLANS[planKey];

    if (!plan) {
      return res.status(400).json({ error: 'Plano inválido.' });
    }

    if (!plan.priceId) {
      return res.status(503).json({
        error: 'Defina STRIPE_PRICE_ID_SUBSCRIPTION para abrir o checkout da assinatura.',
        requiresStripeConfig: true
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: plan.priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${getFrontendUrl()}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getFrontendUrl()}/cancelado`,
      client_reference_id: req.user.id,
      customer_email: req.user.email,
      metadata: {
        user_id: req.user.id,
        plano: plan.plano,
        billing_mode: 'subscription'
      },
      subscription_data: {
        metadata: {
          user_id: req.user.id,
          plano: plan.plano
        }
      }
    });

    return res.json({ url: session.url, sessionId: session.id, mode: 'subscription' });
  } catch (err) {
    console.error('Erro Stripe:', err);
    return res.status(500).json({ error: 'Erro ao criar sessão de assinatura.' });
  }
});

router.post('/webhook', async (req, res) => {
  const stripe = getStripeClient();
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(200).json({ received: true, ignored: true });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook erro:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id || session.client_reference_id;

      if (userId) {
        await ativarPlanoIlimitado(userId, session, 'checkout_completed');
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      await atualizarStatusAssinatura(userId, subscription.status);
    }
  } catch (err) {
    console.error('Erro ao processar evento Stripe:', err);
  }

  return res.status(200).json({ received: true });
});

router.get('/verify-session', authMiddleware, async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe ainda não configurado no backend.' });
    }

    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'Session ID não fornecido.' });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    const success = session.status === 'complete' || session.payment_status === 'paid' || Boolean(session.subscription);

    return res.json({
      success,
      plano: session.metadata?.plano || 'ilimitado',
      modo: session.mode || 'subscription'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro ao verificar sessão.' });
  }
});

module.exports = router;
