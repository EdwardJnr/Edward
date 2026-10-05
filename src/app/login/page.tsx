import { login } from "@/app/actions/auth";
import { Flash } from "@/components/flash";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  return (
    <div className="auth">
      <form action={login} className="card">
        <h1>
          Katungo <span style={{ color: "var(--mint)" }}>Engine</span>
        </h1>
        <Flash params={sp} />
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
        <div style={{ marginTop: 16 }}>
          <button className="btn">Sign in</button>
        </div>
      </form>
    </div>
  );
}
