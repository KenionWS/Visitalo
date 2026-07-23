"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, ClipboardCheck, LogOut } from "lucide-react";
import { logout } from "@/app/admin/login/actions";

const NAV_ITEMS = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard, exact: true },
  { href: "/admin/agencies", label: "Inmobiliarias", icon: Building2, exact: false },
  { href: "/admin/proposals", label: "Propuestas", icon: ClipboardCheck, exact: false },
];

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-[var(--verde-profundo)]">
      <div className="px-6 py-6">
        <Link href="/admin" className="font-display text-xl text-white">
          visitalo<span className="text-[var(--ambar)]">.</span>
        </Link>
        <p className="mt-0.5 text-xs text-white/40">Panel de administración</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white/90"
              }`}
            >
              <Icon size={18} strokeWidth={2} className={active ? "text-[var(--ambar)]" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <p className="truncate px-3 text-xs text-white/40">{email}</p>
        <form action={logout}>
          <button
            type="submit"
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/55 hover:bg-white/5 hover:text-white/90"
          >
            <LogOut size={18} strokeWidth={2} />
            Salir
          </button>
        </form>
      </div>
    </aside>
  );
}
