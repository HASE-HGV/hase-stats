"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import type { QuoteRow } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

// "2024-03-15" -> "15.03.2024" (ohne Zeitzonen-Verschiebung).
function formatDay(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export default function QuoteCarousel({ quotes }: { quotes: QuoteRow[] }) {
  // Ein Zitat gleichzeitig, wechselt automatisch alle 8 Sekunden.
  const autoplay = React.useRef(
    Autoplay({ delay: 8000, stopOnInteraction: false, stopOnMouseEnter: false })
  );

  return (
    <Carousel
      opts={{ loop: true, align: "start" }}
      plugins={[autoplay.current]}
      className="w-full"
    >
      <CarouselContent>
        {quotes.map((q) => (
          <CarouselItem key={q.id}>
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-8 rounded-2xl border border-primary/25 bg-card p-[clamp(24px,4vw,64px)] text-center">
              <blockquote className="max-w-4xl text-[clamp(24px,4vw,52px)] leading-snug font-medium text-balance italic">
                „{q.text}“
              </blockquote>
              <div className="flex items-center gap-4">
                <Avatar className="size-[clamp(48px,7vw,80px)] ring-2 ring-primary">
                  {q.author_avatar_url ? (
                    <AvatarImage src={q.author_avatar_url} alt="" />
                  ) : null}
                  <AvatarFallback className="text-3xl font-extrabold">
                    {q.author_display?.[0]?.toUpperCase() ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <div className="text-[clamp(20px,2.8vw,34px)] font-extrabold">
                    —{" "}
                    {q.author_username
                      ? `@${q.author_username}`
                      : q.author_display}
                  </div>
                  <div className="text-[clamp(12px,1.4vw,18px)] text-muted-foreground">
                    {q.said_on ? `gesagt am ${formatDay(q.said_on)} · ` : ""}
                    hinzugefügt von @{q.added_by_username}
                  </div>
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
