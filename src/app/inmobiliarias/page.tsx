import type { Metadata } from "next";
import Link from "next/link";
import { AgencyLeadForm } from "./AgencyLeadForm";

export const metadata: Metadata = {
  title: "Sumá tu inmobiliaria — visitalo.",
  description: "Recibí compradores e inquilinos calificados directo por WhatsApp, sin pagar por publicar.",
};

const STEPS = [
  {
    title: "Te llega la búsqueda",
    body: "Un comprador o inquilino activo en tu zona, con presupuesto y preferencias ya definidas.",
  },
  {
    title: "Le contás qué tenés",
    body: "Mandás precio, fotos y características por WhatsApp, como ya lo hacés todos los días.",
  },
  {
    title: "Coordinás la visita",
    body: "Si le interesa, coordinás directo con el interesado — solo se descuenta un crédito cuando se concreta.",
  },
];

const BENEFITS = [
  "Sin costo de publicación",
  "Leads ya calificados: zona, presupuesto y forma de pago",
  "Solo pagás cuando se concreta una visita",
  "Todo por WhatsApp, sin aprender un sistema nuevo",
];

export default function InmobiliariasPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-[var(--verde-profundo)] px-5 py-14 text-white">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="font-display text-xl">
            visitalo<span className="text-[var(--ambar)]">.</span>
          </Link>
          <h1 className="mt-6 font-display text-3xl leading-tight sm:text-4xl">
            Compradores e inquilinos ya calificados, directo a tu WhatsApp
          </h1>
          <p className="mt-4 max-w-xl text-white/80">
            Visitalo te manda búsquedas activas de tu zona — vos respondés con lo que tenés y solo pagás cuando se
            concreta una visita.
          </p>
        </div>
      </header>

      <main className="flex-1 px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div
                key={b}
                className="flex items-start gap-2 rounded-xl bg-[var(--fondo)] p-4 text-sm text-[var(--tinta)]/80"
              >
                <span className="text-[var(--verde)]">✓</span>
                {b}
              </div>
            ))}
          </div>

          <h2 className="mt-12 font-display text-2xl text-[var(--tinta)]">Cómo funciona</h2>
          <ol className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-[var(--tinta)]/10 bg-white p-5">
                <span className="font-display text-2xl text-[var(--verde)]">{i + 1}</span>
                <p className="mt-2 font-medium text-[var(--tinta)]">{step.title}</p>
                <p className="mt-1 text-sm text-[var(--tinta)]/60">{step.body}</p>
              </li>
            ))}
          </ol>

          <h2 className="mt-12 font-display text-2xl text-[var(--tinta)]">Sumate</h2>
          <p className="mt-2 text-sm text-[var(--tinta)]/60">Dejanos tus datos y te contactamos para darte de alta.</p>
          <div className="mt-4 max-w-md">
            <AgencyLeadForm />
          </div>
        </div>
      </main>
    </div>
  );
}
