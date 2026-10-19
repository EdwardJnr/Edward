"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/profile", label: "01–02 Profile" },
  { href: "/calendar", label: "03–04 Calendar" },
  { href: "/leads", label: "04 Leads" },
  { href: "/report", label: "05 Report" },
  { href: "/settings", label: "Settings" },
];

export function ClientNav({ id }: { id: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line">
      {TABS.map((tab) => {
        const href = `/clients/${id}${tab.href}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
              active ? "border-mint font-semibold text-teal" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
