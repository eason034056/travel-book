"use client";

import { startTransition, useState } from "react";

interface InviteDialogProps {
  tripId: string;
}

export function InviteDialog({ tripId }: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Owner + editor roles only in v1");

  async function handleInvite() {
    const response = await fetch(`/api/trips/${tripId}/invite`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email
      })
    });

    const payload = (await response.json()) as { message: string };
    setMessage(payload.message);
    setEmail("");
  }

  return (
    <section className="rounded-[2rem] border border-ink/10 bg-paper p-5 shadow-card md:p-6">
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.3em] text-olive">Collaboration</p>
      <h2 className="mt-3 font-display text-3xl leading-none text-ink">Invite your co-editor</h2>
      <p className="mt-3 text-sm leading-7 text-ink/72">
        Google login is the planned auth path. For local demo mode, the invite flow returns a preview response and keeps
        the permission model visible.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input
          className="h-12 flex-1 rounded-full border border-ink/10 bg-sand/35 px-4 text-sm text-ink outline-none transition focus:border-olive/45 focus:bg-paper"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="co-editor@email.com"
          value={email}
        />
        <button
          className="h-12 rounded-full bg-terracotta px-5 text-sm uppercase tracking-[0.22em] text-paper transition hover:bg-[#a95a3d]"
          onClick={() => startTransition(handleInvite)}
          type="button"
        >
          Send invite
        </button>
      </div>
      <p className="mt-4 text-sm text-ink/65">{message}</p>
    </section>
  );
}

