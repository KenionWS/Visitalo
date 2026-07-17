# Visitalo

Marketplace inverso de compra de propiedades por WhatsApp. Ver el spec de
arquitectura completo en la conversación de arranque del proyecto (o pedíselo
a quien te pasó este repo) para el contexto de producto, modelo de datos y
fases.

Este README cubre el setup de **Fase 1** (esqueleto, infra local, webhook con
dedupe, jobs) y **Fase 2** (flujo comprador: máquina de estados, extracción de
ficha con LLM, shortlist web). Todavía no hay admin ni flujo de inmobiliaria
(alta, ingesta de propuestas, relay) — eso son Fase 3 y Fase 4.

## Requisitos

- Node.js 20+ y npm (ya instalados si estás viendo esto).
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — para
  levantar Postgres, MinIO y Adminer en local con `docker-compose.yml`. Sin
  Docker no vas a poder correr la base de datos local.
- No hace falta cuenta de WhatsApp Business API. El webhook y el envío de
  mensajes funcionan en modo simulado (loguean en consola) sin esas
  credenciales — ver más abajo.
- **Para Fase 2 sí hace falta una `ANTHROPIC_API_KEY` real** (ver
  `.env.example`) — es la que extrae la ficha de búsqueda del texto libre del
  comprador. Sin ella, la conversación arranca igual (se crea el comprador y
  la búsqueda draft) pero cada mensaje devuelve un aviso de error en vez de
  avanzar la calificación — es el comportamiento esperado, no un bug.

## 1. Variables de entorno

```bash
cp .env.example .env
```

Completá cada valor siguiendo las instrucciones que están comentadas en
`.env.example` (comandos `openssl rand -hex N` para generar contraseñas y
tokens, y dónde conseguir la API key de Anthropic). El bloque de WhatsApp se
puede dejar vacío — nada de lo que hay hasta ahora lo requiere para funcionar
en local.

## 2. Levantar la infraestructura (Postgres, MinIO, Adminer)

```bash
docker compose up -d
```

Esto levanta:

- **Postgres 16** en `localhost:5433` (usuario/base `visitalo`, password la
  que pusiste en `DB_PASSWORD`). Se mapeó a `5433` en vez de `5432` para no
  chocar con un Postgres nativo de Windows si lo tenés instalado (servicio
  `postgresql-x64-18` u otro) — en el VPS de producción se puede volver a
  `5432:5432`.
- **MinIO** en `localhost:9000` (API) y `localhost:9001` (consola web).
- **Adminer** en `localhost:8081` (equivalente a phpMyAdmin, para Postgres) —
  se mapeó a `8081` en vez de `8080` para no chocar con otros servicios
  locales; en el VPS de producción se puede volver a `8080:8080`.

Para entrar a Adminer: sistema `PostgreSQL`, servidor `db`, usuario
`visitalo`, contraseña la de `DB_PASSWORD`, base `visitalo`.

## 3. Instalar dependencias y migrar la base

```bash
npm install
npm run db:generate   # genera el SQL de migración a partir de src/db/schema.ts
npm run db:migrate    # lo aplica contra DATABASE_URL
```

`npm run db:studio` abre [Drizzle Studio](https://orm.drizzle.team/drizzle-studio/overview)
si querés explorar las tablas con una UI en vez de Adminer.

## 4. Levantar la app

```bash
npm run dev
```

Abre en `http://localhost:3000`.

## 5. Probar la shortlist web (sin pasar por WhatsApp)

La forma más rápida de ver algo andando es sembrar datos de prueba y abrir la
shortlist en el navegador:

```bash
npm run seed:shortlist
```

Esto crea un comprador, una inmobiliaria, una búsqueda **activa** con dos
propuestas publicadas, e imprime la URL (`http://localhost:3000/s/<token>`).
Abrila y probá favorito, descartar (con motivo) y pedir visita — cada acción
persiste en `proposal_events` / `visits` y la página se re-renderiza sola.

## 6. Probar el flujo de comprador por WhatsApp sin cuenta de Meta

El webhook (`src/app/api/whatsapp/webhook/route.ts`) se prueba pegándole
directo con `curl`, simulando lo que mandaría Meta. Un mensaje de texto de un
número que no está dado de alta como inmobiliaria dispara la máquina de
estados del comprador (`src/lib/conversation.ts`).

**a) Verificación (handshake que hace Meta al configurar el webhook):**

```bash
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TU_WHATSAPP_VERIFY_TOKEN&hub.challenge=12345"
```

Tiene que devolver `12345` si el token coincide con `WHATSAPP_VERIFY_TOKEN`
de tu `.env`.

**b) Mensaje entrante de un comprador:**

```bash
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "0",
      "changes": [{
        "field": "messages",
        "value": {
          "messaging_product": "whatsapp",
          "metadata": { "display_phone_number": "5491100000000", "phone_number_id": "0" },
          "contacts": [{ "profile": { "name": "Test" }, "wa_id": "5491122334455" }],
          "messages": [{
            "from": "5491122334455",
            "id": "wamid.TEST123",
            "timestamp": "1710000000",
            "type": "text",
            "text": { "body": "Hola, busco un depto en Palermo, presupuesto 150 mil dolares, pago contado" }
          }]
        }
      }]
    }]
  }'
```

Esto inserta la fila en `wa_messages` (dedupeada por `wamid`) y encola un job
`conversation.buyer_message`. Procesalo con:

```bash
npm run jobs:run
```

Con `ANTHROPIC_API_KEY` configurada, vas a ver en consola (modo simulado, sin
`WHATSAPP_TOKEN`) la siguiente pregunta de la calificación o, si ya con ese
mensaje alcanzó los datos mínimos (zona, presupuesto, forma de pago), el
resumen de la ficha pidiendo confirmación. Respondé "sí" con otro `curl` +
`npm run jobs:run` para activar la búsqueda y recibir el link a la shortlist.

Sin `ANTHROPIC_API_KEY`, vas a ver el aviso de error de extracción — es el
modo seguro, no rompe nada, simplemente no puede calificar.

Para inspeccionar el estado en cualquier momento:

```bash
docker compose exec db psql -U visitalo -d visitalo -c "select phone, state, context from conversations;"
docker compose exec db psql -U visitalo -d visitalo -c "select buyer_id, status, zones, budget_usd_max, payment_method from searches;"
docker compose exec db psql -U visitalo -d visitalo -c "select type, status, attempts, run_at from jobs order by created_at desc limit 5;"
```

## 7. Procesar jobs en producción (sin QStash todavía)

En producción esto lo dispara Vercel Cron o Upstash QStash pegándole a
`/api/jobs/run` con el header `Authorization: Bearer $CRON_SECRET`:

```bash
curl -X POST http://localhost:3000/api/jobs/run \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

## Estructura

```
src/
  app/
    api/
      whatsapp/webhook/route.ts   # GET verificación, POST recepción + dedupe + despacho
      jobs/run/route.ts           # dispara el procesamiento de jobs pendientes
    s/[token]/
      page.tsx                    # shortlist pública (server component)
      actions.ts                  # server actions: favorito / descartar / pedir visita
      DiscardButton.tsx           # modal de descarte con motivo (client component)
  db/
    schema.ts                     # modelo de datos completo (Drizzle)
    index.ts                      # cliente de Postgres
    migrate.ts                    # aplica migraciones (npm run db:migrate)
    migrations/                   # SQL generado por drizzle-kit
  lib/
    whatsapp.ts                   # sendText / sendTemplate (Graph API, con modo simulado)
    jobs.ts                       # enqueueJob / processJobs con reintentos y backoff
    llm.ts                        # extractSearchFields (Anthropic, structured output)
    conversation.ts               # máquina de estados del comprador (NEW→QUALIFYING→CONFIRMING→ACTIVE)
  scripts/
    run-jobs.ts                   # CLI para procesar jobs a mano (npm run jobs:run)
    seed-shortlist.ts             # CLI para sembrar datos de prueba (npm run seed:shortlist)
prompts/
  search-extraction.ts            # prompt versionado de extracción de ficha
docker-compose.yml                # Postgres + MinIO + Adminer + backup diario
```

## Próximas fases

Ver el spec completo para el detalle de Fase 3 (flujo inmobiliaria +
normalización LLM), Fase 4 (relay/visitas/créditos) y Fase 5 (hardening
pre-piloto).
