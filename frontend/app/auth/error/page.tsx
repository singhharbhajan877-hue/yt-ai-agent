"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error") || "Unknown error";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full rounded-2xl border bg-white p-8 text-center space-y-4">
        <h1 className="text-xl font-bold text-red-600">Authentication Error</h1>
        <p className="text-sm text-slate-600">{error}</p>
        <p className="text-xs text-slate-500">
          Common causes: missing Google Client ID/Secret, redirect URI mismatch, or denied YouTube scopes.
        </p>
        <Link href="/auth/signin" className="inline-block text-blue-600 text-sm font-medium">
          Try again →
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <ErrorContent />
    </Suspense>
  );
}
