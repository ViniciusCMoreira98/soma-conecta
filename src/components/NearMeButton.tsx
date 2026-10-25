"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LocateFixed } from "lucide-react";

/** Obtém a localização do usuário e refaz a busca ordenando os SOMAs por distância. */
export default function NearMeButton() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function locate() {
    if (!navigator.geolocation) { setError("Seu navegador não permite obter a localização."); return; }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const u = new URLSearchParams(params);
        // Precisão de ~100 m é suficiente para a busca e evita expor a posição exata na URL.
        u.set("lat", p.coords.latitude.toFixed(3));
        u.set("lng", p.coords.longitude.toFixed(3));
        if (!u.get("raio")) u.set("raio", "10");
        u.delete("pagina");
        router.push(`/encontrar?${u}`);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        setError(err.code === err.PERMISSION_DENIED
          ? "Permissão de localização negada. Libere o acesso à localização no navegador."
          : "Não foi possível obter sua localização. Tente novamente.");
      },
      { timeout: 15000, maximumAge: 300000 },
    );
  }

  return (
    <div>
      <button type="button" onClick={locate} disabled={loading} className="btn-secondary w-full sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LocateFixed className="h-4 w-4" aria-hidden />}
        Perto de mim
      </button>
      {error && <p role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}
