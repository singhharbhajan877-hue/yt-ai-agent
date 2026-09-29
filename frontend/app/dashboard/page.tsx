"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  title: string;
  status: string;
  progress?: number;
  createdAt: string;
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
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchProjects();
      fetchChannels();
      fetch("/api/me").then(async (r) => {
        if (r.ok) {
          const d = await r.json();
          setCredits(d.credits);
        }
      });
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
      setMessage({
        type: "ok",
        text: `Project started (${data.creditsUsed} credits). Remaining: ${data.creditsRemaining}`,
      });
      setCommand("");
      if (typeof data.creditsRemaining === "number") setCredits(data.creditsRemaining);
      fetchProjects();
      if (data.projectId) router.push(`/dashboard/projects/${data.projectId}`);
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

  const queued = projects.filter((p) =>
    ["QUEUED", "DOWNLOADING", "ANALYZING", "PROCESSING"].includes(p.status)
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-bold text-lg">YT AI Agent</div>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="font-medium text-blue-600">Overview</Link>
            <Link href="/dashboard/projects" className="text-slate-600 hover:text-slate-900">Projects</Link>
            <Link href="/dashboard/library" className="text-slate-600 hover:text-slate-900">Library</Link>
            <Link href="/dashboard/billing" className="text-slate-600 hover:text-slate-900">Billing</Link>
            <Link href="/dashboard/settings" className="text-slate-600 hover:text-slate-900">Settings</Link>
            {credits !== null && (
              <span className="rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-semibold">
                {credits} credits
              </span>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-600 mt-1">
            {channels.length > 0
              ? `Connected: ${channels.map((c) => c.title).join(", ")}`
              : "Connect a YouTube channel in Settings first."}
          </p>
        </div>

        <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="font-semibold mb-3">AI Command Box</h2>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder='Paste a YouTube URL + command, e.g. "Create 5 Shorts from https://youtube.com/watch?v=..."'
              className="flex-1 rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !command.trim()}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Starting…" : "Run"}
            </button>
          </form>
          {message && (
            <p className={`mt-3 text-sm ${message.type === "ok" ? "text-green-600" : "text-red-600"}`}>
              {message.text}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Pipeline: download (yt-dlp) → Gemini analysis → viral moments → FFmpeg Shorts → SEO → preview → your approval → official YouTube upload.
            Only process content you own or have rights to.
          </p>
        </section>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Channels", value: String(channels.length) },
            { label: "In progress", value: String(queued) },
            { label: "Projects", value: String(projects.length) },
            { label: "Credits", value: credits !== null ? String(credits) : "—" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-white dark:bg-slate-900 p-5">
              <div className="text-sm text-slate-500">{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Projects</h2>
            <Link href="/dashboard/projects" className="text-sm text-blue-600">View all</Link>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-slate-500">No projects yet.</p>
          ) : (
            <ul className="space-y-3">
              {projects.slice(0, 8).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/projects/${p.id}`}
                    className="flex items-center justify-between text-sm border-b pb-2 hover:bg-slate-50 dark:hover:bg-slate-800 -mx-2 px-2 rounded"
                  >
                    <div>
                      <div className="font-medium truncate max-w-md">{p.title}</div>
                      <div className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {typeof p.progress === "number" && p.progress < 100 && (
                        <span className="text-xs text-slate-500">{p.progress}%</span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.status === "COMPLETED" || p.status === "PREVIEW" ? "bg-green-100 text-green-700" :
                        p.status === "FAILED" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{p.status}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
