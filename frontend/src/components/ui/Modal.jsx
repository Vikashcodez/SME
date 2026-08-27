import { X } from "lucide-react";
import { cx } from "../../utils/format";
import { Button } from "./Button";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const SIZES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-5xl",
};

export function Modal({ open, onClose, title, subtitle, children, footer, size = "md", icon: Icon, accent }) {
  const containerRef = useFocusTrap(open, onClose);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div
        ref={containerRef}
        tabIndex={-1}
        style={{ maxHeight: "calc(100vh - 3rem)" }}
        className={cx("relative w-full my-auto bg-white rounded-2xl shadow-modal ring-1 ring-slate-200 border border-slate-200 flex flex-col outline-none animate-modalIn text-slate-900", SIZES[size])}
      >
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="min-w-0 flex items-start gap-3">
            {Icon && (
              <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-teal-50 text-[#0F766E] border border-teal-200">
                <Icon className="h-4.5 w-4.5" strokeWidth={2} />
              </div>
            )}
            <div className="min-w-0 pt-0.5">
              <h3 id="modal-title" className="text-base font-bold text-slate-900 truncate">{title}</h3>
              {subtitle && <p className="text-xs text-[#0D9488] mt-0.5 font-mono truncate font-medium">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 -mr-1.5 -mt-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-[#0D9488] focus-visible:outline-none flex-shrink-0 transition-colors cursor-pointer">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50 rounded-b-2xl flex-shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirm", tone = "danger" }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
    </Modal>
  );
}

export default Modal;
