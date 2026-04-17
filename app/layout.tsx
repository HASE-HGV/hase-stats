import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HASE — Wall of Shame",
  description: "Wall of Shame und Wall of Good Deeds",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
