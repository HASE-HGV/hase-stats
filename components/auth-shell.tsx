import Link from "next/link";
import { BrandMark } from "@/components/app-sidebar";

/**
 * Rahmen für die Auth-Seiten: zentriert, schmale Spalte, Brand oben.
 *
 * Vorher standen die Seiten mit `pt-10 pb-16` oben ausgerichtet und hatten
 * zwei separate Footer-Absätze, die zu viel Platz einnahmen.
 */
export default function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main
      className="flex min-h-dvh flex-col justify-center px-4 py-10 sm:px-6"
      style={{
        paddingLeft: "max(1rem, var(--sa-left))",
        paddingRight: "max(1rem, var(--sa-right))",
        paddingBottom: "max(2.5rem, var(--sa-bottom))",
      }}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-8">
        <Link
          href="/"
          className="justify-self-start rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark />
        </Link>

        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold">{title}</h1>
            {description ? (
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </div>

        {footer ? <div className="meta">{footer}</div> : null}
      </div>
    </main>
  );
}
