"use client";

import { useTransition, type ReactNode } from "react";

// Runs a server action from a button, optionally after a confirmation prompt.
export function ActionButton({
  action,
  confirm,
  children,
  className,
}: {
  action: () => Promise<void>;
  confirm?: string;
  children: ReactNode;
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={className ?? "btn-quiet"}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(() => action());
      }}
    >
      {pending ? "…" : children}
    </button>
  );
}
