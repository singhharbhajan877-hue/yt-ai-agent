import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold">YT AI Agent</Link>
          <Link href="/auth/signin" className="text-sm text-blue-600">Sign in</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8 prose dark:prose-invert">
        <h1 className="text-3xl font-bold">Documentation</h1>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Quick start</h2>
          <ol className="list-decimal pl-5 space-y-1 text-slate-700 dark:text-slate-300">
            <li>Sign in with Google (YouTube scopes will be requested).</li>
            <li>Open <strong>Settings</strong> and connect your YouTube channel.</li>
            <li>On the dashboard, type a command such as:
              <code className="block mt-1 text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">Create 5 Shorts from https://youtube.com/watch?v=...</code>
              or
              <code className="block mt-1 text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">Create a 10-minute educational video about space</code>
            </li>
            <li>Open the project, review the preview, then approve upload.</li>
          </ol>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Official APIs only</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Authentication uses Google OAuth 2.0. Uploads use YouTube Data API v3.
            Process only content you own or are licensed to use.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Workers</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Video download, FFmpeg editing, and upload run on a background worker
            (Redis + BullMQ). The web app queues jobs; the worker must be running
            for media pipelines to complete.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Source &amp; setup</h2>
          <p className="text-sm">
            <a
              className="text-blue-600 hover:underline"
              href="https://github.com/singhharbhajan877-hue/yt-ai-agent"
              target="_blank"
              rel="noreferrer"
            >
              GitHub repository
            </a>
            {" · "}
            <a
              className="text-blue-600 hover:underline"
              href="https://github.com/singhharbhajan877-hue/yt-ai-agent/blob/main/docs/DEPLOYMENT.md"
              target="_blank"
              rel="noreferrer"
            >
              Deployment guide
            </a>
          </p>
        </section>

        <Link href="/" className="text-sm text-blue-600 hover:underline">← Back home</Link>
      </main>
    </div>
  );
}
