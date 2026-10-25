import { appIconResponse } from "@/lib/app-icon";

// Ícone da tela de início do iPhone/iPad.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return appIconResponse(180);
}
