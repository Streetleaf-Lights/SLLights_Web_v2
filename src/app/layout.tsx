import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "LineWorks — Asset Management",
  description: "Internal tool for managing customers, projects, and pole assets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex h-full min-h-screen bg-[var(--bg)] text-[var(--ink)]">
        <Sidebar />
        <main className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
