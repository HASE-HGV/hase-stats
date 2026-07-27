"use client";

import { useRouter } from "next/navigation";
import ConfirmDialogButton from "@/components/ConfirmDialogButton";

export default function DeactivateButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <ConfirmDialogButton
      triggerLabel="Entfernen"
      title="Aufgabe entfernen?"
      description="Bereits bestätigte Deeds bleiben erhalten. Die Aufgabe wird nur aus der Liste ausgeblendet."
      confirmLabel="Entfernen"
      onConfirm={async () => {
        const res = await fetch("/api/admin/template/deactivate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: res.statusText }));
          return body.error ?? "Fehler beim Entfernen.";
        }
        router.refresh();
        return null;
      }}
    />
  );
}
