import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, ClipboardCheck, Inbox, Send, CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { ScrollySteps } from "@/components/ScrollySteps";
import { Faq } from "@/components/Faq";
import { ChatSim, type ChatMessage } from "@/components/ChatSim";
import { AgencyLeadForm } from "./AgencyLeadForm";

export const metadata: Metadata = {
  title: "Sumá tu inmobiliaria — visitalo.",
  description: "Recibí compradores e inquilinos calificados directo por WhatsApp, sin pagar por publicar.",
};

type Step = { icon: React.ReactNode; title: string; body: string };

const ICON_PROPS = { size: 22, strokeWidth: 2 } as const;

const STEPS: Step[] = [
  {
    icon: <MessageCircle {...ICON_PROPS} />,
    title: "El comprador escribe",
    body: "Por WhatsApp, texto libre: qué busca, en qué zona y con qué presupuesto.",
  },
  {
    icon: <ClipboardCheck {...ICON_PROPS} />,
    title: "Visitalo lo califica",
    body: "Forma de pago, si tiene crédito preaprobado, plazos y qué características le importan — antes de que te llegue a vos.",
  },
  {
    icon: <Inbox {...ICON_PROPS} />,
    title: "Te llega la ficha",
    body: "Perfil anónimo del comprador, filtrado por tu zona. Sin nombre ni teléfono todavía.",
  },
  {
    icon: <Send {...ICON_PROPS} />,
    title: "Vos proponés",
    body: "Precio, fotos y características de lo que tenés, todo por WhatsApp. Si no tenés nada, respondés \"paso\" y listo.",
  },
  {
    icon: <CheckCircle2 {...ICON_PROPS} />,
    title: "Visita agendada",
    body: "El comprador elige tu propuesta y pide visita. Recién ahí se desbloquea el contacto entre las dos partes.",
  },
];

const CHAT_MESSAGES: ChatMessage[] = [
  {
    from: "them",
    text: "Tenés un comprador activo que busca alquilar en Caballito. Presupuesto: hasta $350.000. Busca: balcón. Contanos qué tenés — precio, m², ambientes y características. Si no tenés nada, respondé \"paso\".",
  },
  { from: "me", text: "Tengo un 2 ambientes en Caballito, 45m², $340.000, con balcón, muy luminoso" },
  { from: "them", text: "¡Gracias! Ya se lo mostramos al comprador." },
  { from: "them", text: "Le interesó y pidió coordinar una visita. ¿Qué días y horarios te quedan bien? Pasame 2 o 3 opciones." },
  { from: "me", text: "Sábado 15hs o domingo 11hs" },
  { from: "them", text: "Buenísimo, se lo paso para que elija 👍" },
];

const PROBLEM = {
  antes: [
    "Pagar destacados y esperar, sin saber si hay compradores reales del otro lado",
    "Responder curiosos que preguntan precio y desaparecen",
    "Stock que lleva meses publicado sin una sola visita",
    "Cargar la misma ficha en tres portales distintos",
  ],
  ahora: [
    "Te llegan compradores activos, ya calificados por zona y presupuesto",
    "Vos elegís qué búsquedas responder — sin obligación",
    "Una vía más para mover el stock que no se estaba moviendo",
    "Todo por el WhatsApp que ya usás, nada nuevo que cargar",
  ],
};

const GAINS = {
  inmobiliaria: [
    "Compradores activos, con presupuesto y forma de pago ya declarados — no clics sueltos.",
    "Una salida más para el stock que lleva tiempo publicado sin movimiento.",
    "Vas a ver, búsqueda por búsqueda, cuánta demanda real hay en tus zonas.",
    "Opera 100% por WhatsApp — sin paneles ni carga de datos obligatoria.",
  ],
  comprador: [
    "Cuenta una vez lo que busca y recibe propuestas que responden a eso.",
    "Compara precio, m² y ambientes de cada propuesta, lado a lado.",
    "Accede a propiedades que quizás nunca vería en los portales.",
    "Su teléfono no circula: se comparte recién al pedir visita.",
  ],
};

const PRICING_CARDS = [
  { title: "Recibir búsquedas", body: "Gratis, siempre. La demanda calificada es el activo — nunca se cobra por aparecer." },
  { title: "Proponer", body: "Gratis, siempre. Cuantas más propuestas mandás, mejor shortlist arma el comprador." },
  {
    title: "Visita agendada",
    body: "Ahí sí se descuenta un crédito — contacto desbloqueado y coordinación. Las primeras 5 son gratis.",
    highlight: true,
  },
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
          <Link href="/" className="font-display text-2xl sm:text-3xl">
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
        <section className="px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <Reveal className="text-center">
              <h2 className="font-display text-2xl text-[var(--tinta)] sm:text-3xl">
                Los portales muestran avisos, no compradores
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-[var(--tinta)]/65">
                Una inmobiliaria con stock clavado paga destacados y espera. Del otro lado, alguien scrollea
                cientos de avisos repetidos y no encuentra con quién hablar. Visitalo conecta esa demanda
                calificada con la oferta que la necesita.
              </p>
            </Reveal>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Reveal>
                <div className="h-full rounded-2xl border border-[var(--tinta)]/10 bg-white p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tinta)]/40">Antes</p>
                  <ul className="mt-3 space-y-2.5">
                    {PROBLEM.antes.map((item) => (
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
                    {PROBLEM.ahora.map((item) => (
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
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--verde-claro)] text-[var(--verde-profundo)]">
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
          <div className="mx-auto max-w-4xl">
            <Reveal className="text-center">
              <h2 className="font-display text-2xl text-[var(--tinta)] sm:text-3xl">Así te llega a vos</h2>
              <p className="mx-auto mt-3 max-w-md text-[var(--tinta)]/60">
                Un ejemplo real de cómo es la conversación, de la ficha a la visita agendada.
              </p>
            </Reveal>
            <Reveal delay={100} className="mt-10">
              <ChatSim messages={CHAT_MESSAGES} />
            </Reveal>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl">
            <Reveal className="text-center">
              <h2 className="font-display text-2xl text-[var(--tinta)] sm:text-3xl">Qué gana cada lado</h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Reveal>
                <div className="h-full rounded-2xl border border-[var(--verde)]/30 bg-[var(--verde-claro)] p-6">
                  <p className="font-medium text-[var(--verde-profundo)]">La inmobiliaria</p>
                  <ul className="mt-3 space-y-2.5">
                    {GAINS.inmobiliaria.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-[var(--verde-profundo)]">
                        <span className="mt-0.5">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="h-full rounded-2xl border border-[var(--tinta)]/10 bg-white p-6">
                  <p className="font-medium text-[var(--tinta)]">El comprador</p>
                  <ul className="mt-3 space-y-2.5">
                    {GAINS.comprador.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-[var(--tinta)]/70">
                        <span className="mt-0.5 text-[var(--verde)]">✓</span>
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
          <div className="mx-auto max-w-4xl">
            <Reveal className="text-center">
              <h2 className="font-display text-2xl text-[var(--tinta)] sm:text-3xl">El modelo, sin letra chica</h2>
            </Reveal>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PRICING_CARDS.map((card, i) => (
                <Reveal key={card.title} delay={i * 100}>
                  <div
                    className={`h-full rounded-2xl border p-6 ${
                      card.highlight
                        ? "border-[var(--ambar)]/40 bg-[var(--ambar)]/10"
                        : "border-[var(--tinta)]/10 bg-white"
                    }`}
                  >
                    <p className="font-medium text-[var(--tinta)]">{card.title}</p>
                    <p className="mt-2 text-sm text-[var(--tinta)]/65">{card.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl text-[var(--tinta)] sm:text-3xl">Por qué ahora</h2>
            <p className="mt-4 text-[var(--tinta)]/65">
              El crédito hipotecario volvió y trae compradores con financiación preaprobada — un lead calificado
              así vale más que un mes de destacados. Arrancamos con un piloto acotado a barrios seleccionados de
              CABA, sin permanencia: sumarte no te compromete a nada.
            </p>
          </Reveal>
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
