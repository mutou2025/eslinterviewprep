import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DataInitializer } from "@/components/DataInitializer";
import { AppShell } from "@/components/AppShell";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "北美面试通 | ESLInterviewPrep - North America Interview Prep",
    template: "%s | 北美面试通"
  },
  icons: {
    icon: "/logo.svg",
  },
  description: "North America Interview Questions for Chinese & ESL Job Seekers. Tech & Behavioral Questions with Flashcards + Spaced Repetition. Frontend, Java, DevOps, STAR Method.",
  keywords: ["interview prep", "north america jobs", "tech interview", "behavioral interview", "ESL", "Chinese", "flashcards", "spaced repetition", "STAR method", "frontend", "java", "devops"],
  authors: [{ name: "ESLInterviewPrep" }],
  openGraph: {
    title: "北美面试通 | North America Interview Prep",
    description: "Tech & Behavioral Interview Questions for Chinese & ESL Job Seekers",
    type: "website",
    locale: "en_US",
    alternateLocale: "zh_CN"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DataInitializer>
          <AppShell>{children}</AppShell>
        </DataInitializer>
        <SpeedInsights />
      </body>
    </html>
  );
}
