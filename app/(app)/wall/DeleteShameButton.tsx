"use client";

import { useRouter } from "next/navigation";
import { Trash2Icon } from "lucide-react";
import RowActions from "@/components/row-actions";

export default function DeleteShameButton({
  id,
  username,
}: {
  id: string;
  username: string;
}) {
  const router = useRouter();

  return (
    <RowActions
      label={`Aktionen für @${username}`}
      confirm={{
        label: "Eintrag löschen",
        icon: Trash2Icon,
        title: "Shame-Eintrag löschen?",
        description: `Der Eintrag für @${username} wird dauerhaft entfernt. Das kann nicht rückgängig gemacht werden.`,
        confirmLabel: "Löschen",
        onConfirm: async () => {
          const res = await fetch("/api/admin/shame/delete", {
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
