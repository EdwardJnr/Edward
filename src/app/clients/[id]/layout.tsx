import Link from "next/link";
import { getClient } from "@/lib/data";
import { ClientNav } from "./nav";

export default async function ClientLayout(props: LayoutProps<"/clients/[id]">) {
  const { id } = await props.params;
  const client = await getClient(id);
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-8">
      <Link href="/" className="label hover:text-teal">
        ← All clients
      </Link>
      <header className="mt-3 mb-6">
        <h1 className="text-4xl sm:text-5xl">{client.name}</h1>
        {client.sector && <p className="mt-1 text-muted">{client.sector}</p>}
      </header>
      <ClientNav id={id} />
      <main className="pt-8">{props.children}</main>
    </div>
  );
}
