import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" as any }) : null;

const PRICE_MAP: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  agency: process.env.STRIPE_PRICE_AGENCY,
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await req.json();
    if (!planId || !PRICE_MAP[planId]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const userId = (session.user as any).id as string;
    const email = session.user.email!;

    // Demo mode when Stripe is not configured
    if (!stripe || !PRICE_MAP[planId]) {
      await prisma.subscription.upsert({
        where: { userId },
        create: {
          userId,
          planId,
          status: "ACTIVE",
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        update: {
          planId,
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return NextResponse.json({
        message: `Demo: activated ${planId} plan (configure STRIPE_SECRET_KEY for real checkout)`,
      });
    }

    let sub = await prisma.subscription.findUnique({ where: { userId } });
    let customerId = sub?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { userId } });
      customerId = customer.id;
      await prisma.subscription.upsert({
        where: { userId },
        create: { userId, planId, status: "INCOMPLETE", stripeCustomerId: customerId },
        update: { stripeCustomerId: customerId },
      });
    }

    const checkout = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: PRICE_MAP[planId]!, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=1`,
      metadata: { userId, planId },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err: any) {
    console.error("[billing/checkout]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
