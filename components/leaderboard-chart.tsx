"use client";

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatAxisTick,
  formatDuration,
  type LeaderboardRow,
} from "@/lib/presence";
import { cn } from "@/lib/utils";

const chartConfig = {
  room: {
    label: "Hase-Raum",
    color: "var(--chart-1)",
  },
  homeoffice: {
    label: "Home Office",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

/**
 * Rangliste als horizontales, gestapeltes Balkendiagramm.
 *
 * Blau ist die Zeit im Hase-Raum, gelb die Home-Office-Zeit. Waagerecht,
 * weil die Usernamen links stehen und so nicht gekuerzt werden muessen. Der
 * eigene Balken ist mit einer hellen Kontur hervorgehoben.
 *
 * Wird auf der Stats-Seite und auf dem Kiosk (/display) benutzt — daher die
 * optionalen Props fuer Hoehe und Zusatz-Klassen.
 */
export default function LeaderboardChart({
  rows,
  currentUserId,
  height,
  className,
  showValues = false,
}: {
  rows: LeaderboardRow[];
  currentUserId?: string;
  height?: number;
  className?: string;
  /** Zeit am Balkenende anzeigen (Kiosk — dort gibt es keinen Tooltip). */
  showValues?: boolean;
}) {
  const data = rows.map((row) => {
    // Fallback fuer eine Datenbank ohne Migration: dann gibt es nur
    // total_seconds und die Zeit zaehlt als Hase-Raum.
    const roomHours =
      Number(row.room_seconds ?? row.total_seconds ?? 0) / 3600;
    const homeofficeHours = Number(row.homeoffice_seconds ?? 0) / 3600;

    return {
      username: `@${row.username}`,
      room: roomHours,
      homeoffice: homeofficeHours,
      totalHours: roomHours + homeofficeHours,
      visit_count: Number(row.visit_count),
      isSelf: row.user_id === currentUserId,
    };
  });

  if (data.length === 0) return null;

  return (
    <ChartContainer
      config={chartConfig}
      className={cn("aspect-auto w-full", className)}
      style={{ height: height ?? Math.max(180, data.length * 44 + 32) }}
    >
      <BarChart
        data={data}
        layout="vertical"
        // Rechts Platz fuer die Zeit-Beschriftung am Balkenende.
        margin={{ top: 4, right: showValues ? 96 : 16, bottom: 4, left: 0 }}
      >
        <XAxis
          type="number"
          dataKey="totalHours"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: number) => formatAxisTick(value)}
        />
        <YAxis
          dataKey="username"
          type="category"
          width={110}
          tickLine={false}
          axisLine={false}
          tickMargin={4}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={(label, payload) => {
                const visits = Number(payload?.[0]?.payload?.visit_count ?? 0);
                return (
                  <div className="flex items-baseline justify-between gap-3">
                    <span>{label}</span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {visits} {visits === 1 ? "Besuch" : "Besuche"}
                    </span>
                  </div>
                );
              }}
              formatter={(value, name) => (
                <div className="flex flex-1 items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {name === "homeoffice" ? "Home Office" : "Hase-Raum"}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatDuration(Number(value) * 3600)}
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend
          verticalAlign="top"
          content={<ChartLegendContent />}
        />
        <Bar dataKey="room" stackId="time" barSize={22}>
          {data.map((entry) => (
            <Cell
              key={`${entry.username}-room`}
              fill="var(--color-room)"
              stroke={entry.isSelf ? "var(--foreground)" : "none"}
              strokeWidth={entry.isSelf ? 1.5 : 0}
            />
          ))}
        </Bar>
        <Bar
          dataKey="homeoffice"
          stackId="time"
          fill="var(--color-homeoffice)"
          radius={[0, 6, 6, 0]}
          barSize={22}
        >
          {data.map((entry) => (
            <Cell
              key={`${entry.username}-homeoffice`}
              fill="var(--color-homeoffice)"
              stroke={entry.isSelf ? "var(--foreground)" : "none"}
              strokeWidth={entry.isSelf ? 1.5 : 0}
            />
          ))}

          {showValues ? (
            <LabelList
              dataKey="totalHours"
              position="right"
              offset={8}
              className="fill-foreground text-sm font-medium"
              formatter={(value) => formatDuration(Number(value) * 3600)}
            />
          ) : null}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
