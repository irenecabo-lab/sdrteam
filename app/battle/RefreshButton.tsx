"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Manual escape hatch: POSTs /api/refresh?manual=1, which always pulls from
// the active data provider regardless of the 09:00/17:30 schedule gate, then
// reloads the server component so the new snapshot renders immediately.
export default function RefreshButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/refresh?manual=1", { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Error desconocido");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={loading}
        className="font-pixel text-[9px] tracking-widest bg-cyan-950/60 border border-cyan-400/40 text-cyan-300 rounded-full px-4 py-2 hover:bg-cyan-900/60 disabled:opacity-50 transition"
      >
        {loading ? "↻ ACTUALIZANDO…" : "↻ REFRESH BATTLE"}
      </button>
      {error && <span className="text-[10px] text-rose-400">{error}</span>}
    </div>
  );
}
