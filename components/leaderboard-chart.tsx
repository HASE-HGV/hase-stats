"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
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
  duration: {
    label: "Zeit im Raum",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

/**
 * Rangliste als horizontales Balkendiagramm.
 *
 * Waagerecht, weil die Usernamen links stehen und so nicht gekuerzt werden
 * muessen. Der eigene Balken ist farblich hervorgehoben.
 *
 * Wird auf der Stats-Seite und auf dem Kiosk (/display) benutzt — daher die
 * optionalen Props fuer Hoehe und Zusatz-Klassen.
 */
export default function LeaderboardChart({
  rows,
  currentUserId,
  height,
  className,
}: {
  rows: LeaderboardRow[];
  currentUserId?: string;
  height?: number;
  className?: string;
}) {
  const data = rows.map((row) => ({
    username: `@${row.username}`,
    hours: Number(row.total_seconds) / 3600,
    visit_count: Number(row.visit_count),
    isSelf: row.user_id === currentUserId,
  }));

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
        margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
      >
        <XAxis
          type="number"
          dataKey="hours"
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
              formatter={(value, _name, item) => {
                const visits = Number(item?.payload?.visit_count ?? 0);
                return (
                  <div className="text-right">
                    <div className="font-medium">
                      {formatDuration(Number(value) * 3600)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {visits} {visits === 1 ? "Besuch" : "Besuche"}
                    </div>
                  </div>
                );
              }}
            />
          }
        />
        <Bar
          dataKey="hours"
          fill="var(--color-duration)"
          radius={[0, 6, 6, 0]}
          barSize={22}
        >
          {data.map((entry) => (
            <Cell
              key={entry.username}
              fill={
                entry.isSelf ? "var(--chart-2)" : "var(--color-duration)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
