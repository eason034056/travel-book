import { hasSupabaseEnv } from "@/lib/supabase/config";

export default function SignInPage() {
  const configured = hasSupabaseEnv();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
      <section className="w-full rounded-[2.5rem] border border-ink/10 bg-paper px-8 py-10 shadow-float">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.34em] text-olive">Authentication</p>
        <h1 className="mt-4 font-display text-6xl leading-[0.9] text-ink">Google sign-in, ready when Supabase is.</h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-ink/75">
          The UI is wired for the planned auth flow. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
          to switch from demo mode to real Google OAuth.
        </p>
        <button
          className="mt-8 rounded-full bg-ink px-6 py-3 text-sm uppercase tracking-[0.24em] text-paper disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!configured}
          type="button"
        >
          {configured ? "Continue with Google" : "Supabase env needed"}
        </button>
      </section>
    </main>
  );
}

