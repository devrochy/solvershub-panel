/**
 * Store de toasts (HU-UI-02), sin React: puro y testeable.
 *
 * Éxito → `role="status"`, se cierra solo a los 5 s y pausa con hover.
 * Error → `role="alert"`, queda hasta que el usuario lo cierra.
 */

export type ToastKind = "success" | "error";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const AUTO_MS = 5000;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): readonly ToastItem[] {
  return toasts;
}

export function dismiss(id: number): void {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function schedule(id: number, kind: ToastKind): void {
  if (kind !== "success") return;
  const timer = setTimeout(() => dismiss(id), AUTO_MS);
  timers.set(id, timer);
}

export function pauseAutoDismiss(id: number): void {
  const timer = timers.get(id);
  if (!timer) return;
  clearTimeout(timer);
  timers.delete(id);
}

export function resumeAutoDismiss(id: number, kind: ToastKind): void {
  if (kind !== "success") return;
  if (timers.has(id)) return;
  const timer = setTimeout(() => dismiss(id), AUTO_MS);
  timers.set(id, timer);
}

export function push(kind: ToastKind, message: string): number {
  const id = nextId++;
  toasts = [...toasts, { id, kind, message }];
  schedule(id, kind);
  emit();
  return id;
}

export const toast = {
  success(message: string): number {
    return push("success", message);
  },
  error(message: string): number {
    return push("error", message);
  },
};

/** Solo para tests: deja el store vacío y sin timers. */
export function resetToasts(): void {
  for (const [id, timer] of timers) {
    clearTimeout(timer);
    void id;
  }
  timers.clear();
  toasts = [];
  nextId = 1;
  emit();
}
