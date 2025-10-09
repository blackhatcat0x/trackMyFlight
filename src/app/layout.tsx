import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TrackMyFlight - Real-time Flight Tracking",
  description: "Track flights in real-time with interactive maps and live updates",
  keywords: ["flight tracking", "aviation", "real-time", "maps", "travel"],
  authors: [{ name: "TrackMyFlight Team" }],
  openGraph: {
    title: "TrackMyFlight",
    description: "Real-time flight tracking application",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TrackMyFlight",
    description: "Real-time flight tracking application",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
