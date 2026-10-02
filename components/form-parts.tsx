"use client";

import { TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * Formularfehler als echte `role="alert"`-Meldung. Vorher stand überall nur
 * unformatierter roter Text am Formularende, ohne Semantik für Screenreader.
 */
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <Alert variant="destructive" className="bg-destructive/10">
      <TriangleAlertIcon aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

/**
 * Primärer Submit-Button. Volle Breite auf Mobile, wo schmale Buttons links
 * bündig schlecht zu treffen sind; auf Desktop wieder auto.
 */
export function SubmitButton({
  loading,
  loadingLabel,
  children,
  className,
  ...props
}: {
  loading?: boolean;
  loadingLabel?: string;
  children: React.ReactNode;
} & React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="submit"
      size="lg"
      disabled={loading || props.disabled}
      className={cn("w-full sm:w-auto sm:min-w-40", className)}
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
