# Visitalo

Marketplace inverso de compra de propiedades por WhatsApp. Ver el spec de
arquitectura completo en la conversación de arranque del proyecto (o pedíselo
a quien te pasó este repo) para el contexto de producto, modelo de datos y
fases.

Este README cubre el setup de **Fase 1** (esqueleto, infra local, webhook con
dedupe, jobs), **Fase 2** (flujo comprador: máquina de estados, extracción de
ficha con LLM, shortlist web) y **Fase 3** (admin, alta de inmobiliarias,
distribución de fichas por zona, ingesta y normalización de propuestas con
LLM, cola de aprobación). Todavía no hay relay de preguntas, visitas ni
créditos — eso es Fase 4. Las propuestas de inmobiliarias solo se procesan
como **texto** por ahora: si llega un audio se le pide a la inmobiliaria que
lo reescriba (no hay transcripción tipo Whisper todavía), y las fotos no se
bajan ni se suben a MinIO (la propuesta se normaliza igual, sin fotos).

## Requisitos

- Node.js 20+ y npm (ya instalados si estás viendo esto).
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — para
  levantar Postgres, MinIO y Adminer en local con `docker-compose.yml`. Sin
  Docker no vas a poder correr la base de datos local.
- No hace falta cuenta de WhatsApp Business API. El webhook y el envío de
  mensajes funcionan en modo simulado (loguean en consola) sin esas
  credenciales — ver más abajo.
- **Hace falta una `ANTHROPIC_API_KEY` real** (ver `.env.example`) para que
  la calificación del comprador y la normalización de propuestas de
  inmobiliarias funcionen de verdad. Sin ella, todo el resto anda igual
  (webhook, jobs, admin, shortlist) pero esos dos pasos devuelven un aviso de
  error en vez de procesar — es el comportamiento esperado, no un bug.
- **Hace falta generar credenciales de admin** (`ADMIN_EMAIL`,
  `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`) para entrar a `/admin` — ver el
  paso 4.

## 1. Variables de entorno

```bash
cp .env.example .env
```

Completá cada valor siguiendo las instrucciones que están comentadas en
`.env.example` (comandos `openssl rand -hex N` / `openssl rand -base64 32`
para generar secretos, y dónde conseguir la API key de Anthropic). El bloque
de WhatsApp se puede dejar vacío — nada de lo que hay hasta ahora lo requiere
para funcionar en local.

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

## 4. Generar tus credenciales de admin

```bash
npm run admin:hash-password -- "tu-contraseña"
```

Copiá la salida (formato `salt:hash`) a `ADMIN_PASSWORD_HASH` en tu `.env`, y
completá `ADMIN_EMAIL` con el email que vas a usar para entrar en
`/admin/login`. `SESSION_SECRET` ya viene generado si copiaste `.env.example`
siguiendo sus instrucciones.

## 5. Levantar la app

```bash
npm run dev
```

Abre en `http://localhost:3000`. El admin está en `http://localhost:3000/admin`.

## 6. Probar la shortlist web (sin pasar por WhatsApp)

La forma más rápida de ver algo andando es sembrar datos de prueba y abrir la
shortlist en el navegador:

```bash
npm run seed:shortlist
```

Esto crea un comprador, una inmobiliaria, una búsqueda **activa** con dos
propuestas publicadas, e imprime la URL (`http://localhost:3000/s/<token>`).
Abrila y probá favorito, descartar (con motivo) y pedir visita — cada acción
persiste en `proposal_events` / `visits` y la página se re-renderiza sola.

## 7. Probar el flujo de comprador por WhatsApp sin cuenta de Meta

El webhook (`src/app/api/whatsapp/webhook/route.ts`) se prueba pegándole
directo con `curl`, simulando lo que mandaría Meta. Un mensaje de texto de un
número que **no** está dado de alta como inmobiliaria dispara la máquina de
estados del comprador (`src/lib/conversation.ts`); si el número sí está dado
de alta como inmobiliaria, dispara el flujo de propuestas (`src/lib/agency-conversation.ts`).

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

Procesalo con `npm run jobs:run`. Con `ANTHROPIC_API_KEY` configurada vas a
ver la siguiente pregunta de calificación o, si ya alcanzó los datos mínimos
(zona, presupuesto, forma de pago), el resumen pidiendo confirmación.
Respondé "sí" con otro `curl` (mismo `wa_id`, mensaje `"Sí, confirmo"`) +
`npm run jobs:run` para activar la búsqueda — esto también encola la
distribución a las inmobiliarias que matcheen zona (ver paso 8).

Para inspeccionar el estado en cualquier momento:

```bash
docker compose exec db psql -U visitalo -d visitalo -c "select phone, actor_type, state, context from conversations;"
docker compose exec db psql -U visitalo -d visitalo -c "select buyer_id, status, zones, budget_usd_max, payment_method from searches;"
docker compose exec db psql -U visitalo -d visitalo -c "select type, status, attempts, run_at from jobs order by created_at desc limit 5;"
```

## 8. Probar el flujo de inmobiliaria (alta → distribución → propuesta → aprobación)

1. Entrá a `/admin`, logueate, y en **Inmobiliarias** dá de alta una con una
   zona que pise la de tu búsqueda de prueba (ej. `Palermo`).
2. Activá una búsqueda de comprador en esa misma zona (paso 7). Al confirmar,
   se encola `distribution.dispatch` → `distribution.notify_agency`. Corré
   `npm run jobs:run` dos o tres veces seguidas (cada job puede encolar el
   siguiente) hasta que veas en consola el mensaje simulado con la ficha
   anónima yendo al teléfono de la inmobiliaria.
3. Simulá la respuesta de la inmobiliaria con un `curl` al webhook igual que
   en el paso 7, pero con `"wa_id"` y `"from"` iguales al teléfono de la
   inmobiliaria, y el texto describiendo una propiedad (podés incluir a
   propósito un teléfono/email/dirección exacta para comprobar que el filtro
   de PII los saca). Si escribe "paso", el flujo termina sin crear propuesta.
4. `npm run jobs:run` — normaliza el mensaje con LLM y crea la propuesta en
   `pending_review`.
5. En `/admin/proposals` vas a ver el mensaje original al lado de la ficha
   normalizada (editable). Ajustá lo que haga falta y tocá **Publicar**.
6. `npm run jobs:run` — le avisa al comprador que tiene una propuesta nueva.
7. Abrí su shortlist (el link que mandó el bot al confirmar la búsqueda) y
   confirmá que la propuesta aparece con la zona aproximada, sin ningún dato
   de contacto de la inmobiliaria.

## 9. Procesar jobs en producción (sin QStash todavía)

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
    admin/
      login/                       # login (fuera del route group protegido)
      (protected)/                 # layout con verifySession() — todo lo de acá pide login
        page.tsx                   # dashboard
        agencies/                  # alta/edición de inmobiliarias
        proposals/                 # cola de pending_review
    api/
      whatsapp/webhook/route.ts    # GET verificación, POST recepción + dedupe + despacho
      jobs/run/route.ts            # dispara el procesamiento de jobs pendientes
    s/[token]/
      page.tsx                     # shortlist pública (server component)
      actions.ts                   # server actions: favorito / descartar / pedir visita
      DiscardButton.tsx            # modal de descarte con motivo (client component)
  db/
    schema.ts                      # modelo de datos completo (Drizzle)
    index.ts                       # cliente de Postgres
    migrate.ts                     # aplica migraciones (npm run db:migrate)
    migrations/                    # SQL generado por drizzle-kit
  lib/
    auth/                          # sesión de admin: password.ts, session.ts (jose), dal.ts
    whatsapp.ts                    # sendText / sendTemplate (Graph API, con modo simulado)
    queue.ts                       # enqueueJob / processJobs / registerJobHandler
    job-handlers.ts                # registra todos los handlers (se importa por su efecto secundario)
    llm.ts                         # extractSearchFields / normalizeProposal (Anthropic, structured output)
    conversation.ts                # máquina de estados del comprador (NEW→QUALIFYING→CONFIRMING→ACTIVE)
    agency-conversation.ts         # flujo de inmobiliaria: notificación de ficha + ingesta de propuesta
    distribution.ts                # matchea búsqueda↔inmobiliarias por zona
    matching.ts                    # fórmula simple de match score (zona + presupuesto + must-haves)
    text.ts                        # normalizeWords (sí/no, paso, etc.)
  scripts/
    run-jobs.ts                    # CLI para procesar jobs a mano (npm run jobs:run)
    seed-shortlist.ts              # CLI para sembrar datos de prueba (npm run seed:shortlist)
    hash-password.ts               # CLI para generar ADMIN_PASSWORD_HASH
prompts/
  search-extraction.ts             # prompt versionado de extracción de ficha del comprador
  proposal-normalization.ts        # prompt versionado de normalización de propuestas (con filtro de PII)
docker-compose.yml                 # Postgres + MinIO + Adminer + backup diario
```

## Decisiones de Fase 3

- **Auth del admin sin Auth.js/NextAuth**: el spec original sugería Auth.js,
  pero se optó por el patrón oficial más liviano de Next.js (sesión firmada
  con `jose` en una cookie httpOnly + un Data Access Layer que verifica la
  sesión) — un solo usuario operador no justifica la dependencia extra, y
  evita cualquier fricción de compatibilidad con las APIs nuevas de Next 16.
- **Sin audio ni fotos todavía**: decisión explícita para no sumar un
  proveedor de transcripción (Whisper de OpenAI u otro — Anthropic no ofrece
  speech-to-text) ni la integración con MinIO en esta pasada. Se puede sumar
  después como un módulo aislado sin tocar el resto.

## Próximas fases

Ver el spec completo para el detalle de Fase 4 (relay de preguntas,
visitas y créditos) y Fase 5 (hardening pre-piloto).
