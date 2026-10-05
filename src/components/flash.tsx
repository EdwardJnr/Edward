export function Flash({ params }: { params: Record<string, string | string[] | undefined> }) {
  const ok = typeof params.ok === "string" ? params.ok : "";
  const err = typeof params.error === "string" ? params.error : "";
  return (
    <>
      {ok && <div className="flash ok">{ok}</div>}
      {err && <div className="flash err">{err}</div>}
    </>
  );
}
