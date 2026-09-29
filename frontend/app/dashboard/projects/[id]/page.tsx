"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") load();
    const t = setInterval(load, 4000); // poll progress
    return () => clearInterval(t);
  }, [status, id]);

  async function load() {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data.project);
      setVideos(data.videos || []);
      setJobs(data.jobs || []);
    }
  }

  async function approveUpload(videoId: string) {
    setUploading(videoId);
    try {
      const body: any = { visibility: "public" };
      if (scheduleAt) body.publishAt = new Date(scheduleAt).toISOString();
      const res = await fetch(`/api/videos/${videoId}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message || "Upload queued");
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(null);
    }
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Loading project…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard/projects" className="font-bold">← Projects</Link>
          <span className="text-sm text-slate-500">{project.status}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{project.command}</p>
        </div>

        {/* Progress */}
        <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Progress</span>
            <span>{project.progress ?? 0}%</span>
          </div>
          <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${project.progress ?? 0}%` }}
            />
          </div>
          {project.error && (
            <p className="text-sm text-red-600 mt-3">{project.error}</p>
          )}
        </section>

        {/* Job history */}
        <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
          <h2 className="font-semibold mb-4">Job History</h2>
          <ul className="space-y-2">
            {jobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between text-sm border-b pb-2">
                <span className="font-mono text-xs">{j.type}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  j.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                  j.status === "FAILED" ? "bg-red-100 text-red-700" :
                  j.status === "ACTIVE" ? "bg-blue-100 text-blue-700" :
                  "bg-slate-100"
                }`}>{j.status}</span>
              </li>
            ))}
            {jobs.length === 0 && <p className="text-slate-500 text-sm">No jobs yet.</p>}
          </ul>
        </section>

        {/* Preview / Approve */}
        <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
          <h2 className="font-semibold mb-2">Preview & Upload</h2>
          <p className="text-xs text-slate-500 mb-4">
            Review generated clips, then one-click approve upload to your connected YouTube channel.
          </p>

          <div className="mb-4">
            <label className="text-xs text-slate-500">Schedule (optional)</label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="ml-2 rounded border px-2 py-1 text-sm"
            />
          </div>

          {videos.length === 0 ? (
            <p className="text-sm text-slate-500">
              {project.status === "PROCESSING" || project.status === "DOWNLOADING" || project.status === "ANALYZING"
                ? "Generating… progress updates automatically."
                : "No videos yet."}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {videos.map((v) => (
                <div key={v.id} className="border rounded-xl p-4 space-y-2">
                  <h3 className="font-medium text-sm line-clamp-2">{v.title}</h3>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-slate-100 px-2 py-0.5 rounded">{v.uploadStatus}</span>
                    {v.durationSec && <span>{v.durationSec}s</span>}
                  </div>
                  {v.filePath && (
                    <p className="text-xs text-green-600">File ready</p>
                  )}
                  {v.youtubeVideoId ? (
                    <a
                      href={`https://youtube.com/watch?v=${v.youtubeVideoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600"
                    >
                      Open on YouTube →
                    </a>
                  ) : (
                    (v.uploadStatus === "AWAITING_APPROVAL" || v.uploadStatus === "PENDING") && (
                      <button
                        onClick={() => approveUpload(v.id)}
                        disabled={uploading === v.id || !v.filePath}
                        className="text-xs rounded-lg bg-red-600 text-white px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
                      >
                        {uploading === v.id ? "Queuing…" : scheduleAt ? "Schedule Upload" : "Approve & Upload"}
                      </button>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
