"use client";

import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import RowActions from "@/components/row-actions";

export default function DeleteDeedButton({ id }: { id: string }) {
  const router = useRouter();

  return (
    <RowActions
      label="Aktionen für diesen Good Deed"
      confirm={{
        label: "Good Deed löschen",
        icon: Trash2Icon,
        title: "Good Deed löschen?",
        description:
          "Dieser Good Deed wird dauerhaft entfernt. Das kann nicht rückgängig gemacht werden.",
        confirmLabel: "Löschen",
        onConfirm: async () => {
          const res = await fetch("/api/admin/deed/delete", {
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
