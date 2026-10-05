"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";

type Props = {
  user: { name: string; role: string };
  workspaces: { slug: string; name: string }[];
};

const SECTIONS = [
  ["", "Overview"],
  ["leads", "Leads"],
  ["content", "Content studio"],
  ["inbox", "Inbox"],
  ["chatbots", "Chatbots"],
  ["reports", "Reports"],
  ["brand", "Brand profile"],
  ["billing", "Billing"],
] as const;

export function Nav({ user, workspaces }: Props) {
  const params = useParams<{ slug?: string }>();
  const pathname = usePathname();
  const active = workspaces.find((w) => w.slug === params.slug);
  const link = (href: string, label: string, exact = false) => {
    const on = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link key={href} href={href} className={on ? "on" : undefined}>
        {label}
      </Link>
    );
  };
  return (
    <nav className="side">
      <div className="wordmark">
        Katungo <span>Engine</span>
      </div>
      {link("/dashboard", "All businesses")}
      {user.role === "ADMIN" && link("/team", "Team and access")}
      {active && (
        <>
          <div className="label">{active.name}</div>
          {SECTIONS.map(([path, label]) =>
            path ? link(`/w/${active.slug}/${path}`, label) : link(`/w/${active.slug}`, label, true),
          )}
        </>
      )}
      <div className="foot">
        <div>{user.name}</div>
        <form action={logout}>
          <button className="btn small ghost" style={{ color: "#d7ebe3", marginTop: 6 }}>
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
