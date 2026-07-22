import { put } from "@vercel/blob";

/**
 * Punto único de storage de medios (fotos de propuestas). Hoy implementado
 * con Vercel Blob por ser lo más rápido de habilitar en este stack, pero el
 * resto del código (whatsapp.ts, agency-conversation.ts) solo conoce esta
 * función — si el día de mañana se migra a MinIO/S3 (docker-compose.yml ya
 * tiene MinIO para dev local), alcanza con reescribir el cuerpo de
 * uploadMedia() con un cliente S3 apuntando al endpoint de MinIO; nada más
 * en el resto del código tiene que cambiar.
 */
export async function uploadMedia(buffer: Buffer, contentType: string, pathname: string): Promise<string> {
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}
