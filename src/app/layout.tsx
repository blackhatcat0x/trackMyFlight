import "mapbox-gl/dist/mapbox-gl.css";
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
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "any", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64x64.png", sizes: "64x64", type: "image/png" },
      { url: "/favicon-132x132.png", sizes: "132x132", type: "image/png" },
    ],
    shortcut: "/favicon-32x32.png",
    apple: [
      { url: "/favicon-132x132.png", sizes: "132x132", type: "image/png" },
    ],
  },
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
      <head>
        <link 
          href='https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css' 
          rel='stylesheet' 
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}