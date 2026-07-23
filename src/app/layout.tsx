import type { Metadata } from "next";
import { Cabin, Roboto_Slab, JetBrains_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const cabin = Cabin({
  variable: "--font-display",
  subsets: ["latin"],
});

const robotoSlab = Roboto_Slab({
  variable: "--font-body",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Streetleaf — Asset Management",
  description: "Internal tool for managing customers, projects, and pole assets.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cabin.variable} ${robotoSlab.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-screen bg-[var(--bg)] text-[var(--ink)]">
        <Sidebar />
        <main className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
