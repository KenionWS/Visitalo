import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está definida. Copiá .env.example a .env y completala.");
}

const client = postgres(process.env.DATABASE_URL, { max: 10 });

export const db = drizzle(client, { schema });
