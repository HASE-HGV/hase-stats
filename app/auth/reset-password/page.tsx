import ResetPasswordForm from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <h1>Neues Passwort setzen</h1>
      <p className="muted" style={{ fontSize: 14 }}>
        Du hast diesen Link aus einer Reset-Mail. Wähle jetzt ein neues
        Passwort für deinen Account.
      </p>
      <div className="card">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
