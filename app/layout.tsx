import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthRecoveryWatcher from "./AuthRecoveryWatcher";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HASE — Wall of Shame",
    template: "%s · HASE",
  },
  description: "Wall of Shame und Wall of Good Deeds",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // iPhone-Notch: erlaubt env(safe-area-inset-*)
  themeColor: "#131316",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Dark-only App: die Klasse ist fix, `color-scheme` steht in globals.css.
    <html lang="de" className={`dark font-sans ${inter.variable}`}>
      <body>
        <AuthRecoveryWatcher />
        {children}
      </body>
    </html>
  );
}
