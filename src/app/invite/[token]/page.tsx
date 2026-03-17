import { redirect } from "next/navigation";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { acceptInviteLink } from "@/lib/server/travel-service";
import { getViewerEmail } from "@/lib/server/session";

interface InvitePageProps {
  params: Promise<{
    token: string;
  }>;
}

function InviteState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
      <section className="w-full rounded-[2.5rem] border border-ink/10 bg-paper px-8 py-10 shadow-float">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.34em] text-olive">Invite</p>
        <h1 className="mt-4 font-display text-5xl leading-[0.92] text-ink">{title}</h1>
        <p className="mt-4 max-w-xl text-base leading-8 text-ink/75">{description}</p>
      </section>
    </main>
  );
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;
  const viewerEmail = await getViewerEmail();

  if (!viewerEmail) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-10">
        <section className="w-full rounded-[2.5rem] border border-ink/10 bg-paper px-8 py-10 shadow-float">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.34em] text-olive">Invite</p>
          <h1 className="mt-4 font-display text-5xl leading-[0.92] text-ink">Join this travel book</h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-ink/75">
            Sign in with the invited Google account to accept this one-time editor link.
          </p>
          <GoogleSignInButton
            callbackUrl={`/invite/${token}`}
            className="mt-8 rounded-full bg-ink px-6 py-3 text-sm uppercase tracking-[0.24em] text-paper disabled:cursor-not-allowed disabled:opacity-60"
          />
        </section>
      </main>
    );
  }

  const invite = await acceptInviteLink(token, viewerEmail);

  if (invite.status === "accepted" && invite.tripId) {
    redirect(`/trips/${invite.tripId}`);
  }

  if (invite.status === "wrong-email") {
    return (
      <InviteState
        description={`This invite is reserved for ${invite.invitedEmail}. Sign in with that exact Google account to continue.`}
        title="This invite is tied to a different email"
      />
    );
  }

  if (invite.status === "expired") {
    return (
      <InviteState
        description="This one-time invite link has expired. Ask the trip owner to generate a new one."
        title="Invite expired"
      />
    );
  }

  return (
    <InviteState
      description="This invite link is invalid or has already been used."
      title="Invite unavailable"
    />
  );
}
