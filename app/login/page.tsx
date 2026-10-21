import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/auth-shell";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell
      title="Anmelden"
      footer={
        <>
          Noch kein Account?{" "}
          <Link
            href="/signup"
            className="text-foreground underline underline-offset-4"
          >
            Registrieren
          </Link>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
