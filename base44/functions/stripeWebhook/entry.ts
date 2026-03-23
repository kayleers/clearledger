import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sig = req.headers.get('stripe-signature');
    const body = await req.text();

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        sig,
        Deno.env.get('STRIPE_WEBHOOK_SECRET')
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Stripe webhook event:', event.type);

    const grantPro = async (email) => {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          plan: 'pro',
          stripe_plan_updated: new Date().toISOString()
        });
        console.log(`Granted pro to ${email}`);
      }
    };

    const revokePro = async (email) => {
      const users = await base44.asServiceRole.entities.User.filter({ email });
      if (users.length > 0) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          plan: 'free',
          stripe_plan_updated: new Date().toISOString()
        });
        console.log(`Revoked pro from ${email}`);
      }
    };

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.payment_status === 'paid') {
          await grantPro(session.customer_email);
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        if (invoice.customer_email) {
          await grantPro(invoice.customer_email);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        // Get customer email from customer object
        const customer = await stripe.customers.retrieve(sub.customer);
        if (customer.email) {
          await revokePro(customer.email);
        }
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});