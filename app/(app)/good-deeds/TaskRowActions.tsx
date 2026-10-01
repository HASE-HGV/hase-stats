"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArchiveIcon, PencilIcon } from "lucide-react";
import RowActions, { type RowAction } from "@/components/row-actions";
import EditTemplateForm from "./EditTemplateForm";

/**
 * Hält den Öffnen/Zu-Zustand des Bearbeiten-Formulars, damit die Zeile auf
 * geschlossene Karte bleibt. Vorher standen hier zwei umbrechende Text-Buttons
 * ("Bearbeiten", "Entfernen") in jeder Zeile.
 */
export default function TaskRowActions({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);

  const actions: RowAction[] = [
    { label: "Bearbeiten", icon: PencilIcon, onSelect: () => setEditing(true) },
  ];

  return (
    <>
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

      {editing ? (
        <div className="mt-3 grid gap-2 border-t border-border pt-3">
          <EditTemplateForm
            id={id}
            initialTitle={title}
            initialDescription={description}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : null}
    </>
  );
}
