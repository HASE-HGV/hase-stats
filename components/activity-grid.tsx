"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/presence";
import { describeActivityDay } from "@/lib/activity";

/**
 * Client-Teil des Aktivitaets-Graphen.
 *
 * Das Raster selbst kommt als statisches HTML aus dem Server (siehe
 * `presence-activity.tsx`) — hier passiert nur, was im Browser gebraucht
 * wird: die Kacheln sind eine einzige Fläche, auf der ein einziger
 * Listener haengt (Event-Delegation statt 369 Listener), und der Tooltip
 * wird ueber ein Portal positioniert.
 */

const LEVEL_CLASS = [
  "bg-foreground/[0.07]",
  "bg-success/30",
  "bg-success/50",
  "bg-success/75",
  "bg-success",
];

type Hovered = {
  date: string;
  seconds: number;
  x: number;
  y: number;
};

function Tooltip({ hovered }: { hovered: Hovered }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [left, setLeft] = React.useState(hovered.x);

  React.useEffect(() => {
    const half = (ref.current?.offsetWidth ?? 0) / 2;
    const edge = half + 8;
    setLeft(Math.min(Math.max(hovered.x, edge), window.innerWidth - edge));
  }, [hovered.x]);

  return createPortal(
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left,
        top: hovered.y,
        transform: "translate(-50%, calc(-100% - 8px))",
      }}
    >
      <div
        ref={ref}
        data-slot="activity-tooltip"
        className="rounded-xl bg-foreground px-2.5 py-1.5 text-[11px] font-medium whitespace-nowrap text-background shadow-lg"
      >
        {describeActivityDay(hovered.date, hovered.seconds)}
      </div>
    </div>,
    document.body,
  );
}

export default function ActivityGrid({
  children,
  total,
  className,
}: {
  /** Das serverseitig gerenderte Raster. */
  children: React.ReactNode;
  /** Summe der Anwesenheitszeit im Zeitraum. */
  total: number;
  className?: string;
}) {
  const [hovered, setHovered] = React.useState<Hovered | null>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  // Die juengsten Wochen sind die interessanten — deshalb nach rechts scrollen.
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  function onPointerOver(event: React.PointerEvent<HTMLDivElement>) {
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-day]",
    );

    if (!target) {
      setHovered(null);
      return;
    }

    const rect = target.getBoundingClientRect();
    setHovered({
      date: target.dataset.day ?? "",
      seconds: Number(target.dataset.seconds ?? 0),
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        ref={scrollerRef}
        className="overflow-x-auto pb-1"
        onPointerOver={onPointerOver}
        onPointerLeave={() => setHovered(null)}
      >
        {children}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="meta">
          Summe: {formatDuration(total)}
          {hovered ? ` · ${describeActivityDay(hovered.date, hovered.seconds)}` : null}
        </p>
        <div className="flex items-center gap-2" aria-hidden>
          <span className="text-[11px] text-muted-foreground">Weniger</span>
          {LEVEL_CLASS.map((tone, level) => (
            <span key={level} className={cn("size-2.5 rounded-[3px]", tone)} />
          ))}
          <span className="text-[11px] text-muted-foreground">Mehr</span>
        </div>
      </div>

      {hovered ? <Tooltip hovered={hovered} /> : null}
    </div>
  );
}
