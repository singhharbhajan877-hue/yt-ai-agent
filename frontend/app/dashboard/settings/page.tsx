"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [channels, setChannels] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") loadChannels();
  }, [status, router]);

  async function loadChannels() {
    const res = await fetch("/api/channels");
    if (res.ok) {
      const data = await res.json();
      setChannels(data.channels || []);
    }
  }

  async function connectYouTube() {
    setSyncing(true);
    setMsg("");
    try {
      const res = await fetch("/api/channels/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect");
      setMsg("Channel connected successfully!");
      loadChannels();
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect(id: string) {
    if (!confirm("Disconnect this channel?")) return;
    await fetch(`/api/channels/${id}`, { method: "DELETE" });
    loadChannels();
  }

  if (status === "loading") return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold">YT AI Agent</Link>
          <nav className="flex gap-5 text-sm">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">Overview</Link>
            <Link href="/dashboard/settings" className="font-medium text-blue-600">Settings</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <h1 className="text-2xl font-bold">Settings</h1>

        <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6 space-y-4">
          <h2 className="font-semibold">Account</h2>
          <div className="text-sm space-y-1">
            <p><span className="text-slate-500">Email:</span> {session?.user?.email}</p>
            <p><span className="text-slate-500">Name:</span> {session?.user?.name}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-red-600 hover:underline"
          >
            Sign out
          </button>
        </section>

        <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6 space-y-4">
          <h2 className="font-semibold">YouTube Channels</h2>
          <p className="text-sm text-slate-600">
            Connect your YouTube channel using official Google OAuth. Tokens are stored securely and used only with the YouTube Data API v3.
          </p>

          {channels.length > 0 ? (
            <ul className="space-y-3">
              {channels.map((c) => (
                <li key={c.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    {c.thumbnailUrl && <img src={c.thumbnailUrl} className="w-10 h-10 rounded-full" alt="" />}
                    <div>
                      <div className="font-medium text-sm">{c.title}</div>
                      <div className="text-xs text-slate-500">{c.channelId}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => disconnect(c.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Disconnect
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No channels connected.</p>
          )}

          <button
            onClick={connectYouTube}
            disabled={syncing}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {syncing ? "Connecting…" : "Connect / Refresh YouTube Channel"}
          </button>
          {msg && <p className="text-sm text-slate-700">{msg}</p>}
        </section>

        <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6 space-y-2">
          <h2 className="font-semibold">API Keys (server-side only)</h2>
          <p className="text-sm text-slate-600">
            Gemini, Whisper, Stripe, and other keys are configured via environment variables on the server. They never appear in the browser.
          </p>
        </section>
      </main>
    </div>
  );
}
