"use client";
import { useEffect, useState } from "react";

export function usePolling<T>(url: string, everyMs = 3000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      try {
        setError(null);
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;

        if (!json?.ok) {
          setError(json?.error ?? "Greška");
          return;
        }
        setData(json.rows as T);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Greška");
      }
    };

    load();
    const t = setInterval(load, everyMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [url, everyMs]);

  return { data, error };
}