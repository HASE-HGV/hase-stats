"use client";

import * as React from "react";
import Autoplay from "embla-carousel-autoplay";
import type { DisplayQuote } from "@/lib/quotes";
import { formatDay } from "@/lib/quotes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

function initial(label: string) {
  return label.replace(/^@/, "")[0]?.toUpperCase() ?? "?";
}

export default function QuoteCarousel({ quotes }: { quotes: DisplayQuote[] }) {
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
        {quotes.map((q) => {
          const meta = (
            <div className="text-sm text-muted-foreground">
              {q.said_on ? `gesagt am ${formatDay(q.said_on)} · ` : ""}
              hinzugefügt von @{q.added_by_username}
            </div>
          );
          const isDialogue = q.lines.length > 1;

          return (
            <CarouselItem key={q.id}>
              <Card className="h-[30dvh] justify-center">
                <CardContent className="flex h-full flex-col justify-center gap-4 overflow-hidden px-[7%]">
                  {isDialogue ? (
                    <>
                      <div className="mx-auto grid w-full max-w-3xl gap-2.5">
                        {q.lines.map((l, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <Avatar className="mt-0.5 size-9 shrink-0">
                              {l.avatarUrl ? (
                                <AvatarImage src={l.avatarUrl} alt="" />
                              ) : null}
                              <AvatarFallback className="text-sm font-bold">
                                {initial(l.label)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-base font-bold md:text-lg">
                                {l.label}
                              </div>
                              <p className="text-lg whitespace-pre-line italic md:text-xl">
                                {l.text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mx-auto w-full max-w-3xl">{meta}</div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <blockquote className="line-clamp-6 max-w-full pr-[0.15em] text-2xl leading-snug font-medium whitespace-pre-line text-pretty italic md:text-3xl">
                        „{q.lines[0].text}“
                      </blockquote>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-11 shrink-0">
                          {q.lines[0].avatarUrl ? (
                            <AvatarImage src={q.lines[0].avatarUrl} alt="" />
                          ) : null}
                          <AvatarFallback className="font-bold">
                            {initial(q.lines[0].label)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <div className="text-lg font-bold md:text-xl">
                            — {q.lines[0].label}
                          </div>
                          {meta}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
}
