"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { FormError, SubmitButton } from "@/components/form-parts";
import { MailCheckIcon } from "lucide-react";

export default function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    setLoading(false);
    if (error) {
      setErr(
        error.message === "User already registered"
          ? "Für diese Email existiert schon ein Account."
          : error.message
      );
      return;
    }
    if (!data.session) {
      setInfo(
        "Fast geschafft. Bitte bestätige deine Email über den Link, den wir dir geschickt haben."
      );
      return;
    }
    router.push("/profile");
    router.refresh();
  }

  if (info) {
    return (
      <Alert className="bg-success/10 text-success border-success/25">
        <MailCheckIcon aria-hidden />
        <AlertDescription className="text-pretty">
          {info}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <Field>
        <FieldLabel htmlFor="username">Nutzername</FieldLabel>
        <Input
          id="username"
          type="text"
          required
          minLength={2}
          maxLength={32}
          pattern="[a-zA-Z0-9_\-]+"
          title="Buchstaben, Zahlen, _ und -"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
        />
        <FieldDescription>So erscheinst du auf der Wall.</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="password">Passwort</FieldLabel>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <FieldDescription>Mindestens 8 Zeichen.</FieldDescription>
      </Field>

      <FormError message={err} />

      <SubmitButton loading={loading} loadingLabel="Einen Moment…">
        Registrieren
      </SubmitButton>
    </form>
  );
}
