export const WEEKDAY_LABEL: Record<string, string> = {
  DOMINGO: "Domingo", SEGUNDA: "Segunda-feira", TERCA: "Terça-feira", QUARTA: "Quarta-feira",
  QUINTA: "Quinta-feira", SEXTA: "Sexta-feira", SABADO: "Sábado",
};

export const FREQUENCY_LABEL: Record<string, string> = {
  SEMANAL: "Semanal", QUINZENAL: "Quinzenal", MENSAL: "Mensal", OUTRA: "Outra frequência",
};

export const STATUS_LABEL: Record<string, { text: string; tone: "green" | "amber" | "red" | "stone" }> = {
  PENDING: { text: "Pendente", tone: "amber" },
  APPROVED: { text: "Aprovado", tone: "green" },
  REJECTED: { text: "Rejeitado", tone: "red" },
  SUSPENDED: { text: "Suspenso", tone: "stone" },
  CANCELED: { text: "Cancelada", tone: "stone" },
};

export const JOIN_STATUS_LABEL: Record<string, { text: string; tone: "green" | "amber" | "red" | "stone" }> = {
  PENDING: { text: "Pendente", tone: "amber" },
  APPROVED: { text: "Aprovada", tone: "green" },
  REJECTED: { text: "Rejeitada", tone: "red" },
  CANCELED: { text: "Cancelada", tone: "stone" },
};

export function formatTime(t: string | null | undefined) {
  return t ? t.slice(0, 5) : "";
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Campo_Grande" }).format(new Date(iso));
}

export function periodOf(t: string): "MANHA" | "TARDE" | "NOITE" {
  const h = Number(t.slice(0, 2));
  return h < 12 ? "MANHA" : h < 18 ? "TARDE" : "NOITE";
}

/** Data de hoje (AAAA-MM-DD) no fuso da igreja. */
export function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Campo_Grande" }).format(new Date());
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Campo_Grande" }).format(new Date(iso));
}

export const REPORT_REASON_LABEL: Record<string, string> = {
  OFENSIVO: "Ofensivo ou desrespeitoso",
  SPAM: "Spam ou propaganda",
  PRIVACIDADE: "Expõe alguém sem consentimento",
  INADEQUADO: "Conteúdo inadequado",
  OUTRO: "Outro motivo",
};

export const REPORT_STATUS_LABEL: Record<string, { text: string; tone: "green" | "amber" | "red" | "stone" }> = {
  OPEN: { text: "Aberta", tone: "amber" },
  RESOLVED: { text: "Conteúdo removido", tone: "red" },
  DISMISSED: { text: "Arquivada", tone: "stone" },
};

export const DATA_REQUEST_KIND_LABEL: Record<string, string> = {
  CORRECTION: "Correção de dados",
  DELETION: "Exclusão de dados",
};

export const DATA_REQUEST_STATUS_LABEL: Record<string, { text: string; tone: "green" | "amber" | "red" | "stone" }> = {
  PENDING: { text: "Em análise", tone: "amber" },
  DONE: { text: "Atendido", tone: "green" },
  REJECTED: { text: "Não atendido", tone: "red" },
};

export const ACCOUNT_STATUS_LABEL: Record<string, { text: string; tone: "green" | "amber" | "red" | "stone" }> = {
  ACTIVE: { text: "Ativa", tone: "green" },
  SUSPENDED: { text: "Suspensa", tone: "red" },
};

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  SOMA_APPROVED: "SOMA aprovado",
  SOMA_REJECTED: "SOMA rejeitado",
  SOMA_SUSPENDED: "SOMA suspenso",
  SOMA_REACTIVATED: "SOMA reativado",
  USER_SUSPENDED: "Conta suspensa",
  USER_REACTIVATED: "Conta reativada",
  USER_ANONYMIZED: "Conta anonimizada (LGPD)",
  CONTENT_REMOVED: "Conteúdo removido",
  REPORT_DISMISSED: "Denúncia arquivada",
  LEADERSHIP_TRANSFERRED: "Liderança transferida",
  DATA_REQUEST_DONE: "Pedido LGPD atendido",
  DATA_REQUEST_REJECTED: "Pedido LGPD não atendido",
};
