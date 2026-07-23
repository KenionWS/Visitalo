import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Users, Heart, CalendarCheck2, ShieldCheck, Lock } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { ScrollySteps } from "@/components/ScrollySteps";
import { Faq } from "@/components/Faq";

type Step = { icon: React.ReactNode; title: string; body: string };

export const metadata: Metadata = {
  title: "visitalo. — Tu próxima propiedad te busca a vos",
  description:
    "Contale a Visitalo qué buscás por WhatsApp y las inmobiliarias de tu zona te mandan propuestas reales.",
};

const ICON_PROPS = { size: 22, strokeWidth: 2 } as const;

const STEPS: Step[] = [
  {
    icon: <MessageCircle {...ICON_PROPS} />,
    title: "Contale a Visitalo qué buscás",
    body: "Por WhatsApp, como hablarías con un amigo: zona, presupuesto, si es para comprar o alquilar y qué características te importan. Nada de formularios largos.",
  },
  {
    icon: <Users {...ICON_PROPS} />,
    title: "Las inmobiliarias de tu zona te responden",
    body: "Tu búsqueda les llega de forma anónima, sin tu teléfono ni tus datos. Las que tienen algo que puede interesarte te mandan precio, fotos y características reales.",
  },
  {
    icon: <Heart {...ICON_PROPS} />,
    title: "Armás tu shortlist",
    body: "Todas las propuestas te quedan guardadas en un link personal: marcás favoritas, descartás las que no te sirven y preguntás lo que necesites — la pregunta y la respuesta viajan sin exponer el contacto de nadie.",
  },
  {
    icon: <CalendarCheck2 {...ICON_PROPS} />,
    title: "Pedís la visita",
    body: "Cuando algo te convence, pedís visita con un toque. La inmobiliaria te ofrece 2 o 3 horarios y vos elegís el que te queda mejor.",
  },
  {
    icon: <ShieldCheck {...ICON_PROPS} />,
    title: "Recién ahí se comparten los datos",
    body: "Hasta que no confirmás una visita, tu teléfono no llega a ninguna inmobiliaria. Cuando confirmás, ahí sí se intercambian los contactos para coordinar la dirección exacta.",
  },
];

const COMPARISON = {
  antes: [
    "Scrollear cientos de publicaciones repetidas",
    "Mandar el mismo mensaje a 15 inmobiliarias distintas",
    "Fotos que no coinciden con la propiedad real",
    "Tu teléfono publicado en cualquier portal",
  ],
  ahora: [
    "Contás una vez lo que buscás y listo",
    "Las propuestas te llegan a vos, no al revés",
    "Fichas armadas por la inmobiliaria, con fotos reales",
    "Tu contacto solo se comparte cuando vos confirmás una visita",
  ],
};

const FAQ_ITEMS = [
  { q: "¿Tiene algún costo para mí?", a: "No. Buscar y recibir propuestas en Visitalo es gratis para compradores e inquilinos, siempre." },
  { q: "¿En qué zonas funciona?", a: "Por ahora cubrimos la Ciudad de Buenos Aires (CABA), barrio por barrio." },
  { q: "¿Sirve para comprar y para alquilar?", a: "Sí, las dos cosas — se lo aclarás a Visitalo al principio de la conversación." },
  {
    q: "¿Qué pasa con mis datos?",
    a: "Tu búsqueda le llega a las inmobiliarias sin tu nombre ni tu teléfono. Recién cuando vos confirmás una visita se comparte el contacto, y solo con esa inmobiliaria puntual.",
  },
  { q: "¿Tengo que descargar algo?", a: "No, todo pasa por WhatsApp — el mismo que ya usás todos los días." },
];

function whatsappHref(): string | null {
  const number = process.env.WHATSAPP_DISPLAY_NUMBER;
  if (!number) return null;
  const text = encodeURIComponent("Hola! Quiero buscar una propiedad en Visitalo.");
  return `https://wa.me/${number}?text=${text}`;
}

function WhatsAppCta({ className = "" }: { className?: string }) {
  const waHref = whatsappHref();
  if (!waHref) {
    return <p className={`text-sm text-[var(--tinta)]/50 ${className}`}>(Próximamente)</p>;
  }
  return (
    <a
      href={waHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full bg-[var(--ambar)] px-8 py-4 font-medium text-[var(--tinta)] transition-transform hover:scale-[1.02] ${className}`}
    >
      Empezar por WhatsApp
    </a>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-[var(--verde-profundo)] px-5 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-2xl sm:text-3xl">
            visitalo<span className="text-[var(--ambar)]">.</span>
          </p>
          <h1 className="mt-6 font-display text-4xl leading-tight sm:text-5xl">
            Tu próxima propiedad te busca a vos
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Contale por WhatsApp qué estás buscando y las inmobiliarias de tu zona te mandan propuestas reales — sin
            scrollear portales infinitos.
          </p>
          <WhatsAppCta className="mt-8" />
        </div>
      </header>

      <main className="flex-1">
        <section className="px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <Reveal className="text-center">
              <h2 className="font-display text-2xl text-[var(--tinta)] sm:text-3xl">
                Buscar propiedad no debería ser un trabajo aparte
              </h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Reveal>
                <div className="h-full rounded-2xl border border-[var(--tinta)]/10 bg-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tinta)]/40">Antes</p>
                  <ul className="mt-3 space-y-2.5">
                    {COMPARISON.antes.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-[var(--tinta)]/70">
                        <span className="mt-0.5 text-[var(--tinta)]/30">✕</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="h-full rounded-2xl border border-[var(--verde)]/30 bg-[var(--verde-claro)] p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--verde-profundo)]/60">
                    Con Visitalo
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {COMPARISON.ahora.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-[var(--verde-profundo)]">
                        <span className="mt-0.5">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

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
          <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--verde-claro)] text-[var(--verde-profundo)]">
              <Lock size={26} strokeWidth={2} />
            </div>
            <h2 className="font-display text-2xl text-[var(--tinta)] sm:text-3xl">Tu privacidad, primero</h2>
            <p className="text-[var(--tinta)]/65">
              Ninguna inmobiliaria ve tu nombre ni tu teléfono hasta que vos decidís confirmar una visita. Las
              preguntas que hacés y las respuestas que recibís se revisan para que nunca se filtre un dato de
              contacto antes de tiempo.
            </p>
          </Reveal>
        </section>

        <section className="bg-[var(--fondo)] px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl">
            <Reveal>
              <h2 className="text-center font-display text-2xl text-[var(--tinta)] sm:text-3xl">Preguntas frecuentes</h2>
            </Reveal>
            <Reveal delay={100} className="mt-8">
              <Faq items={FAQ_ITEMS} />
            </Reveal>
          </div>
        </section>

        <section className="px-5 py-16 text-center sm:py-24">
          <Reveal className="mx-auto max-w-xl">
            <h2 className="font-display text-2xl text-[var(--tinta)] sm:text-3xl">
              Empezá a buscar sin mover un dedo de más
            </h2>
            <WhatsAppCta className="mt-6" />
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[var(--tinta)]/10 px-5 py-6 text-center text-sm text-[var(--tinta)]/50">
        <Link href="/inmobiliarias" className="hover:text-[var(--tinta)]/80">
          ¿Sos inmobiliaria? Sumate acá →
        </Link>
      </footer>
    </div>
  );
}
