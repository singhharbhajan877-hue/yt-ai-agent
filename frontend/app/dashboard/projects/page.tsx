"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProjectsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
    if (status === "authenticated") {
      fetch("/api/projects")
        .then((r) => r.json())
        .then((d) => setProjects(d.projects || []));
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="font-bold">YT AI Agent</Link>
          <Link href="/dashboard" className="text-sm text-slate-600">← Dashboard</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Projects</h1>
        {projects.length === 0 ? (
          <p className="text-slate-500">No projects yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border bg-white dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="text-left p-3 font-medium">Title</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Progress</th>
                  <th className="text-left p-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-3">
                      <Link href={`/dashboard/projects/${p.id}`} className="text-blue-600 hover:underline max-w-xs truncate block">
                        {p.title}
                      </Link>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        p.status === "COMPLETED" || p.status === "PREVIEW" ? "bg-green-100 text-green-700" :
                        p.status === "FAILED" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{p.status}</span>
                    </td>
                    <td className="p-3">{p.progress ?? 0}%</td>
                    <td className="p-3 text-slate-500">{new Date(p.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
