"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckIcon, CloseIcon, AlertIcon } from "./icons";

type Toast = { id: number; message: string; tone: "success" | "error" };

const ToastContext = createContext<{
  toast: (message: string, tone?: "success" | "error") => void;
}>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

/**
 * Леки известия за действия без презареждане (добавяне в кошницата,
 * добавяне в любими, копиране на линк).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-md border shadow-lift text-sm max-w-sm animate-[slide-in_0.2s_ease-out] ${
              t.tone === "success"
                ? "bg-card border-success/50 text-foreground"
                : "bg-card border-destructive/50 text-foreground"
            }`}
            role="status"
          >
            <span className={t.tone === "success" ? "text-success" : "text-destructive"}>
              {t.tone === "success" ? <CheckIcon size={18} /> : <AlertIcon size={18} />}
            </span>
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Затвори известието"
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
