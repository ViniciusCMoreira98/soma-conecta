"use client";

import { useActionState } from "react";
import { requestSomaRegistration, updateSomaSettings } from "@/app/actions/somas";
import { Alert, Field, SubmitButton } from "@/components/ui";
import { FREQUENCY_LABEL, WEEKDAY_LABEL } from "@/lib/labels";
import type { ActionState } from "@/lib/validation/schemas";

type Defaults = {
  name?: string; description?: string; neighborhood?: string; location_hint?: string | null;
  weekday?: string; start_time?: string; end_time?: string | null; frequency?: string;
  extra_info?: string | null; accepting_members?: boolean;
};

const initial: ActionState = {};

export default function SomaForm({
  mode, leaderName, somaId, defaults = {},
}: { mode: "create" | "edit"; leaderName: string; somaId?: string; defaults?: Defaults }) {
  const [state, action] = useActionState(mode === "create" ? requestSomaRegistration : updateSomaSettings, initial);
  const e = state.errors ?? {};

  return (
    <form
      action={action}
      noValidate
      className="space-y-8"
      onSubmit={(ev) => {
        if (mode === "create" && !window.confirm("Enviar este SOMA para aprovação da administração?")) ev.preventDefault();
      }}
    >
      {somaId && <input type="hidden" name="soma_id" value={somaId} />}
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}

      <section className="card space-y-5">
        <h2 className="text-lg font-bold text-soma-900">Sobre o SOMA</h2>
        <Field label="Nome do SOMA" name="name" error={e.name}>
          <input id="name" name="name" defaultValue={defaults.name} required maxLength={80} className="input" />
        </Field>
        <Field label="Apresentação do grupo" name="description" error={e.description} hint="Conte o que o grupo faz e quem é bem-vindo.">
          <textarea id="description" name="description" defaultValue={defaults.description} rows={4} required maxLength={1000} className="input py-2" />
        </Field>
        <div>
          <span className="label">Responsável</span>
          <p className="input flex items-center bg-stone-50 text-stone-700">{leaderName}</p>
        </div>
      </section>

      <section className="card space-y-5">
        <h2 className="text-lg font-bold text-soma-900">Onde e quando</h2>
        <Field label="Bairro" name="neighborhood" error={e.neighborhood}>
          <input id="neighborhood" name="neighborhood" defaultValue={defaults.neighborhood} required className="input" />
        </Field>
        <Field label="Localização aproximada (opcional)" name="location_hint" error={e.location_hint}
          hint="Ex.: perto da praça central. Evite o endereço completo: ele só deve ser combinado com quem entrar.">
          <input id="location_hint" name="location_hint" defaultValue={defaults.location_hint ?? ""} maxLength={200} className="input" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Dia da semana" name="weekday" error={e.weekday}>
            <select id="weekday" name="weekday" defaultValue={defaults.weekday ?? ""} required className="input">
              <option value="" disabled>Selecione…</option>
              {Object.entries(WEEKDAY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Frequência" name="frequency" error={e.frequency}>
            <select id="frequency" name="frequency" defaultValue={defaults.frequency ?? "SEMANAL"} className="input">
              {Object.entries(FREQUENCY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Horário de início" name="start_time" error={e.start_time}>
            <input id="start_time" name="start_time" type="time" defaultValue={defaults.start_time?.slice(0, 5)} required className="input" />
          </Field>
          <Field label="Término previsto (opcional)" name="end_time" error={e.end_time}>
            <input id="end_time" name="end_time" type="time" defaultValue={defaults.end_time?.slice(0, 5) ?? ""} className="input" />
          </Field>
        </div>
      </section>

      <section className="card space-y-5">
        <h2 className="text-lg font-bold text-soma-900">Informações adicionais</h2>
        <Field label="Outras informações (opcional)" name="extra_info" error={e.extra_info}>
          <textarea id="extra_info" name="extra_info" defaultValue={defaults.extra_info ?? ""} rows={3} maxLength={1000} className="input py-2" />
        </Field>
        {mode === "edit" && (
          <label className="flex min-h-[44px] items-center gap-3 text-sm font-medium">
            <input type="checkbox" name="accepting_members" defaultChecked={defaults.accepting_members} className="h-5 w-5 accent-soma-600" />
            Aceitando novos membros
          </label>
        )}
      </section>

      <SubmitButton pendingText="Enviando…" className="w-full sm:w-auto">
        {mode === "create" ? "Enviar para aprovação" : "Salvar alterações"}
      </SubmitButton>
    </form>
  );
}
