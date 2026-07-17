import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida. Copiá .env.example a .env y completala.");
}

// prepare: false es necesario para conectar a través del pooler de Neon
// (PgBouncer en modo transacción) — los prepared statements de postgres.js
// no son compatibles con ese modo y rompen las queries en producción.
const client = postgres(process.env.DATABASE_URL, { max: 10, prepare: false });

export const db = drizzle(client, { schema });
