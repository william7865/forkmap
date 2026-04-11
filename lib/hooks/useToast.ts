// ============================================================
// lib/hooks/useToast.ts
// Lightweight toast notification system — no external deps
// ============================================================
"use client";

import { useState, useCallback, useRef } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: ToastAction;
  leaving?: boolean;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 320);
    const t = timerRef.current.get(id);
    if (t) { clearTimeout(t); timerRef.current.delete(id); }
  }, []);

  const show = useCallback((
    message: string,
    type: ToastType = "info",
    duration = 3000,
    action?: ToastAction,
  ) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type, action }]);
    const timer = setTimeout(() => dismiss(id), duration);
    timerRef.current.set(id, timer);
    return id;
  }, [dismiss]);

  const success = useCallback((msg: string, dur?: number, action?: ToastAction) => show(msg, "success", dur, action), [show]);
  const error   = useCallback((msg: string, dur?: number) => show(msg, "error", dur ?? 4500), [show]);
  const info    = useCallback((msg: string, dur?: number, action?: ToastAction) => show(msg, "info", dur, action), [show]);

  return { toasts, show, success, error, info, dismiss };
}

export type UseToast = ReturnType<typeof useToast>;
