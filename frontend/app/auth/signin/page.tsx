"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  google: "Google sign-in failed. Check OAuth client ID/secret, redirect URI, and that the consent screen allows your account (test user or published).",
  OAuthSignin: "Could not start Google sign-in. Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
  OAuthCallback: "Google callback failed. Confirm redirect URI matches exactly: https://yt-ai-agent-singhharbhajan877-hue.vercel.app/api/auth/callback/google",
  OAuthCreateAccount: "Could not create account in the database. Check DATABASE_URL / Neon connection.",
  Callback: "Sign-in callback error. Check NEXTAUTH_URL and NEXTAUTH_SECRET.",
  AccessDenied: "Access denied. Your Google account may not be on the OAuth test-user list.",
  Configuration: "Auth is misconfigured. Check environment variables on Vercel.",
  Default: "Sign-in failed. Try again or check Google Cloud OAuth settings.",
};

function SignInForm() {
  const params = useSearchParams();
  const error = params.get("error");
  const message = error ? ERROR_MESSAGES[error] || ERROR_MESSAGES.Default + ` (${error})` : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full rounded-2xl border bg-white dark:bg-slate-900 p-8 shadow-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Sign in to YT AI Agent</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Use your Google account. YouTube upload scopes will be requested so the AI can manage your channel via official APIs.
          </p>
        </div>

        {message && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 text-left text-sm p-3">
            {message}
          </div>
        )}

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <span className="text-lg">G</span>
          Continue with Google
        </button>

        <p className="text-xs text-slate-500">
          By signing in you agree that the app will only process content you own or have rights to, and will use official YouTube APIs only.
        </p>

        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}
