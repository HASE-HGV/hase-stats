import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <h1>Passwort vergessen</h1>
      <p className="muted" style={{ fontSize: 14 }}>
        Trag deine Email ein. Wir senden dir einen Link, mit dem du ein neues
        Passwort setzen kannst.
      </p>
      <div className="card">
        <ForgotPasswordForm />
      </div>
      <p className="muted" style={{ marginTop: 16 }}>
        <Link href="/login">Zurück zum Login</Link>
      </p>
    </main>
  );
}
