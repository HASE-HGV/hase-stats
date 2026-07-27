import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthRecoveryWatcher from "./AuthRecoveryWatcher";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "HASE — Wall of Shame",
  description: "Wall of Shame und Wall of Good Deeds",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // iPhone-Notch: erlaubt env(safe-area-inset-*)
  themeColor: "#0f0f12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={cn("dark", "font-sans", inter.variable)}>
      <body>
        <AuthRecoveryWatcher />
        {children}
      </body>
    </html>
  );
}
