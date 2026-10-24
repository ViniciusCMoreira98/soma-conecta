const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/**
 * O arquivo é enviado pelo navegador direto ao Storage (ver lib/storage-upload); no servidor só conferimos
 * que o caminho recebido é um arquivo dentro da pasta esperada, no formato gerado pelo app.
 */
export function isUploadedImagePath(path: unknown, folder: string): path is string {
  return typeof path === "string" && new RegExp(`^${folder}/${UUID}\\.(jpg|png|webp)$`).test(path);
}
