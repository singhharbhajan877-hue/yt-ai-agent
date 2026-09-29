"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LibraryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [videos, setVideos] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") load();
  }, [status, router]);

  async function load() {
    const res = await fetch("/api/videos");
    if (res.ok) {
      const data = await res.json();
      setVideos(data.videos || []);
    }
  }

  async function upload(videoId: string) {
    setUploading(videoId);
    try {
      const res = await fetch(`/api/videos/${videoId}/upload`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.url ? `Uploaded: ${data.url}` : "Upload queued");
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(null);
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Video Library</h1>
        {videos.length === 0 ? (
          <p className="text-slate-500">No videos yet. Run a command from the dashboard.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((v) => (
              <div key={v.id} className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-2">
                <h3 className="font-medium text-sm line-clamp-2">{v.title}</h3>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-100">{v.visibility}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100">{v.uploadStatus}</span>
                </div>
                {v.youtubeVideoId && (
                  <a
                    href={`https://youtube.com/watch?v=${v.youtubeVideoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600"
                  >
                    View on YouTube
                  </a>
                )}
                {v.uploadStatus === "PENDING" && (
                  <button
                    onClick={() => upload(v.id)}
                    disabled={uploading === v.id}
                    className="text-xs rounded-lg bg-red-600 text-white px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
                  >
                    {uploading === v.id ? "Uploading…" : "Upload to YouTube"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
