import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Craig Hempcrete | Breathable Walls. Healthier Living.",
  description:
    "A Vercel-ready demo site for hemp-lime building materials, live project calculators, founder story, and a Gemini-powered homeowner advisor.",
  openGraph: {
    title: "Craig Hempcrete",
    description:
      "Carbon-negative, zero-VOC hemp-lime walls for healthier homes and practical DIY builds.",
    images: ["/images/hero-hempcrete-living-room.png"]
  },
  twitter: {
    card: "summary_large_image",
    title: "Craig Hempcrete",
    description: "Breathable hemp-lime walls for healthier living.",
    images: ["/images/hero-hempcrete-living-room.png"]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
