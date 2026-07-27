import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto w-full max-w-[420px] px-4 pt-10 pb-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Passwort vergessen</CardTitle>
          <CardDescription>
            Trag deine Email ein. Wir senden dir einen Link, mit dem du ein
            neues Passwort setzen kannst.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">
        <Link
          href="/login"
          className="text-primary underline-offset-4 hover:underline"
        >
          Zurück zum Login
        </Link>
      </p>
    </main>
  );
}
