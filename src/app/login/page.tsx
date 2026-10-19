import { login } from "@/app/actions";
import { ActionForm, Field } from "@/components/action-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="card w-full max-w-sm">
        <h1 className="text-4xl">Katungo</h1>
        <p className="label mt-1 mb-6">Studio dashboard</p>
        <ActionForm action={login} submitLabel="Sign in" pendingLabel="Signing in…">
          <input type="hidden" name="next" value={typeof next === "string" ? next : "/"} />
          <Field label="Studio password">
            <input className="field" type="password" name="password" required autoFocus autoComplete="current-password" />
          </Field>
        </ActionForm>
      </div>
    </main>
  );
}
