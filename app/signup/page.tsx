import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "Registrieren" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Registrieren"
      description="Lege einen Account an, um mitzumachen. Das Konto gilt für beide Walls."
      footer={
        <>
          Schon ein Account?{" "}
          <Link
            href="/login"
            className="text-foreground underline underline-offset-4"
          >
            Anmelden
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
