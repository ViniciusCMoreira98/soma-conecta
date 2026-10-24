"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

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

/** Foto de perfil com a inicial do nome como alternativa. */
export function Avatar({ name, url, size = 40 }: { name?: string | null; url?: string | null; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-soma-100 font-bold text-soma-800"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        (name ?? "?").trim().charAt(0).toUpperCase() || "?"
      )}
    </span>
  );
}
