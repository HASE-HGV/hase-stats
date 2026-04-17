import Link from "next/link";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <h1>Anmelden</h1>
      <div className="card">
        <LoginForm />
      </div>
      <p className="muted" style={{ marginTop: 16 }}>
        Noch kein Account? <Link href="/signup">Registrieren</Link>
      </p>
    </main>
  );
}
