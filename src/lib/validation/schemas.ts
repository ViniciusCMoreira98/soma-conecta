import { z } from "zod";

/** Remove máscara do telefone e valida celular brasileiro (DDD + 9 dígitos), com ou sem +55. */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
  return digits;
}

export const profileSchema = z.object({
  full_name: z
    .string({ required_error: "Informe seu nome completo." })
    .trim()
    .min(5, "Informe nome e sobrenome.")
    .max(120, "Nome muito longo.")
    .refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome."),
  age: z.coerce
    .number({ invalid_type_error: "Informe sua idade em anos." })
    .int("A idade deve ser um número inteiro.")
    .min(5, "Idade inválida.")
    .max(120, "Idade inválida."),
  phone: z
    .string({ required_error: "Informe seu celular." })
    .transform(normalizePhone)
    .refine((v) => /^[1-9]{2}9[0-9]{8}$/.test(v), "Celular inválido. Use DDD + 9 dígitos, ex.: (67) 99999-9999."),
  has_bases: z.enum(["SIM", "NAO"], { required_error: "Escolha SIM ou NÃO." }),
});

export const signUpSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .regex(/[A-Za-z]/, "Inclua pelo menos uma letra.")
    .regex(/[0-9]/, "Inclua pelo menos um número."),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  password: z.string().min(1, "Informe sua senha."),
});

export const WEEKDAYS = ["DOMINGO", "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO"] as const;
export const FREQUENCIES = ["SEMANAL", "QUINZENAL", "MENSAL", "OUTRA"] as const;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido.");

export const somaSchema = z
  .object({
    name: z.string().trim().min(3, "O nome deve ter ao menos 3 caracteres.").max(80, "Nome muito longo."),
    description: z.string().trim().min(10, "Descreva o SOMA em pelo menos 10 caracteres.").max(1000, "Descrição muito longa."),
    neighborhood: z.string().trim().min(2, "Informe o bairro.").max(80),
    location_hint: z.string().trim().max(200, "Máximo de 200 caracteres.").optional().or(z.literal("")),
    weekday: z.enum(WEEKDAYS, { required_error: "Escolha o dia da semana." }),
    start_time: time,
    end_time: time.optional().or(z.literal("")),
    frequency: z.enum(FREQUENCIES),
    extra_info: z.string().trim().max(1000, "Máximo de 1000 caracteres.").optional().or(z.literal("")),
  })
  .refine((v) => !v.end_time || v.end_time > v.start_time, {
    path: ["end_time"],
    message: "O término deve ser depois do início.",
  });

export const rejectionSchema = z.object({
  reason: z.string().trim().min(5, "Explique o motivo (mín. 5 caracteres).").max(500),
});

export type ActionState = { ok?: boolean; message?: string; errors?: Record<string, string> };

export function zodErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
