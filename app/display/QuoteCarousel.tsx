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
import { cn } from "@/lib/utils";

/** Wie viele Zitate gleichzeitig zu sehen sind. */
const SLIDES_PER_VIEW = 2;

function initial(label: string) {
  return label.replace(/^@/, "")[0]?.toUpperCase() ?? "?";
}

/**
 * Wie lange ein Zitat stehen bleibt.
 *
 * Frueher waren es feste 8 Sekunden — fuer laengere Zitate und Dialoge zu
 * kurz. Jetzt gibt es eine Grundzeit plus Lesezeit (etwa 2,5 Woerter pro
 * Sekunde), gedeckelt nach oben, damit ein langer Dialog nicht ewig steht.
 */
function readingTime(quote: DisplayQuote): number {
  const words = quote.lines
    .map((line) => line.text)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.min(30_000, 12_000 + Math.round((words / 2.5) * 1000));
}

/** Zitate zu Paaren buendeln — pro Ansicht zwei Karten nebeneinander. */
function toSlides(quotes: DisplayQuote[]): DisplayQuote[][] {
  const slides: DisplayQuote[][] = [];
  for (let i = 0; i < quotes.length; i += SLIDES_PER_VIEW) {
    slides.push(quotes.slice(i, i + SLIDES_PER_VIEW));
  }
  return slides;
}

/** Standzeit einer Ansicht: das laengere Zitat plus etwas Luft. */
function slideTime(slide: DisplayQuote[]): number {
  return Math.min(35_000, Math.max(...slide.map(readingTime)) + 2_000);
}

/** Ein Zitat als Karte (Einzelzitat oder Dialog). */
function QuoteCard({
  quote,
  className,
}: {
  quote: DisplayQuote;
  className?: string;
}) {
  const meta = (
    <div className="text-sm text-muted-foreground">
      {quote.said_on ? `gesagt am ${formatDay(quote.said_on)} · ` : ""}
      hinzugefügt von @{quote.added_by_username}
    </div>
  );
  const isDialogue = quote.lines.length > 1;

  return (
    <Card className={cn("h-full justify-center", className)}>
      <CardContent className="flex h-full flex-col justify-center gap-4 overflow-hidden px-[7%]">
        {isDialogue ? (
          <>
            <div className="mx-auto grid w-full max-w-3xl gap-2.5">
              {quote.lines.map((line, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Avatar className="mt-0.5 size-9 shrink-0">
                    {line.avatarUrl ? (
                      <AvatarImage src={line.avatarUrl} alt="" />
                    ) : null}
                    <AvatarFallback className="text-sm font-bold">
                      {initial(line.label)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="text-base font-bold md:text-lg">
                      {line.label}
                    </div>
                    <p className="text-lg whitespace-pre-line italic md:text-xl">
                      {line.text}
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
              „{quote.lines[0].text}“
            </blockquote>
            <div className="flex items-center gap-3">
              <Avatar className="size-11 shrink-0">
                {quote.lines[0].avatarUrl ? (
                  <AvatarImage src={quote.lines[0].avatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="font-bold">
                  {initial(quote.lines[0].label)}
                </AvatarFallback>
              </Avatar>
              <div className="text-left">
                <div className="text-lg font-bold md:text-xl">
                  — {quote.lines[0].label}
                </div>
                {meta}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function QuoteCarousel({ quotes }: { quotes: DisplayQuote[] }) {
  // Die Zitate koennen sich beim Server-Refresh aendern, das Plugin bleibt
  // aber bestehen — deshalb liest die Delay-Funktion den aktuellen Stand
  // ueber die Ref.
  const quotesRef = React.useRef(quotes);
  React.useEffect(() => {
    quotesRef.current = quotes;
  }, [quotes]);

  // Plugin und Optionen muessen ueber Renders hinweg dieselben bleiben:
  // Embla initialisiert bei jeder neuen Referenz neu, und ein Re-Init
  // setzt den Autoplay-Timer zurueck. Bei einem Ansichtswechsel alle 20 s
  // wuerde ein laengeres Zitat sonst nie durchkommen.
  const [plugins] = React.useState(() => [
    Autoplay({
      // Zwei Zitate gleichzeitig, Dauer je nach Laenge (siehe slideTime).
      delay: (scrollSnaps) => {
        const slides = toSlides(quotesRef.current);
        return scrollSnaps.map((_, index) => {
          const slide = slides[index];
          return slide && slide.length > 0 ? slideTime(slide) : 15_000;
        });
      },
      stopOnInteraction: false,
      stopOnMouseEnter: false,
    }),
  ]);

  const opts = React.useMemo(
    () => ({ loop: true, align: "start" as const }),
    []
  );

  const slides = React.useMemo(() => toSlides(quotes), [quotes]);

  return (
    <Carousel opts={opts} plugins={plugins} className="w-full">
      <CarouselContent>
        {slides.map((slide) => (
          <CarouselItem key={slide.map((q) => q.id).join("-")}>
            <div className="grid h-[30dvh] grid-cols-2 gap-4">
              {slide.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  // Ein einzelnes Zitat am Ende nutzt die volle Breite.
                  className={slide.length === 1 ? "col-span-2" : undefined}
                />
              ))}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
