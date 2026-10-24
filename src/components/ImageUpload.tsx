"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveAvatar, saveCover } from "@/app/actions/media";
import { Alert, SubmitButton } from "@/components/ui";
import { checkImage, removeImages, uploadImage } from "@/lib/storage-upload";
import type { ActionState } from "@/lib/validation/schemas";

const initial: ActionState = {};
const fileInputClass =
  "block w-full text-sm file:mr-3 file:min-h-[44px] file:rounded-xl file:border-0 file:bg-soma-100 file:px-4 file:font-semibold file:text-soma-800";

/** Envia a imagem direto ao Storage pelo navegador e pede ao servidor para gravar o caminho; desfaz o envio se a gravação falhar. */
async function uploadAndSave(
  file: FormDataEntryValue | null, maxMb: number, bucket: string, folder: string,
  save: (path: string) => Promise<ActionState>,
): Promise<ActionState> {
  const err = checkImage(file, maxMb);
  if (err) return { message: err };
  const path = await uploadImage(bucket, folder, file as File);
  if (!path) return { message: "Não foi possível enviar a imagem. Verifique sua conexão e tente novamente." };
  const res = await save(path);
  if (!res.ok) await removeImages(bucket, [path]);
  return res;
}

const FRAME = 240; // tamanho da prévia (px)
const OUT = 512; // tamanho final da foto de perfil (px)

/** Foto de perfil com prévia e recorte: arrastar para posicionar, controle de zoom, recorte quadrado de 512px no navegador. */
export function AvatarUploader({ userId }: { userId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [pickError, setPickError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const base = nat.w ? Math.max(FRAME / nat.w, FRAME / nat.h) : 1;
  const scale = base * zoom;
  const latest = useRef({ scale, pos, nat });
  latest.current = { scale, pos, nat };

  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);

  // Mantém a imagem cobrindo toda a área da prévia.
  function clamp(p: { x: number; y: number }, s = scale) {
    const mx = Math.max(0, (nat.w * s - FRAME) / 2);
    const my = Math.max(0, (nat.h * s - FRAME) / 2);
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPickError(null);
    if (!f) return;
    // A foto original pode ser grande: ela é reduzida para 512px antes do envio.
    const err = checkImage(f, 20);
    if (err) { setPickError(err); e.target.value = ""; return; }
    setNat({ w: 0, h: 0 });
    setZoom(1);
    setPos({ x: 0, y: 0 });
    setSrc(URL.createObjectURL(f));
  }

  function cancel() {
    setSrc(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function crop(): Promise<File | null> {
    const img = imgRef.current;
    const { scale: s, pos: p, nat: n } = latest.current;
    if (!img || !n.w) return null;
    const left = FRAME / 2 - (n.w * s) / 2 + p.x;
    const top = FRAME / 2 - (n.h * s) / 2 + p.y;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff"; // fundo para PNGs com transparência
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(img, -left / s, -top / s, FRAME / s, FRAME / s, 0, 0, OUT, OUT);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob ? new File([blob], "avatar.jpg", { type: "image/jpeg" }) : null;
  }

  const [state, action] = useActionState(async (): Promise<ActionState> => {
    const file = await crop();
    if (!file) return { message: "Selecione uma imagem." };
    const res = await uploadAndSave(file, 2, "avatars", userId, saveAvatar);
    if (res.ok) cancel();
    return res;
  }, initial);

  return (
    <form action={action} className="space-y-3">
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      {pickError && <Alert tone="error">{pickError}</Alert>}
      <label htmlFor="avatar" className="label">Nova foto (JPG, PNG ou WebP)</label>
      <input ref={inputRef} id="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className={fileInputClass} />

      {src && (
        <div className="space-y-3">
          <p className="text-sm text-stone-600">Arraste para posicionar e use o zoom para ajustar.</p>
          <div
            className="relative mx-auto cursor-grab touch-none select-none overflow-hidden rounded-full bg-stone-100 ring-4 ring-soma-100 active:cursor-grabbing"
            style={{ width: FRAME, height: FRAME }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d) setPos(clamp({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }));
            }}
            onPointerUp={() => { drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="Prévia da nova foto de perfil"
              draggable={false}
              onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: nat.w * scale || FRAME,
                height: nat.h * scale || "auto",
                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
              }}
            />
          </div>
          <label className="mx-auto flex max-w-[260px] items-center gap-3 text-sm text-stone-600">
            Zoom
            <input
              type="range" min={1} max={3} step={0.01} value={zoom}
              onChange={(e) => {
                const z = Number(e.target.value);
                setZoom(z);
                setPos((p) => clamp(p, base * z));
              }}
              className="w-full accent-soma-600"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton pendingText="Enviando…">Salvar foto</SubmitButton>
            <button type="button" onClick={cancel} className="text-sm font-semibold text-stone-600 underline">Cancelar</button>
          </div>
        </div>
      )}
    </form>
  );
}

export function CoverUploader({ somaId }: { somaId: string }) {
  const [state, action] = useActionState(
    (_: ActionState, form: FormData) => uploadAndSave(form.get("cover"), 5, "soma-covers", somaId, (path) => saveCover(somaId, path)),
    initial,
  );
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="soma_id" value={somaId} />
      {state.message && <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>}
      <label htmlFor="cover" className="label">Nova imagem (JPG, PNG ou WebP, até 5 MB; ideal na horizontal)</label>
      <input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" required className={fileInputClass} />
      <p className="text-xs text-stone-500">A capa aparece na busca para todos os usuários. Evite fotos em que pessoas possam ser identificadas sem consentimento.</p>
      <SubmitButton pendingText="Enviando…">Salvar capa</SubmitButton>
    </form>
  );
}
