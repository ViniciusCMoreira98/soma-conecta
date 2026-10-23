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
