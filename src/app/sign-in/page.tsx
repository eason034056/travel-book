import type { Route } from "next";
import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { hasAuthEnv } from "@/lib/server/env";
import { getViewerEmail } from "@/lib/server/session";

interface SignInPageProps {
  searchParams?: Promise<{
    next?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const viewerEmail = await getViewerEmail();

  if (viewerEmail) {
    const params = (await searchParams) ?? {};
    redirect((params.next ?? "/") as Route);
  }

  const configured = hasAuthEnv();
  const params = (await searchParams) ?? {};
  const callbackUrl = params.next ?? "/";

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
      <section className="w-full rounded-[2.5rem] border border-ink/10 bg-paper px-8 py-10 shadow-float">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.34em] text-olive">Authentication</p>
        <h1 className="mt-4 font-display text-6xl leading-[0.9] text-ink">Sign in with Google to reopen the trip archive.</h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-ink/75">
          This travel book is invite-only. Use the invited Google account to access shared trips, imports, and photo
          uploads.
        </p>
        {configured ? (
          <GoogleSignInButton
            callbackUrl={callbackUrl}
            className="mt-8 rounded-full bg-ink px-6 py-3 text-sm uppercase tracking-[0.24em] text-paper disabled:cursor-not-allowed disabled:opacity-60"
          />
        ) : (
          <div className="mt-8 rounded-[1.5rem] border border-terracotta/20 bg-terracotta/8 p-4 text-sm text-terracotta">
            Add `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `APP_URL` to enable sign-in.
          </div>
        )}
      </section>
    </main>
  );
}
