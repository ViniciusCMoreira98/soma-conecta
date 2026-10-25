import { appIconResponse } from "@/lib/app-icon";

// Favicon da aba do navegador.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return appIconResponse(64);
}
