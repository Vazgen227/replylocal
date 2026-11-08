import Stripe from "stripe";
import type { Database, Identity } from "./store";
import { AppError } from "./errors";
export function billingConfigured() {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PRICE_STARTER
  );
}
function owner(a: Identity) {
  if (a.role !== "owner") throw new AppError(403, "FORBIDDEN");
}
function sdk() {
  if (!billingConfigured()) throw new AppError(503, "BILLING_NOT_CONFIGURED");
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    timeout: 10000,
    maxNetworkRetries: 1,
  });
}
export function createBilling(db: Database, client?: Stripe) {
  return {
    async status(actor: Identity) {
      const [r] = await db.query<{
        plan: string;
        status: string;
        periodEnd: string | null;
      }>(
        'SELECT plan,status,period_end AS "periodEnd" FROM billing_accounts WHERE organization_id=$1',
        [actor.organizationId],
      );
      return {
        configured: billingConfigured(),
        ...(r ?? { plan: "pilot", status: "manual", periodEnd: null }),
      };
    },
    async checkout(actor: Identity, locale: string) {
      owner(actor);
      const stripe = client ?? sdk();
      // Stripe idempotency also protects the external side effect if our DB transaction fails.
      const customerId = await db.transaction(async (q) => {
        await q("SELECT id FROM organizations WHERE id=$1 FOR UPDATE", [
          actor.organizationId,
        ]);
        await q(
          "INSERT INTO billing_accounts(organization_id) VALUES($1) ON CONFLICT DO NOTHING",
          [actor.organizationId],
        );
        const [r] = await q<{ stripe_customer_id: string; status: string }>(
          "SELECT * FROM billing_accounts WHERE organization_id=$1",
          [actor.organizationId],
        );
        if (["active", "trialing", "past_due", "unpaid"].includes(r.status))
          throw new AppError(409, "SUBSCRIPTION_EXISTS");
        if (r.stripe_customer_id) return r.stripe_customer_id;
        const customer = await stripe.customers.create(
          {
            email: actor.email,
            name: actor.name,
            metadata: { organizationId: actor.organizationId },
          },
          { idempotencyKey: "replylocal-customer-" + actor.organizationId },
        );
        await q(
          "UPDATE billing_accounts SET stripe_customer_id=$2 WHERE organization_id=$1",
          [actor.organizationId, customer.id],
        );
        return customer.id;
      });
      const origin = new URL(process.env.APP_URL!).origin;
      return db.transaction(async (q) => {
        await q("SELECT id FROM organizations WHERE id=$1 FOR UPDATE", [
          actor.organizationId,
        ]);
        const [r] = await q<{
          checkout_url: string | null;
          checkout_expires_at: Date | null;
          status: string;
        }>("SELECT * FROM billing_accounts WHERE organization_id=$1", [
          actor.organizationId,
        ]);
        if (["active", "trialing", "past_due", "unpaid"].includes(r.status))
          throw new AppError(409, "SUBSCRIPTION_EXISTS");
        if (
          r.checkout_url &&
          r.checkout_expires_at &&
          new Date(r.checkout_expires_at).getTime() > Date.now() + 10000
        )
          return { url: r.checkout_url };
        const session = await stripe.checkout.sessions.create(
          {
            mode: "subscription",
            customer: customerId,
            line_items: [
              { price: process.env.STRIPE_PRICE_STARTER!, quantity: 1 },
            ],
            client_reference_id: actor.organizationId,
            subscription_data: {
              metadata: { organizationId: actor.organizationId },
            },
            success_url: `${origin}/${locale}/settings?billing=success`,
            cancel_url: `${origin}/${locale}/settings?billing=cancelled`,
          },
          {
            idempotencyKey:
              "checkout-" +
              actor.organizationId +
              "-" +
              Math.floor(Date.now() / 300000),
          },
        );
        await q(
          "UPDATE billing_accounts SET checkout_url=$2,checkout_expires_at=$3 WHERE organization_id=$1",
          [
            actor.organizationId,
            session.url,
            new Date(session.expires_at * 1000),
          ],
        );
        return { url: session.url };
      });
    },
    async portal(actor: Identity, locale: string) {
      owner(actor);
      const stripe = client ?? sdk();
      const [r] = await db.query<{ stripe_customer_id: string }>(
        "SELECT stripe_customer_id FROM billing_accounts WHERE organization_id=$1",
        [actor.organizationId],
      );
      if (!r?.stripe_customer_id) throw new AppError(404, "NOT_FOUND");
      return {
        url: (
          await stripe.billingPortal.sessions.create({
            customer: r.stripe_customer_id,
            return_url:
              new URL(process.env.APP_URL!).origin + `/${locale}/settings`,
          })
        ).url,
      };
    },
    async webhook(raw: string, signature: string) {
      const stripe = client ?? sdk();
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          raw,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET!,
        );
      } catch {
        throw new AppError(400, "INVALID_SIGNATURE");
      }
      if (
        [
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
        ].includes(event.type)
      ) {
        const current = await stripe.subscriptions.retrieve(
          (event.data.object as Stripe.Subscription).id,
        );
        event = {
          ...event,
          data: { ...event.data, object: current },
        } as unknown as Stripe.Event;
      }
      return this.applyEvent(event);
    },
    // Only the signature-verified webhook route calls this method in production.
    async applyEvent(event: Stripe.Event) {
      if (
        ![
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
        ].includes(event.type)
      )
        return { received: true };
      const sub = event.data.object as Stripe.Subscription;
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await db.transaction(async (q) => {
        const inserted = await q(
          "INSERT INTO billing_events(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id",
          [event.id],
        );
        if (!inserted.length) return;
        const [account] = await q<{
          organization_id: string;
          last_event_at: number;
          stripe_subscription_id: string | null;
        }>(
          "SELECT * FROM billing_accounts WHERE stripe_customer_id=$1 FOR UPDATE",
          [customerId],
        );
        if (!account) return;
        if (Number(account.last_event_at) > event.created) return;
        if (
          account.stripe_subscription_id &&
          account.stripe_subscription_id !== sub.id &&
          event.type === "customer.subscription.deleted"
        )
          return;
        const item = sub.items.data.find(
          (i) => i.price.id === process.env.STRIPE_PRICE_STARTER,
        );
        if (!item && event.type !== "customer.subscription.deleted") return;
        await q(
          "UPDATE billing_accounts SET stripe_subscription_id=$2,plan='starter',status=$3,period_end=$4,last_event_at=$5,checkout_url=NULL,checkout_expires_at=NULL,updated_at=now() WHERE organization_id=$1",
          [
            account.organization_id,
            sub.id,
            sub.status,
            item?.current_period_end
              ? new Date(item.current_period_end * 1000)
              : null,
            event.created,
          ],
        );
      });
      return { received: true };
    },
  };
}
