"use client";

import Link from "next/link";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold">YT AI Agent</Link>
          <Link href="/dashboard" className="text-sm text-slate-600">← Dashboard</Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Analytics</h1>
        <p className="text-slate-600 text-sm mb-6">
          Channel analytics are synced from the official YouTube Data API.
          Connect a channel and trigger a sync from Settings / workers.
        </p>
        <div className="rounded-xl border bg-white dark:bg-slate-900 p-8 text-center text-slate-500">
          Analytics charts will appear here after the first successful sync.
        </div>
      </main>
    </div>
  );
}
