"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Undo2, CheckCircle2, AlertCircle, Info } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, "id">) => void;
  showUndoToast: (message: string, onUndo: () => void) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-remove after 5 seconds
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const showUndoToast = useCallback((message: string, onUndo: () => void) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        type: "success",
        action: {
          label: "Undo",
          onClick: () => {
            onUndo();
            removeToast(id);
          },
        },
      },
    ]);

    // Auto-remove after 5 seconds
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  };

  const colors = {
    success: "from-emerald-500 to-green-500",
    error: "from-red-500 to-rose-500",
    info: "from-blue-500 to-indigo-500",
  };

  return (
    <ToastContext.Provider value={{ showToast, showUndoToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center">
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = icons[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-black/5 dark:border-white/5"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${colors[toast.type]}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium">{toast.message}</span>
                {toast.action && (
                  <button
                    onClick={toast.action.onClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 bg-orange-500/10 rounded-lg hover:bg-orange-500/20 transition-colors"
                  >
                    <Undo2 className="h-3 w-3" />
                    {toast.action.label}
                  </button>
                )}
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

