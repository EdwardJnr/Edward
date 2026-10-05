import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createUser, deleteUser, grantAccess, revokeAccess } from "@/app/actions/admin";
import { Flash } from "@/components/flash";

export default async function TeamPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const me = await requireUser();
  if (me.role !== "ADMIN") notFound();
  const [users, workspaces] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" }, include: { memberships: { include: { workspace: true } } } }),
    db.workspace.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <div className="head">
        <div>
          <h1>Team and access</h1>
          <p>Admins and staff see every business. Client accounts see only the businesses you give them, and can view but not change anything.</p>
        </div>
      </div>
      <Flash params={sp} />

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Businesses</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.name}
                  <div className="muted small">{u.email}</div>
                </td>
                <td>
                  <span className="pill">{u.role.toLowerCase()}</span>
                </td>
                <td className="small">
                  {u.role !== "CLIENT" && <span className="muted">All</span>}
                  {u.role === "CLIENT" && (
                    <>
                      {u.memberships.map((m) => (
                        <form key={m.workspaceId} action={revokeAccess} className="row" style={{ marginBottom: 4 }}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="workspaceId" value={m.workspaceId} />
                          <span>{m.workspace.name}</span>
                          <button className="btn small ghost">Remove</button>
                        </form>
                      ))}
                      <form action={grantAccess} className="row">
                        <input type="hidden" name="userId" value={u.id} />
                        <select name="workspaceId" style={{ width: "auto" }}>
                          {workspaces.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                        <button className="btn small ghost">Give access</button>
                      </form>
                    </>
                  )}
                </td>
                <td>
                  {u.id !== me.id && (
                    <form action={deleteUser}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button className="btn small danger">Remove</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={createUser} className="card">
        <h2>Add an account</h2>
        <div className="grid g2">
          <div>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" required />
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div>
            <label htmlFor="password">Temporary password (10+ characters)</label>
            <input id="password" name="password" type="text" required minLength={10} />
          </div>
          <div>
            <label htmlFor="role">Role</label>
            <select id="role" name="role" defaultValue="CLIENT">
              <option value="CLIENT">Client</option>
              <option value="STAFF">Katungo staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label htmlFor="workspaceId">Business (for clients)</label>
            <select id="workspaceId" name="workspaceId">
              <option value="">None yet</option>
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="btn">Create account</button>
        </div>
      </form>
    </>
  );
}
