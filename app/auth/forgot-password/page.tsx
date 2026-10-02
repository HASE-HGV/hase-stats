import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Passwort vergessen" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Passwort vergessen"
      description="Trag deine Email ein. Wir schicken dir einen Link, mit dem du ein neues Passwort setzen kannst."
      footer={
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Zurück zum Login
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
