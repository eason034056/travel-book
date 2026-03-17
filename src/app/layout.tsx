import type { Metadata } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Travel Book",
  description: "A scrapbook-style travel memory archive for maps, photos, and shared daily notes."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

