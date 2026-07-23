import { verifySession } from "@/lib/auth/dal";
import { Sidebar } from "@/components/admin/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  return (
    <div className="flex min-h-screen bg-[var(--fondo)]">
      <Sidebar email={session.email} />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10 sm:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
