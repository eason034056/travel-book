import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { getAuthEnv, hasAuthEnv } from "@/lib/server/env";

export function createAuthOptions(): NextAuthOptions {
  if (!hasAuthEnv()) {
    return {
      pages: {
        signIn: "/sign-in"
      },
      providers: [],
      session: {
        strategy: "jwt"
      }
    };
  }

  const env = getAuthEnv();

  return {
    secret: env.AUTH_SECRET,
    providers: [
      GoogleProvider({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET
      })
    ],
    pages: {
      signIn: "/sign-in"
    },
    session: {
      strategy: "jwt"
    },
    callbacks: {
      async session({ session, token }) {
        if (session.user && typeof token.email === "string") {
          session.user.email = token.email;
        }

        return session;
      }
    }
  };
}

export const authOptions = createAuthOptions();
