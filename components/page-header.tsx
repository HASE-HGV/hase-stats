import { cn } from "@/lib/utils";

/**
 * Einheitlicher Seitenkopf. Ersetzt das überall handgeschriebene
 * `<h1 className="mb-4 text-2xl font-bold sm:text-3xl">`, damit Typografie
 * und Abstände auf jeder Seite identisch sind.
 *
 * `title` ist immer die einzige `h1` der Seite. `description` optional,
 * `meta` für Zähler/Badges, `action` für eine Aktion oben rechts.
 */
export default function PageHeader({
  title,
  description,
  meta,
  action,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{title}</h1>
          {meta}
        </div>
        {description ? (
          <p className="max-w-prose text-pretty text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}
