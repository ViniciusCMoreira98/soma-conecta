"use client";

import { useState } from "react";
import { Crosshair, Loader2, MapPin } from "lucide-react";

/**
 * Captura a localização do encontro pelo GPS do aparelho (sem mapa nem serviço externo).
 * Envia `latitude`/`longitude` como campos ocultos do formulário; vazio = sem localização.
 * As coordenadas não são exibidas a ninguém: servem só para calcular a distância na busca.
 */
export default function LocationPicker({ lat, lng }: { lat?: number | null; lng?: number | null }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(lat != null && lng != null ? { lat, lng } : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function locate() {
    if (!navigator.geolocation) { setError("Seu navegador não permite obter a localização."); return; }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }); setLoading(false); },
      (err) => {
        setLoading(false);
        setError(err.code === err.PERMISSION_DENIED
          ? "Permissão de localização negada. Libere o acesso à localização no navegador e tente de novo."
          : "Não foi possível obter a localização. Tente novamente.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <div>
      <p className="label">Localização para a busca por proximidade (opcional)</p>
      <input type="hidden" name="latitude" value={coords?.lat ?? ""} />
      <input type="hidden" name="longitude" value={coords?.lng ?? ""} />
      {coords ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="flex items-center gap-2 font-medium text-soma-800"><MapPin className="h-4 w-4" aria-hidden /> Localização definida</span>
          <button type="button" onClick={locate} className="font-semibold text-soma-700 underline">Atualizar</button>
          <button type="button" onClick={() => setCoords(null)} className="font-semibold text-red-700 underline">Remover</button>
        </div>
      ) : (
        <button type="button" onClick={locate} disabled={loading} className="btn-secondary">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Crosshair className="h-4 w-4" aria-hidden />}
          Usar minha localização atual
        </button>
      )}
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
      <p className="mt-1 text-xs text-stone-500">
        Use estando no local do encontro. O endereço não é mostrado: as pessoas veem apenas a distância aproximada até o SOMA.
      </p>
    </div>
  );
}
