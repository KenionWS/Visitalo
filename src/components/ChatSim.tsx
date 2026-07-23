"use client";

import { useEffect, useRef, useState } from "react";
import { VisitaloIso } from "./VisitaloIso";

export type ChatMessage = { from: "me" | "them"; text: string };

/** Mockup de una conversación de WhatsApp — los mensajes van "llegando" de a uno cuando el bloque entra en el viewport. */
export function ChatSim({ messages, contactName = "Visitalo" }: { messages: ChatMessage[]; contactName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        messages.forEach((_, i) => {
          setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), i * 650);
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [messages]);

  return (
    <div
      ref={ref}
      className="mx-auto w-full max-w-sm overflow-hidden rounded-[1.75rem] border border-[var(--tinta)]/10 bg-white shadow-xl"
    >
      <div className="flex items-center gap-3 bg-[var(--verde-profundo)] px-4 py-3 text-white">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--papel)]">
          <VisitaloIso className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">{contactName}</p>
          <p className="text-xs text-white/60">en línea</p>
        </div>
      </div>
      <div className="flex min-h-[340px] flex-col gap-2 p-4" style={{ backgroundColor: "#ECE5DD" }}>
        {messages.slice(0, visibleCount).map((m, i) => (
          <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-snug text-[#111] shadow-sm ${
                m.from === "me" ? "rounded-tr-sm" : "rounded-tl-sm bg-white"
              }`}
              style={m.from === "me" ? { backgroundColor: "#DCF8C6" } : undefined}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
