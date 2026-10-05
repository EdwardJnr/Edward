"use client";

import { useFormStatus } from "react-dom";

// Disables itself while the form's server action runs. AI calls can take a little while.
export function SubmitButton({ children, pending, className = "btn" }: { children: React.ReactNode; pending: string; className?: string }) {
  const status = useFormStatus();
  return (
    <button className={className} disabled={status.pending} aria-busy={status.pending}>
      {status.pending ? pending : children}
    </button>
  );
}
