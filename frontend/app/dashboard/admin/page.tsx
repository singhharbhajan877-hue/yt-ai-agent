"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") {
      Promise.all([
        fetch("/api/admin/stats").then(async (r) => {
          if (!r.ok) throw new Error((await r.json()).error || "Forbidden");
          return r.json();
        }),
        fetch("/api/admin/users").then(async (r) => {
          if (!r.ok) return { users: [] };
          return r.json();
        }),
      ])
        .then(([stats, u]) => {
          setData(stats);
          setUsers(u.users || []);
        })
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

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {data && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Users", value: data.users },
              { label: "Projects", value: data.projects },
              { label: "Videos", value: data.videos },
              { label: "Jobs waiting", value: data.jobsWaiting },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border bg-white dark:bg-slate-900 p-5">
                <div className="text-sm text-slate-500">{s.label}</div>
                <div className="text-2xl font-bold mt-1">{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
          <h2 className="font-semibold mb-4">Users</h2>
          {users.length === 0 ? (
            <p className="text-sm text-slate-500">No users or insufficient permissions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Role</th>
                    <th className="text-left p-2">Credits</th>
                    <th className="text-left p-2">Projects</th>
                    <th className="text-left p-2">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="p-2">{u.email}</td>
                      <td className="p-2">{u.role}</td>
                      <td className="p-2">{u.credits}</td>
                      <td className="p-2">{u._count?.projects ?? 0}</td>
                      <td className="p-2">{u.subscription?.planId || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-xs text-slate-500">
          Promote a user to ADMIN in the database:{" "}
          <code className="bg-slate-100 px-1 rounded">UPDATE users SET role = &apos;ADMIN&apos; WHERE email = &apos;you@example.com&apos;;</code>
        </p>
      </main>
    </div>
  );
}
