import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { cx } from "../../utils/format";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div style={{ zIndex: 100 }} className="fixed bottom-4 right-4 flex flex-col gap-2 items-end" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-popover text-sm font-medium animate-slideUp ring-1",
              t.tone === "error" ? "bg-rose-600 text-white ring-rose-700" : "bg-ink-900 text-white ring-ink-800"
            )}
          >
            {t.tone === "error" ? <AlertTriangle className="h-4 w-4 text-rose-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
