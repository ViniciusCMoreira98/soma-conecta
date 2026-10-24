"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import type { ActionState } from "@/lib/validation/schemas";

type FormState = ActionState & { values?: Record<string, string> };

/**
 * useActionState que preserva o que foi digitado quando a ação falha.
 * O React 19 limpa o formulário após cada envio; usando `values` como defaultValue,
 * os campos voltam com o conteúdo do usuário. Em caso de sucesso, o formulário é limpo normalmente.
 */
export function useFormAction(fn: (prev: ActionState, form: FormData) => Promise<ActionState>) {
  return useActionState<FormState, FormData>(async (prev, form) => {
    const result = await fn(prev, form);
    if (result.ok) return result;
    const values: Record<string, string> = {};
    form.forEach((v, k) => { if (typeof v === "string" && !k.startsWith("$ACTION")) values[k] = v; });
    return { ...result, values };
  }, {});
}

export function SubmitButton({
  children, pendingText = "Enviando…", variant = "primary", className = "",
}: { children: ReactNode; pendingText?: string; variant?: "primary" | "secondary" | "danger"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn-${variant} ${className}`}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {pending ? pendingText : children}
    </button>
  );
}

export function Field({
  label, name, error, hint, children,
}: { label: string; name: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {error && <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

export function Alert({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: ReactNode }) {
  const styles = {
    info: "border-soma-200 bg-soma-50 text-soma-900",
    success: "border-soma-300 bg-soma-100 text-soma-900",
    error: "border-red-200 bg-red-50 text-red-800",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

export function StatusBadge({ text, tone }: { text: string; tone: "green" | "amber" | "red" | "stone" }) {
  const styles = {
    green: "bg-soma-100 text-soma-800",
    amber: "bg-amber-100 text-amber-900",
    red: "bg-red-100 text-red-800",
    stone: "bg-stone-200 text-stone-700",
  }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles}`}>{text}</span>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card text-center">
      <p className="font-semibold text-stone-800">{title}</p>
      {children && <div className="mt-2 text-sm text-stone-600">{children}</div>}
    </div>
  );
}

/** Pede confirmação antes de enviar o formulário (ex.: exclusões e decisões). */
export function ConfirmForm({
  action, message, children,
}: { action: (formData: FormData) => void | Promise<void>; message: string; children: ReactNode }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}

/** Imagem usada quando o usuário não enviou foto de perfil. */
export const DEFAULT_AVATAR = "/avatar-padrao.jpg";

/** Foto de perfil, com a imagem padrão como alternativa. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Avatar({ name, url, size = 40 }: { name?: string | null; url?: string | null; size?: number }) {
  return (
    <span className="inline-flex shrink-0 overflow-hidden rounded-full bg-soma-100" style={{ width: size, height: size }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url || DEFAULT_AVATAR} alt="" className="h-full w-full object-cover" loading="lazy" onError={avatarFallback} />
    </span>
  );
}

/** Se a foto não carregar (arquivo removido, link inválido), mostra a imagem padrão. */
export function avatarFallback(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (!img.src.endsWith(DEFAULT_AVATAR)) img.src = DEFAULT_AVATAR;
}
