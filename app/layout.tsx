import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Calorie Club",
  description: "Better habits, together.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Calorie Club",
    statusBarStyle: "default",
  },
  other: {
    // Older iOS (pre-17.4) only recognizes the apple-prefixed tag; modern
    // iOS/Android use the unprefixed one, which Next emits via appleWebApp.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#FBF6EF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
