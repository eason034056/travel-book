"use client";

import { useTransition } from "react";
import { signIn } from "next-auth/react";

interface GoogleSignInButtonProps {
  callbackUrl: string;
  className?: string;
  children?: React.ReactNode;
}

export function GoogleSignInButton({
  callbackUrl,
  className,
  children = "Continue with Google"
}: GoogleSignInButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className={className}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await signIn("google", {
            callbackUrl
          });
        })
      }
      type="button"
    >
      {isPending ? "Redirecting..." : children}
    </button>
  );
}
