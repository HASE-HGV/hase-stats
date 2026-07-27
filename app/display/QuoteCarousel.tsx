"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import type { QuoteRow } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
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
            <Card className="h-[30dvh] justify-center">
              <CardContent className="flex h-full flex-col items-center justify-center gap-4 px-[7%] text-center">
                <blockquote className="line-clamp-4 max-w-full pr-[0.15em] text-2xl leading-snug font-medium text-pretty italic md:text-3xl">
                  „{q.text}“
                </blockquote>
                <div className="flex items-center gap-3">
                  <Avatar className="size-11 shrink-0">
                    {q.author_avatar_url ? (
                      <AvatarImage src={q.author_avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="font-bold">
                      {q.author_display?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="text-lg font-bold md:text-xl">
                      —{" "}
                      {q.author_username
                        ? `@${q.author_username}`
                        : q.author_display}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {q.said_on ? `gesagt am ${formatDay(q.said_on)} · ` : ""}
                      hinzugefügt von @{q.added_by_username}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
