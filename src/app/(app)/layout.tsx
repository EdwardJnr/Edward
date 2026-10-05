import { requireUser, visibleWorkspaces } from "@/lib/auth";
import { Nav } from "@/components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const workspaces = await visibleWorkspaces(user);
  return (
    <div className="shell">
      <Nav
        user={{ name: user.name, role: user.role }}
        workspaces={workspaces.map((w) => ({ slug: w.slug, name: w.name }))}
      />
      <main className="main">{children}</main>
    </div>
  );
}
