import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cx } from "../../utils/format";

export function RowActionsMenu({ items }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="relative inline-block text-left">
      <button
        ref={btnRef}
        type="button"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <MoreHorizontal className="h-4 w-4" strokeWidth={2.25} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div ref={menuRef} role="menu" className="absolute right-0 top-8 z-30 w-44 bg-white rounded-xl shadow-popover ring-1 ring-slate-200 py-1.5 animate-slideUp">
            {items.map((item, i) =>
              item.divider ? (
                <div key={i} className="h-px bg-slate-100 my-1" />
              ) : (
                <button
                  key={i}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  className={cx(
                    "w-full flex items-center gap-2 px-3.5 py-2 text-sm text-left transition-colors",
                    item.danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {item.icon && <item.icon className="h-3.5 w-3.5 flex-shrink-0" />}
                  {item.label}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}
