"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle } from "lucide-react";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

const ConfirmContext = createContext<
  ((opts: ConfirmOptions) => Promise<boolean>) | null
>(null);

export function ConfirmProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const close = useCallback(
    (result: boolean) => {
      pending?.resolve(result);
      setPending(null);
    },
    [pending]
  );

  useEffect(() => {
    if (!pending) return;
    (pending.destructive ? cancelBtnRef : confirmBtnRef).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter" && !pending.destructive) close(true);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [pending, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div
            className="absolute inset-0 bg-gray-950/45 backdrop-blur-[2px] animate-[fade-in_120ms_ease-out]"
            onClick={() => close(false)}
          />
          <div className="relative w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 animate-[scale-in_140ms_ease-out]">
            <div className="p-6">
              <div className="flex items-start gap-3">
                {pending.destructive && (
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-danger-50 dark:bg-danger-500/15">
                    <AlertTriangle
                      className="h-5 w-5 text-danger-600 dark:text-danger-400"
                      strokeWidth={1.75}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2
                    id="confirm-title"
                    className="text-base font-semibold tracking-tight text-gray-950 dark:text-gray-50"
                  >
                    {pending.title}
                  </h2>
                  {pending.description && (
                    <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                      {pending.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-800 px-6 py-3 bg-gray-50/60 dark:bg-gray-900/40 rounded-b-lg">
              <button
                ref={cancelBtnRef}
                onClick={() => close(false)}
                className="btn-secondary btn-sm"
              >
                {pending.cancelLabel || "Cancel"}
              </button>
              <button
                ref={confirmBtnRef}
                onClick={() => close(true)}
                className={pending.destructive ? "btn-danger btn-sm" : "btn-primary btn-sm"}
              >
                {pending.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
