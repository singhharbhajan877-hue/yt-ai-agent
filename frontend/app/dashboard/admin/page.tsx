"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") {
      fetch("/api/admin/stats")
        .then(async (r) => {
          if (!r.ok) throw new Error((await r.json()).error || "Forbidden");
          return r.json();
        })
        .then(setData)
        .catch((e) => setError(e.message));
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold">YT AI Agent – Admin</Link>
          <Link href="/dashboard" className="text-sm text-slate-600">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {!data && !error && <p className="text-slate-500">Loading…</p>}
        {data && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Users", value: data.users },
              { label: "Projects", value: data.projects },
              { label: "Videos", value: data.videos },
              { label: "Jobs (waiting)", value: data.jobsWaiting },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-white dark:bg-slate-900 p-5">
                <div className="text-sm text-slate-500">{s.label}</div>
                <div className="text-2xl font-bold mt-1">{s.value}</div>
              </div>
            ))}
          </div>
        )}
        <p className="text-sm text-slate-500">
          Full user management, logs, and payment views can be extended here. Role must be ADMIN in the database.
        </p>
      </main>
    </div>
  );
}
