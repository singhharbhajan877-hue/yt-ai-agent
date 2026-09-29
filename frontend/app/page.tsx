import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight">YT AI Agent</div>
          <nav className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300"
            >
              Dashboard
            </Link>
            <Link
              href="/auth/signin"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Sign in with Google
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
            Your Autonomous
            <br />
            <span className="text-blue-600">YouTube AI Employee</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-300">
            Connect your channel with official Google OAuth. Type a command.
            The AI researches, scripts, edits, optimizes SEO, generates
            thumbnails, and uploads — all through the official YouTube Data API.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/auth/signin"
              className="rounded-xl bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-lg hover:bg-blue-700 transition"
            >
              Get Started Free
            </Link>
            <Link
              href="/docs"
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-8 py-3 text-base font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Documentation
            </Link>
          </div>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-8">
          {[
            {
              title: "AI Command Box",
              desc: 'Type "Create 5 Shorts from this video" or "Make a 20-minute documentary" and let the agent handle the rest.',
            },
            {
              title: "Official APIs Only",
              desc: "Google OAuth 2.0 + YouTube Data API v3. No scraping, no unofficial clients, full compliance.",
            },
            {
              title: "Full Pipeline",
              desc: "Script → Voice → Edit → SEO → Thumbnail → Schedule → Upload. All automated.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border bg-white dark:bg-slate-900 p-6 shadow-sm"
            >
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t mt-20 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} YT AI Agent. MIT License.
      </footer>
    </div>
  );
}
