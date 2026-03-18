import type { Metadata } from "next";

import { Toaster } from "sonner";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Travel Book",
  description: "A scrapbook-style travel memory archive for maps, photos, and shared daily notes."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              borderRadius: "1.2rem",
              fontFamily: "var(--font-body)",
              border: "1px solid rgba(31, 42, 58, 0.1)"
            }
          }}
        />
      </body>
    </html>
  );
}

