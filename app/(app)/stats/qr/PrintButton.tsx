"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Startet den Druckdialog des Browsers fuer das QR-Poster. */
export default function PrintButton() {
  return (
    <Button onClick={() => window.print()} variant="outline">
      <PrinterIcon />
      Drucken
    </Button>
  );
}
