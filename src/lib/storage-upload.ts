import { createClient } from "@/lib/supabase/client";

/**
 * Envio de imagens direto do navegador para o Supabase Storage (sem passar pelo servidor da aplicação,
 * evitando o limite de tamanho de requisição da hospedagem). Tamanho, tipo e permissão também são
 * garantidos pelo próprio bucket e pelas políticas de storage.
 */
export const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function checkImage(file: FormDataEntryValue | null, maxMb: number): string | null {
  if (!(file instanceof File) || file.size === 0) return "Selecione uma imagem.";
  if (!IMAGE_TYPES[file.type]) return `"${file.name}" não é uma imagem JPG, PNG ou WebP.`;
  if (file.size > maxMb * 1024 * 1024) return `"${file.name}" passa de ${maxMb} MB.`;
  return null;
}

/** Envia o arquivo para `{folder}/{uuid}.{ext}` e devolve o caminho dentro do bucket (ou null em caso de falha). */
export async function uploadImage(bucket: string, folder: string, file: File): Promise<string | null> {
  const path = `${folder}/${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;
  const { error } = await createClient().storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  return error ? null : path;
}

export async function removeImages(bucket: string, paths: string[]) {
  if (paths.length) await createClient().storage.from(bucket).remove(paths);
}
