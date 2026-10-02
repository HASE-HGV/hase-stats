import type { Metadata } from "next";
import AuthShell from "@/components/auth-shell";
import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Neues Passwort" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Neues Passwort setzen"
      description="Du hast diesen Link aus einer Reset-Mail. Wähle jetzt ein neues Passwort für deinen Account."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
