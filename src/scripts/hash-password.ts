import { hashPassword } from "@/lib/auth/password";

/**
 * Genera el valor para ADMIN_PASSWORD_HASH.
 * Uso: npm run admin:hash-password -- "tu-contraseña"
 */
async function main() {
  const plain = process.argv[2];
  if (!plain) {
    console.error('Uso: npm run admin:hash-password -- "tu-contraseña"');
    process.exit(1);
  }

  const hash = await hashPassword(plain);
  console.log(hash);
}

main();
