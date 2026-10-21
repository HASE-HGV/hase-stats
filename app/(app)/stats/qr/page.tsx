import type { Metadata } from "next";
import QRCode from "react-qr-code";
import { getBaseUrl } from "@/lib/site-url";
import { appName } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import PrintButton from "./PrintButton";

export const metadata: Metadata = { title: "QR-Code" };

export const dynamic = "force-dynamic";

/**
 * Druckbare Seite fuer den QR-Code, der an die Tuer des Hase-Raums kommt.
 *
 * Der Code enthaelt keine Person, sondern nur die Check-in-Route. Wer ihn
 * mit dem Handy scannt, schaltet die Zeit fuer den Account um, der auf dem
 * Handy angemeldet ist.
 */
export default async function QrPage() {
  const baseUrl = await getBaseUrl();
  const checkinUrl = `${baseUrl}/stats/checkin`;

  return (
    <div className="page print:max-w-none print:gap-0 print:pb-0 print:pt-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold sm:text-[1.75rem]">
            QR-Code drucken
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Für die Tür des Hase-Raums. Der Code startet bzw. stoppt die Zeit
            für das Konto, das auf dem Handy angemeldet ist.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="print-sheet mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl bg-white p-8 text-black shadow-lg ring-1 ring-black/10 print:max-w-none print:gap-8 print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-2xl font-bold tracking-tight">{appName}</p>
          <p className="text-base text-black/70">
            Zeit im Hase-Raum tracken
          </p>
        </div>

        <a
          href={checkinUrl}
          className="rounded-2xl bg-white p-3 outline-none focus-visible:ring-2 focus-visible:ring-black/40 print:p-4"
          aria-label="Check-in-Link öffnen"
        >
          <QRCode
            value={checkinUrl}
            size={320}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
            title="HASE Stats – Check-in"
            className="h-auto w-full max-w-[20rem] print:max-w-[26rem]"
          />
        </a>

        <ol className="flex flex-col gap-1.5 text-center text-sm text-black/80">
          <li>1. Kamera auf dem Handy öffnen</li>
          <li>2. QR-Code scannen</li>
          <li>3. Anwesenheit startet bzw. stoppt</li>
        </ol>

        <p className="break-all text-center font-mono text-xs text-black/50">
          {checkinUrl}
        </p>
      </div>

      <div className="flex justify-center print:hidden">
        <Button
          variant="ghost"
          nativeButton={false}
          render={<a href={checkinUrl} />}
        >
          Check-in-Link öffnen
        </Button>
      </div>
    </div>
  );
}
