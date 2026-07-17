# Visitalo

Marketplace inverso de compra de propiedades por WhatsApp. Ver el spec de
arquitectura completo en la conversación de arranque del proyecto (o pedíselo
a quien te pasó este repo) para el contexto de producto, modelo de datos y
fases.

Este README cubre únicamente el setup de **Fase 1**: esqueleto de la app,
infraestructura local (Postgres/MinIO/Adminer), webhook de WhatsApp con
dedupe y eco de prueba, y el sistema de jobs con reintentos. Todavía no hay
LLM, admin, ni flujo de comprador/inmobiliaria — eso son fases siguientes.

## Requisitos

- Node.js 20+ y npm (ya instalados si estás viendo esto).
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — para
  levantar Postgres, MinIO y Adminer en local con `docker-compose.yml`. Sin
  Docker no vas a poder correr la base de datos local.
- No hace falta cuenta de WhatsApp Business API todavía. El webhook y el
  envío de mensajes funcionan en modo simulado (loguean en consola) sin esas
  credenciales — ver más abajo.

## 1. Variables de entorno

```bash
cp .env.example .env
```

Completá cada valor siguiendo las instrucciones que están comentadas en
`.env.example` (comandos `openssl rand -hex N` para generar contraseñas y
tokens, y dónde conseguir la API key de Anthropic cuando la necesites). Los
bloques de WhatsApp y Anthropic se pueden dejar vacíos por ahora — nada de
Fase 1 los requiere para funcionar en local.

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

## 5. Probar el webhook de WhatsApp sin cuenta de Meta

El endpoint es `src/app/api/whatsapp/webhook/route.ts`. Como no hay
credenciales de Meta todavía, se prueba pegándole directo con `curl`,
simulando lo que mandaría Meta.

**a) Verificación (handshake que hace Meta al configurar el webhook):**

```bash
curl "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=TU_WHATSAPP_VERIFY_TOKEN&hub.challenge=12345"
```

Tiene que devolver `12345` (el valor de `hub.challenge`) si el token
coincide con `WHATSAPP_VERIFY_TOKEN` de tu `.env`.

**b) Mensaje entrante (dispara el eco de prueba):**

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
            "text": { "body": "Hola, busco un depto en Palermo" }
          }]
        }
      }]
    }]
  }'
```

Esto debería:

1. Insertar una fila en `wa_messages` (dedupeada por `wamid` — si repetís el
   mismo `curl`, la segunda vez no hace nada nuevo).
2. Encolar un job `whatsapp.echo_reply` en la tabla `jobs`.

Revisalo en Adminer/Drizzle Studio, o con:

```bash
docker compose exec db psql -U visitalo -d visitalo -c "select wamid, phone, direction, type from wa_messages order by created_at desc limit 5;"
docker compose exec db psql -U visitalo -d visitalo -c "select type, status, attempts, run_at from jobs order by created_at desc limit 5;"
```

## 6. Procesar jobs (sin QStash todavía)

En producción esto lo dispara Vercel Cron o Upstash QStash pegándole a
`/api/jobs/run` con el header `Authorization: Bearer $CRON_SECRET`. En local
podés disparar un ciclo de procesamiento a mano:

```bash
npm run jobs:run
```

o vía HTTP con la app corriendo:

```bash
curl -X POST http://localhost:3000/api/jobs/run \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

Como no configuraste `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`, el job
`whatsapp.echo_reply` no llama a la Graph API real: loguea en la consola del
server el mensaje que hubiese mandado y lo marca `done`. Cuando des de alta
la cuenta de WhatsApp Business API, completá esas dos variables y el mismo
código empieza a mandar mensajes reales sin cambios.

## Estructura

```
src/
  app/
    api/
      whatsapp/webhook/route.ts   # GET verificación, POST recepción + dedupe
      jobs/run/route.ts           # dispara el procesamiento de jobs pendientes
  db/
    schema.ts                     # modelo de datos completo (Drizzle)
    index.ts                      # cliente de Postgres
    migrate.ts                    # aplica migraciones (npm run db:migrate)
    migrations/                   # SQL generado por drizzle-kit
  lib/
    whatsapp.ts                   # sendText / sendTemplate (Graph API, con modo simulado)
    jobs.ts                       # enqueueJob / processJobs con reintentos y backoff
  scripts/
    run-jobs.ts                   # CLI para procesar jobs a mano (npm run jobs:run)
docker-compose.yml                # Postgres + MinIO + Adminer + backup diario
```

## Próximas fases

Ver el spec completo para el detalle de Fase 2 (flujo comprador + shortlist),
Fase 3 (flujo inmobiliaria + normalización LLM), Fase 4 (relay/visitas/créditos)
y Fase 5 (hardening pre-piloto).
