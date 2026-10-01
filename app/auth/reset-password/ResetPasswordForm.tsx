"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { FormError, SubmitButton } from "@/components/form-parts";
import { CircleCheckIcon } from "lucide-react";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw !== pw2) {
      setErr("Passwörter stimmen nicht überein.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/wall");
      router.refresh();
    }, 1200);
  }

  if (done) {
    return (
      <Alert className="border-success/25 bg-success/10">
        <CircleCheckIcon aria-hidden className="text-success" />
        <AlertDescription>
          Passwort gespeichert. Du wirst weitergeleitet …
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <Field>
        <FieldLabel htmlFor="pw">Neues Passwort</FieldLabel>
        <Input
          id="pw"
          type="password"
          required
          minLength={8}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="new-password"
          autoFocus
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="pw2">Wiederholen</FieldLabel>
        <Input
          id="pw2"
          type="password"
          required
          minLength={8}
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          autoComplete="new-password"
        />
      </Field>

      <FormError message={err} />

      <SubmitButton loading={loading} loadingLabel="Speichere…">
        Passwort speichern
      </SubmitButton>
    </form>
  );
}
