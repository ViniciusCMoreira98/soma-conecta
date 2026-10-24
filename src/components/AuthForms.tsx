"use client";

import Link from "next/link";
import {
  requestPasswordReset, saveProfile, signInWithGoogle, signInWithPassword,
  signUpWithPassword, updatePassword,
} from "@/app/actions/auth";
import { Alert, Field, SubmitButton, useFormAction } from "@/components/ui";


export function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next ?? "/encontrar"} />
      <SubmitButton variant="secondary" pendingText="Redirecionando…" className="w-full">
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.8V6.5H1.4a12 12 0 0 0 0 11l4-3.1z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
        </svg>
        Continuar com Google
      </SubmitButton>
    </form>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useFormAction(signInWithPassword);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="E-mail" name="email" error={state.errors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} required className="input" />
      </Field>
      <Field label="Senha" name="password" error={state.errors?.password}>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </Field>
      <div className="text-right text-sm">
        <Link href="/esqueci-senha" className="font-medium text-soma-700 underline">Esqueci minha senha</Link>
      </div>
      <SubmitButton pendingText="Entrando…" className="w-full">Entrar</SubmitButton>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useFormAction(signUpWithPassword);
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="E-mail" name="email" error={state.errors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.values?.email} required className="input" />
      </Field>
      <Field label="Senha" name="password" error={state.errors?.password} hint="Mínimo de 8 caracteres, com letras e números.">
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="input" />
      </Field>
      <SubmitButton pendingText="Criando conta…" className="w-full">Criar conta</SubmitButton>
      <p className="text-xs text-stone-500">
        Ao criar a conta você concorda com o uso dos seus dados para a gestão dos SOMAS. Veja a{" "}
        <Link href="/privacidade" className="underline">política de privacidade</Link>.
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useFormAction(requestPasswordReset);
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="E-mail da sua conta" name="email" error={state.errors?.email}>
        <input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} required className="input" />
      </Field>
      <SubmitButton pendingText="Enviando…" className="w-full">Enviar link de redefinição</SubmitButton>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useFormAction(updatePassword);
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <Field label="Nova senha" name="password" error={state.errors?.password} hint="Mínimo de 8 caracteres, com letras e números.">
        <input id="password" name="password" type="password" autoComplete="new-password" required className="input" />
      </Field>
      <SubmitButton pendingText="Salvando…" className="w-full">Salvar nova senha</SubmitButton>
    </form>
  );
}

export function ProfileForm({
  defaults, onboarding, next,
}: {
  defaults: { full_name: string; age: string; phone: string; has_bases: "" | "SIM" | "NAO" };
  onboarding?: boolean;
  next?: string;
}) {
  const [state, action] = useFormAction(saveProfile);
  const v = state.values;
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      {onboarding && <input type="hidden" name="onboarding" value="1" />}
      <input type="hidden" name="next" value={next ?? "/encontrar"} />
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}

      <Field label="Nome completo" name="full_name" error={e.full_name} hint="Usado para identificar você no seu SOMA.">
        <input id="full_name" name="full_name" defaultValue={v?.full_name ?? defaults.full_name} autoComplete="name" required className="input" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Idade (em anos)" name="age" error={e.age} hint="Ajuda o responsável a conhecer o perfil do grupo.">
          <input id="age" name="age" type="number" inputMode="numeric" min={5} max={120} defaultValue={v?.age ?? defaults.age} required className="input" />
        </Field>
        <Field label="Celular com DDD" name="phone" error={e.phone} hint="Visível apenas ao responsável do SOMA em que você entrar.">
          <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(67) 99999-9999" defaultValue={v?.phone ?? defaults.phone} required className="input" />
        </Field>
      </div>

      <fieldset>
        <legend className="label">Possui bases?</legend>
        <div className="grid grid-cols-2 gap-3">
          {[
            { v: "SIM", t: "Sim" },
            { v: "NAO", t: "Não" },
          ].map((o) => (
            <label key={o.v} className="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-stone-300 bg-white px-4 text-sm font-semibold has-[:checked]:border-soma-600 has-[:checked]:bg-soma-50 has-[:checked]:text-soma-800">
              <input type="radio" name="has_bases" value={o.v} defaultChecked={(v?.has_bases ?? defaults.has_bases) === o.v} className="sr-only" required />
              {o.t}
            </label>
          ))}
        </div>
        {e.has_bases && <p role="alert" className="mt-1 text-sm text-red-700">{e.has_bases}</p>}
      </fieldset>

      <SubmitButton pendingText="Salvando…" className="w-full sm:w-auto">
        {onboarding ? "Salvar e continuar" : "Salvar alterações"}
      </SubmitButton>
    </form>
  );
}
