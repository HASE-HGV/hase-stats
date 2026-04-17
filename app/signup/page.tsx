import Link from "next/link";
import SignupForm from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <h1>Registrieren</h1>
      <div className="card">
        <SignupForm />
      </div>
      <p className="muted" style={{ marginTop: 16 }}>
        Schon Account? <Link href="/login">Anmelden</Link>
      </p>
    </main>
  );
}
