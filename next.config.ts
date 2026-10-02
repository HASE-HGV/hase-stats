import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Next.js sucht die Workspace-Root, indem es nach oben durch alle
   * Lockfiles wandert. Auf diesem Rechner liegen fremde Lockfiles in `~/`
   * und `~/Code` (unabhängige Scratch-Projekte), wodurch Next die Root
   * fälschlich als `/Users/michaelsellmeier` bestimmt und bei jedem
   * `next dev`/`next build` warnt — und im `standalone`-Output die falschen
   * Dateien traced. Das Projekt ist ein eigenes Git-Repo, also hier
   * explizit auf das Projektverzeichnis pinnen.
   */
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
