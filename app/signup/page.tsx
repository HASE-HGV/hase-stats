import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="mx-auto w-full max-w-[420px] px-4 pt-10 pb-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Registrieren</CardTitle>
        </CardHeader>
        <CardContent>
          <SignupForm />
        </CardContent>
      </Card>
      <p className="mt-4 text-sm text-muted-foreground">
        Schon Account?{" "}
        <Link
          href="/login"
          className="text-primary underline-offset-4 hover:underline"
        >
          Anmelden
        </Link>
      </p>
    </main>
  );
}
