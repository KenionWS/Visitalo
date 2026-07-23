import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Send, CalendarClock, CheckCircle2, Ban, Gift } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { ScrollySteps } from "@/components/ScrollySteps";
import { Faq } from "@/components/Faq";
import { AgencyLeadForm } from "./AgencyLeadForm";

export const metadata: Metadata = {
  title: "Sumá tu inmobiliaria — visitalo.",
  description: "Recibí compradores e inquilinos calificados directo por WhatsApp, sin pagar por publicar.",
};

type Step = { icon: React.ReactNode; title: string; body: string };

const ICON_PROPS = { size: 22, strokeWidth: 2 } as const;

const STEPS: Step[] = [
  {
    icon: <Inbox {...ICON_PROPS} />,
    title: "Te llega una búsqueda activa de tu zona",
    body: "Una ficha anónima con zona, presupuesto y qué tipo de propiedad busca — sin nombre ni teléfono del comprador todavía.",
  },
  {
    icon: <Send {...ICON_PROPS} />,
    title: "Respondés con lo que tenés",
    body: "Precio, m², ambientes, fotos y características, todo por WhatsApp — el mismo canal que ya usás, sin entrar a ningún sistema nuevo. Si no tenés nada para esa búsqueda, respondés \"paso\" y listo.",
  },
  {
    icon: <CalendarClock {...ICON_PROPS} />,
    title: "Coordinás la visita",
    body: "Si al comprador le interesa, te pide coordinar. Le ofrecés 2 o 3 horarios que te queden bien y él elige el que más le sirve.",
  },
  {
    icon: <CheckCircle2 {...ICON_PROPS} />,
    title: "Se concreta y ahí se comparten los contactos",
    body: "Recién cuando la visita queda confirmada se intercambian los datos de contacto entre vos y el comprador para coordinar la dirección exacta.",
  },
];

const PRICING_POINTS = [
  { icon: Gift, text: "Publicar y recibir búsquedas no tiene costo — nunca pagás por aparecer." },
  { icon: Ban, text: "No se cobra por lead ni por pregunta respondida." },
  { icon: CheckCircle2, text: "Solo se descuenta un crédito cuando una visita se confirma de verdad." },
];

const FAQ_ITEMS = [
  { q: "¿Tengo que instalar algo o aprender un sistema nuevo?", a: "No, todo funciona por WhatsApp, el mismo número y la misma app que ya usás." },
  { q: "¿Puedo elegir en qué zonas recibir búsquedas?", a: "Sí, das de alta las zonas donde operás y solo te llegan búsquedas de esos barrios." },
  { q: "¿Qué pasa si no tengo nada para ofrecer?", a: "Respondés \"paso\" y no pasa nada — no suma ni resta, simplemente no se genera una propuesta." },
  { q: "¿Cómo sé si un comprador es real?", a: "Cada búsqueda pasa por una conversación de calificación antes de llegarte: zona, presupuesto y forma de pago ya están definidos." },
  { q: "¿Y si la visita no se termina concretando?", a: "No se descuenta ningún crédito. Solo se cobra cuando la visita se confirma efectivamente entre las dos partes." },
];

export default function InmobiliariasPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-[var(--verde-profundo)] px-5 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Link href="/" className="font-display text-xl">
            visitalo<span className="text-[var(--ambar)]">.</span>
          </Link>
          <h1 className="mt-6 font-display text-4xl leading-tight sm:text-5xl">
            Compradores e inquilinos calificados, directo a tu WhatsApp
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Visitalo te manda búsquedas activas de tu zona — vos respondés con lo que tenés y solo pagás cuando se
            concreta una visita.
          </p>
          <a
            href="#sumate"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--ambar)] px-8 py-4 font-medium text-[var(--tinta)] transition-transform hover:scale-[1.02]"
          >
            Quiero sumarme
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-[var(--fondo)] px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <h2 className="font-display text-2xl text-[var(--tinta)] sm:text-3xl">Cómo funciona</h2>
            </Reveal>
            <div className="mt-12">
              <ScrollySteps stepCount={STEPS.length}>
                {STEPS.map((step) => (
                  <div key={step.title} data-scrolly-step className="scroll-mt-28">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--verde-claro)] text-[var(--verde-profundo)] md:hidden">
                      {step.icon}
                    </div>
                    <p className="mt-3 font-display text-2xl text-[var(--tinta)] md:mt-0">{step.title}</p>
                    <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-[var(--tinta)]/65">{step.body}</p>
                  </div>
                ))}
              </ScrollySteps>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl">
            <Reveal className="text-center">
              <h2 className="font-display text-2xl text-[var(--tinta)] sm:text-3xl">Un modelo simple</h2>
            </Reveal>
            <div className="mt-10 space-y-3">
              {PRICING_POINTS.map((point, i) => {
                const Icon = point.icon;
                return (
                  <Reveal key={point.text} delay={i * 100}>
                    <div className="flex items-center gap-4 rounded-2xl border border-[var(--tinta)]/10 bg-white p-5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--verde-claro)] text-[var(--verde-profundo)]">
                        <Icon size={20} strokeWidth={2} />
                      </div>
                      <p className="text-sm text-[var(--tinta)]/80">{point.text}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-[var(--fondo)] px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <h2 className="text-center font-display text-2xl text-[var(--tinta)] sm:text-3xl">
                Preguntas frecuentes
              </h2>
            </Reveal>
            <Reveal delay={100} className="mt-8">
              <Faq items={FAQ_ITEMS} />
            </Reveal>
          </div>
        </section>

        <section id="sumate" className="px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-md">
            <Reveal className="text-center">
              <h2 className="font-display text-2xl text-[var(--tinta)] sm:text-3xl">Sumate</h2>
              <p className="mt-2 text-sm text-[var(--tinta)]/60">
                Dejanos tus datos y te contactamos para darte de alta.
              </p>
            </Reveal>
            <Reveal delay={100} className="mt-6">
              <AgencyLeadForm />
            </Reveal>
          </div>
        </section>
      </main>
    </div>
  );
}
