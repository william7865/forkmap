// ============================================================
// lib/hooks/useToast.ts
// Lightweight toast notification system — no external deps
// ============================================================
"use client";

import { useState, useCallback, useRef } from "react";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  leaving?: boolean;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    // Mark as leaving (triggers exit animation)
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    // Remove after animation
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 320);
    const t = timerRef.current.get(id);
    if (t) { clearTimeout(t); timerRef.current.delete(id); }
  }, []);

  const show = useCallback((message: string, type: ToastType = "info", duration = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type }]);
    const timer = setTimeout(() => dismiss(id), duration);
    timerRef.current.set(id, timer);
    return id;
  }, [dismiss]);

  const success = useCallback((msg: string, dur?: number) => show(msg, "success", dur), [show]);
  const error   = useCallback((msg: string, dur?: number) => show(msg, "error",   dur ?? 4500), [show]);
  const info    = useCallback((msg: string, dur?: number) => show(msg, "info",    dur), [show]);

  return { toasts, show, success, error, info, dismiss };
}

export type UseToast = ReturnType<typeof useToast>;
