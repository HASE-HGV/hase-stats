import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-[420px] px-4 pt-10 pb-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Anmelden</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">
        Noch kein Account?{" "}
        <Link
          href="/signup"
          className="text-primary underline-offset-4 hover:underline"
        >
          Registrieren
        </Link>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        <Link
          href="/auth/forgot-password"
          className="text-primary underline-offset-4 hover:underline"
        >
          Passwort vergessen?
        </Link>
      </p>
    </main>
  );
}
