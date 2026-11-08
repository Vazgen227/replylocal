"use client";
import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api-client";
export function useRemote<T>(url: string, period = 0) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      const next = await api<T>(url);
      setData(next);
      setError("");
      return next;
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "SERVER_ERROR");
      throw e;
    }
  }, [url]);
  useEffect(() => {
    let active = true,
      inFlight = false;
    async function read() {
      if (inFlight) return;
      inFlight = true;
      try {
        const value = await api<T>(url);
        if (active) {
          setData(value);
          setError("");
        }
      } catch (e) {
        if (active) setError(e instanceof ApiError ? e.code : "SERVER_ERROR");
      } finally {
        inFlight = false;
      }
    }
    void read();
    const timer = period ? setInterval(() => void read(), period) : undefined;
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [url, period]);
  return { data, error, reload, setData };
}
