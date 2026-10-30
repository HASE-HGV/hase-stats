"use client";

import { useRouter } from "next/navigation";
import { ArchiveIcon, PencilIcon } from "lucide-react";
import RowActions, { type RowAction } from "@/components/row-actions";

/**
 * Aktionen einer Aufgaben-Zeile: Bearbeiten oeffnet das Formular in einer
 * Detailzeile der Tabelle, Entfernen blendet die Aufgabe aus.
 */
export default function TaskRowActions({
  id,
  title,
  onEdit,
}: {
  id: string;
  title: string;
  onEdit: () => void;
}) {
  const router = useRouter();

  const actions: RowAction[] = [
    { label: "Bearbeiten", icon: PencilIcon, onSelect: onEdit },
  ];

  return (
    <RowActions
      label={`Aktionen für „${title}“`}
      actions={actions}
      confirm={{
        label: "Aufgabe entfernen",
        icon: ArchiveIcon,
        title: "Aufgabe aus der Liste nehmen?",
        description:
          "Bereits bestätigte Deeds bleiben erhalten. Die Aufgabe wird nur aus der Liste ausgeblendet.",
        confirmLabel: "Entfernen",
        onConfirm: async () => {
          const res = await fetch("/api/admin/template/deactivate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            return body.error ?? "Fehler beim Entfernen.";
          }
          router.refresh();
          return null;
        },
      }}
    />
  );
}
