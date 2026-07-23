import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "visitalo. — Tu próxima propiedad te busca a vos",
  description:
    "Contale a Visitalo qué buscás por WhatsApp y las inmobiliarias de tu zona te mandan propuestas reales.",
};

const STEPS = [
  {
    title: "Contanos qué buscás",
    body: "Zona, presupuesto y qué tipo de propiedad, todo charlando por WhatsApp.",
  },
  {
    title: "Te llegan propuestas reales",
    body: "Las inmobiliarias de tu zona te mandan opciones que matchean con lo que pediste.",
  },
  {
    title: "Vos elegís y coordinás",
    body: "Marcás favoritas, preguntás lo que necesites y pedís la visita, todo desde ahí.",
  },
];

function whatsappHref(): string | null {
  const number = process.env.WHATSAPP_DISPLAY_NUMBER;
  if (!number) return null;
  const text = encodeURIComponent("Hola! Quiero buscar una propiedad en Visitalo.");
  return `https://wa.me/${number}?text=${text}`;
}

export default function Home() {
  const waHref = whatsappHref();

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-[var(--verde-profundo)] px-5 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-xl">
            visitalo<span className="text-[var(--ambar)]">.</span>
          </p>
          <h1 className="mt-6 font-display text-4xl leading-tight sm:text-5xl">
            Tu próxima propiedad te busca a vos
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Contale por WhatsApp qué estás buscando y las inmobiliarias de tu zona te mandan propuestas reales — sin
            scrollear portales infinitos.
          </p>
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--ambar)] px-8 py-4 font-medium text-[var(--tinta)]"
            >
              Empezar por WhatsApp
            </a>
          ) : (
            <p className="mt-8 text-sm text-white/60">(Próximamente)</p>
          )}
        </div>
      </header>

      <main className="flex-1 px-5 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center font-display text-2xl text-[var(--tinta)]">Cómo funciona</h2>
          <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-[var(--tinta)]/10 bg-white p-5">
                <span className="font-display text-2xl text-[var(--verde)]">{i + 1}</span>
                <p className="mt-2 font-medium text-[var(--tinta)]">{step.title}</p>
                <p className="mt-1 text-sm text-[var(--tinta)]/60">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </main>

      <footer className="border-t border-[var(--tinta)]/10 px-5 py-6 text-center text-sm text-[var(--tinta)]/50">
        <Link href="/inmobiliarias" className="hover:text-[var(--tinta)]/80">
          ¿Sos inmobiliaria? Sumate acá →
        </Link>
      </footer>
    </div>
  );
}
