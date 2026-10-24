/** Traduz erros levantados pelas funções do banco (mensagens já em pt-BR). */
export function dbMessage(error: { message: string } | null, fallback: string) {
  if (!error) return fallback;
  // Mensagens das RPCs começam sem código técnico; erros do Postgres/PostgREST são genéricos.
  return /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(error.message) && !error.message.includes("violates") && !error.message.includes("function")
    ? error.message
    : fallback;
}

/** Aceita apenas caminhos internos (evita redirecionamento aberto). */
export function safePath(value: FormDataEntryValue | null, fallback: string, prefix = "/") {
  const v = typeof value === "string" ? value : "";
  return v.startsWith(prefix) && !v.startsWith("//") ? v : fallback;
}

/** Acrescenta parâmetros a um caminho que pode já ter query string. */
export function withParams(path: string, params: Record<string, string>) {
  const [base, qs = ""] = path.split("?");
  const u = new URLSearchParams(qs);
  Object.entries(params).forEach(([k, v]) => u.set(k, v));
  return `${base}?${u}`;
}
