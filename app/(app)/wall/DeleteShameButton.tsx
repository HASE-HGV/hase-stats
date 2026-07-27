"use client";

import { useRouter } from "next/navigation";
import ConfirmDialogButton from "@/components/ConfirmDialogButton";

export default function DeleteShameButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <ConfirmDialogButton
      triggerLabel="Löschen"
      triggerTitle="Admin: Eintrag löschen"
      title="Shame-Eintrag löschen?"
      description="Dieser Eintrag wird dauerhaft entfernt. Das kann nicht rückgängig gemacht werden."
      confirmLabel="Löschen"
      onConfirm={async () => {
        const res = await fetch("/api/admin/shame/delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: res.statusText }));
          return body.error ?? "Fehler beim Löschen.";
        }
        router.refresh();
        return null;
      }}
    />
  );
}
