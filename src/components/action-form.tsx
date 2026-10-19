"use client";

import { startTransition, useActionState, useEffect, useRef, type ReactNode } from "react";
import type { FormState } from "@/app/actions";

type Props = {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel?: string;
  children?: ReactNode;
  className?: string;
  quiet?: boolean;
  resetOnSuccess?: boolean;
};

// Wraps a server action with pending state and an inline result message.
// Submits manually so React does not clear the fields when the action
// returns an error; forms that should empty after success opt in.
export function ActionForm({ action, submitLabel, pendingLabel, children, className, quiet, resetOnSuccess }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && state?.message) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={formAction}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
      className={className ?? "flex flex-col gap-4"}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={quiet ? "btn-quiet" : "btn"} disabled={pending}>
          {pending ? (pendingLabel ?? "Working…") : submitLabel}
        </button>
        {state?.error && !pending && (
          <p role="alert" className="text-sm text-danger" data-form-error>
            {state.error}
          </p>
        )}
        {state?.message && !pending && <p className="text-sm text-muted">{state.message}</p>}
      </div>
    </form>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
