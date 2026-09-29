import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="font-bold">YT AI Agent</div>
          <nav className="flex gap-6 text-sm">
            <Link href="/dashboard" className="font-medium text-blue-600">
              Overview
            </Link>
            <Link href="/dashboard/projects" className="text-slate-600 hover:text-slate-900">
              Projects
            </Link>
            <Link href="/dashboard/library" className="text-slate-600 hover:text-slate-900">
              Library
            </Link>
            <Link href="/dashboard/analytics" className="text-slate-600 hover:text-slate-900">
              Analytics
            </Link>
            <Link href="/dashboard/settings" className="text-slate-600 hover:text-slate-900">
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Your AI employee is ready. Connect a channel and start giving commands.
          </p>
        </div>

        {/* AI Command Box */}
        <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="font-semibold mb-3">AI Command Box</h2>
          <form className="flex gap-3">
            <input
              type="text"
              placeholder='e.g. "Create 5 Shorts from https://youtube.com/watch?v=..." or "Generate a 15-min educational video about climate change"'
              className="flex-1 rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800"
            />
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
            >
              Run
            </button>
          </form>
          <p className="text-xs text-slate-500 mt-2">
            Only process content you own or have permission to use. Uploads go through the official YouTube Data API.
          </p>
        </section>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Connected Channels", value: "0" },
            { label: "Active Projects", value: "0" },
            { label: "Videos in Queue", value: "0" },
            { label: "Uploaded this month", value: "0" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border bg-white dark:bg-slate-900 p-5"
            >
              <div className="text-sm text-slate-500">{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Placeholder sections */}
        <div className="grid lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
            <h2 className="font-semibold mb-4">Recent Projects</h2>
            <p className="text-sm text-slate-500">No projects yet. Use the command box above.</p>
          </section>
          <section className="rounded-2xl border bg-white dark:bg-slate-900 p-6">
            <h2 className="font-semibold mb-4">Upload Queue</h2>
            <p className="text-sm text-slate-500">Queue is empty.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
