"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$19",
    period: "/month",
    features: ["1 YouTube channel", "20 AI videos / month", "Shorts generation", "Basic SEO", "Email support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$49",
    period: "/month",
    features: ["3 channels", "100 AI videos / month", "Long-form + Shorts", "Advanced SEO + thumbnails", "Priority queue", "Priority support"],
    popular: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: "$149",
    period: "/month",
    features: ["10 channels", "Unlimited videos", "4K export", "Team seats", "API access", "Dedicated support"],
  },
];

export default function BillingPage() {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  async function subscribe(planId: string) {
    setLoading(planId);
    setMsg("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMsg(data.message || "Subscription updated (demo mode)");
      }
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold">YT AI Agent</Link>
          <Link href="/dashboard" className="text-sm text-slate-600">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold">Billing & Plans</h1>
          <p className="text-slate-600 mt-2">Choose a plan that fits your channel growth.</p>
        </div>

        {msg && <p className="text-center text-sm mb-6 text-slate-700">{msg}</p>}

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border bg-white dark:bg-slate-900 p-6 flex flex-col ${
                plan.popular ? "ring-2 ring-blue-600 shadow-lg" : ""
              }`}
            >
              {plan.popular && (
                <span className="text-xs font-semibold text-blue-600 mb-2">MOST POPULAR</span>
              )}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <div className="mt-2 mb-6">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-slate-500">{plan.period}</span>
              </div>
              <ul className="space-y-2 text-sm flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-green-500">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => subscribe(plan.id)}
                disabled={!!loading}
                className={`w-full rounded-xl py-2.5 text-sm font-medium ${
                  plan.popular
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "border hover:bg-slate-50 dark:hover:bg-slate-800"
                } disabled:opacity-50`}
              >
                {loading === plan.id ? "Redirecting…" : "Subscribe"}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          Payments via Stripe. Cancel anytime. Razorpay/UPI available for India (configure env keys).
        </p>
      </main>
    </div>
  );
}
