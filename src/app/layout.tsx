import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KubeResQ-9 · Orbital Cluster Rescue",
  description:
    "A 3D browser game where you pilot an astronaut through a degraded Kubernetes cluster and resolve real-world SRE incidents. No login. Progress saved in your browser.",
  keywords: ["Kubernetes", "SRE", "3D game", "Three.js", "Next.js", "browser game"],
  authors: [{ name: "Adel Chouchane" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "KubeResQ-9 · Orbital Cluster Rescue",
    description: "Pilot an astronaut across a degraded Kubernetes cluster and fix real incidents.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "KubeResQ-9 · Orbital Cluster Rescue",
    description: "Pilot an astronaut across a degraded Kubernetes cluster and fix real incidents.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-x-hidden`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
