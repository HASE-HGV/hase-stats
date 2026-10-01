"use client";

import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import RowActions from "@/components/row-actions";

export default function DeleteQuoteButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <RowActions
      label="Aktionen für dieses Zitat"
      confirm={{
        label: "Zitat löschen",
        icon: Trash2Icon,
        title: "Zitat löschen?",
        description:
          "Dieses Zitat wird dauerhaft entfernt. Das kann nicht rückgängig gemacht werden.",
        confirmLabel: "Löschen",
        onConfirm: async () => {
          const res = await fetch("/api/admin/quote/delete", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return body.error ?? "Fehler beim Löschen.";
          }
          router.refresh();
          return null;
        },
      }}
    />
  );
}
