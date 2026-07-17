import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está definida. Copiá .env.example a .env y completala.");
  }

  const client = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(client);

  console.log("Aplicando migraciones...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migraciones aplicadas.");

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
