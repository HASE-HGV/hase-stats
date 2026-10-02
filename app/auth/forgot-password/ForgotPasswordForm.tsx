"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { FormError, SubmitButton } from "@/components/form-parts";
import { MailCheckIcon } from "lucide-react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Alert className="border-success/25 bg-success/10">
        <MailCheckIcon aria-hidden className="text-success" />
        <AlertDescription className="text-pretty">
          Wenn ein Account mit dieser Email existiert, ist gerade eine Mail mit
          einem Link unterwegs. Bitte den Posteingang prüfen.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
        />
      </Field>

      <FormError message={err} />

      <SubmitButton loading={loading} loadingLabel="Sende…">
        Reset-Mail senden
      </SubmitButton>
    </form>
  );
}
