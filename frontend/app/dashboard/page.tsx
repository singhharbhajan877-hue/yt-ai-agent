"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  jobs?: { id: string; type: string; status: string }[];
}

interface Channel {
  id: string;
  title: string;
  thumbnailUrl?: string;
  subscriberCount?: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchProjects();
      fetchChannels();
    }
  }, [status]);

  async function fetchProjects() {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch {}
  }

  async function fetchChannels() {
    try {
      const res = await fetch("/api/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data.channels || []);
      }
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim()) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setMessage({ type: "ok", text: `Project created: ${data.projectId.slice(0, 8)}… (${data.jobs?.length || 0} jobs queued)` });
      setCommand("");
      fetchProjects();
    } catch (err: any) {
      setMessage({ type: "err", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </div>
    );
  }

  const queued = projects.filter((p) => ["QUEUED", "PROCESSING"].includes(p.status)).length;
  const completed = projects.filter((p) => p.status === "COMPLETED").length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-bold text-lg">YT AI Agent</div>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="font-medium text-blue-600">Overview</Link>
            <Link href="/dashboard/projects" className="text-slate-600 hover:text-slate-900">Projects</Link>
            <Link href="/dashboard/library" className="text-slate-600 hover:text-slate-900">Library</Link>
            <Link href="/dashboard/analytics" className="text-slate-600 hover:text-slate-900">Analytics</Link>
            <Link href="/dashboard/billing" className="text-slate-600 hover:text-slate-900">Billing</Link>
            <Link href="/dashboard/settings" className="text-slate-600 hover:text-slate-900">Settings</Link>
            <span className="text-slate-400">{session?.user?.email}</span>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            {channels.length > 0
              ? `Connected: ${channels.map((c) => c.title).join(", ")}`
              : "No YouTube channel connected yet — go to Settings."}
          </p>
        </div>

        <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="font-semibold mb-3">AI Command Box</h2>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder='e.g. "Create 5 Shorts from https://youtube.com/watch?v=..." or "Create a 15-min educational video about AI"'
              className="flex-1 rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !command.trim()}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Working…" : "Run"}
            </button>
          </form>
          {message && (
            <p className={`mt-3 text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Only process content you own or have permission to use. Uploads use the official YouTube Data API.
          </p>
        </section>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Connected Channels", value: String(channels.length) },
            { label: "Active / Queued", value: String(queued) },
            { label: "Completed Projects", value: String(completed) },
            { label: "Total Projects", value: String(projects.length) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-white dark:bg-slate-900 p-5">
              <div className="text-sm text-slate-500">{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent Projects</h2>
              <Link href="/dashboard/projects" className="text-sm text-blue-600">View all</Link>
            </div>
            {projects.length === 0 ? (
              <p className="text-sm text-slate-500">No projects yet. Use the command box above.</p>
            ) : (
              <ul className="space-y-3">
                {projects.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <div className="font-medium truncate max-w-xs">{p.title}</div>
                      <div className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleString()}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      p.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                      p.status === "FAILED" ? "bg-red-100 text-red-700" :
                      p.status === "PROCESSING" ? "bg-blue-100 text-blue-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{p.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
            <h2 className="font-semibold mb-4">Connected Channels</h2>
            {channels.length === 0 ? (
              <div>
                <p className="text-sm text-slate-500 mb-3">No channels connected.</p>
                <Link href="/dashboard/settings" className="text-sm text-blue-600 font-medium">
                  Connect YouTube →
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {channels.map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    {c.thumbnailUrl && (
                      <img src={c.thumbnailUrl} alt="" className="w-10 h-10 rounded-full" />
                    )}
                    <div>
                      <div className="font-medium text-sm">{c.title}</div>
                      {c.subscriberCount != null && (
                        <div className="text-xs text-slate-500">{c.subscriberCount.toLocaleString()} subscribers</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
