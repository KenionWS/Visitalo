import Link from "next/link";
import { verifySession } from "@/lib/auth/dal";
import { logout } from "../login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  return (
    <div className="min-h-screen bg-[var(--fondo)]">
      <header className="flex items-center justify-between border-b border-[var(--tinta)]/10 bg-white px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-display text-lg text-[var(--verde-profundo)]">
            visitalo<span className="text-[var(--ambar)]">.</span>
          </Link>
          <nav className="flex gap-4 text-sm text-[var(--tinta)]/70">
            <Link href="/admin/agencies" className="hover:text-[var(--verde-profundo)]">
              Inmobiliarias
            </Link>
            <Link href="/admin/proposals" className="hover:text-[var(--verde-profundo)]">
              Propuestas por revisar
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-[var(--tinta)]/60">
          <span>{session.email}</span>
          <form action={logout}>
            <button type="submit" className="text-[var(--verde-profundo)] hover:underline">
              Salir
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
