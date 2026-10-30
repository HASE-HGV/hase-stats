"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import EditTemplateForm from "./EditTemplateForm";
import TaskRowActions from "./TaskRowActions";

export type TaskTableRow = {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  creator: { username: string } | null;
};

/**
 * Aufgabenliste als Tabelle. Die Bearbeiten-Aktion oeffnet eine Detailzeile
 * ueber die volle Breite — so bleibt das Formular in der schmalen
 * Aktionsspalte nicht eingequetscht.
 */
export default function TasksTable({
  tasks,
  currentUserId,
  isAdmin,
}: {
  tasks: TaskTableRow[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);

  return (
    <Table className="min-w-[36rem]">
      <TableCaption className="sr-only">
        Alle Aufgaben, die als Good Deed erledigt werden können.
      </TableCaption>
      <TableHeader className="bg-muted/40">
        <TableRow className="hover:bg-transparent">
          <TableHead>Aufgabe</TableHead>
          <TableHead className="w-48">Hinzugefügt von</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">Aktionen</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => {
          const canEdit =
            isAdmin || task.created_by === currentUserId;
          const editing = editingId === task.id;

          return (
            <React.Fragment key={task.id}>
              <TableRow data-state={editing ? "selected" : undefined}>
                <TableCell className="min-w-56 py-3.5 align-top whitespace-normal">
                  <p className="font-medium text-pretty">{task.title}</p>
                  {task.description ? (
                    <p className="mt-1 text-sm leading-relaxed text-pretty text-muted-foreground">
                      {task.description}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="py-3.5 align-top whitespace-nowrap text-muted-foreground">
                  {task.creator ? `@${task.creator.username}` : "—"}
                </TableCell>
                <TableCell className="py-2 pr-2 text-right align-top">
                  {canEdit ? (
                    <TaskRowActions
                      id={task.id}
                      title={task.title}
                      onEdit={() =>
                        setEditingId((current) =>
                          current === task.id ? null : task.id
                        )
                      }
                    />
                  ) : null}
                </TableCell>
              </TableRow>

              {editing && canEdit ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={3} className="bg-muted/30 py-4">
                    <div className="max-w-xl">
                      <EditTemplateForm
                        id={task.id}
                        initialTitle={task.title}
                        initialDescription={task.description}
                        onDone={() => setEditingId(null)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}
