import { useState } from "react";
import { SlidersHorizontal, Bookmark, X, Plus } from "lucide-react";
import { cx } from "../../utils/format";
import { Button } from "../ui/Button";

export function FilterPanel({ entity, statusField, filters, onChange, savedViews, onSaveView, onDeleteView }) {
  const [open, setOpen] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const hasActiveFlag = entity.fields.some((f) => f.key === "isActive");

  const activeFilterCount = (filters.status ? 1 : 0) + (filters.activeOnly ? 1 : 0);

  const handleSave = () => {
    if (!nameInput.trim()) return;
    onSaveView(nameInput.trim());
    setNameInput("");
    setSavingName(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]",
          activeFilterCount > 0
            ? "bg-teal-50 text-[#0F766E] ring-teal-200"
            : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-[#0D9488]" strokeWidth={2.25} />
        Filters
        {activeFilterCount > 0 && <span className="bg-[#0D9488] text-white font-bold rounded-full text-[10px] leading-none px-1.5 py-0.5">{activeFilterCount}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-11 z-30 w-[calc(100vw-2rem)] max-w-72 bg-white rounded-2xl shadow-popover border border-slate-200 p-4 flex flex-col gap-4 animate-slideUp text-slate-900 ring-1 ring-slate-200/50">
            {statusField && statusField.options && (
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => onChange({ ...filters, status: e.target.value })}
                  className="w-full mt-1.5 rounded-lg border-0 ring-1 ring-inset ring-slate-200 px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-[#0D9488] focus:outline-none bg-slate-50 text-slate-900 font-medium"
                >
                  <option value="">All statuses</option>
                  {statusField.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            )}

            {hasActiveFlag && (
              <label className="flex items-center gap-2 text-sm text-slate-700 select-none cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={filters.activeOnly}
                  onChange={(e) => onChange({ ...filters, activeOnly: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 bg-white text-[#0D9488] focus:ring-[#0D9488]"
                />
                Active records only
              </label>
            )}

            {savedViews && savedViews.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Saved Views</p>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                  {savedViews.map((sv) => (
                    <div key={sv.name} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-xs">
                      <button
                        onClick={() => {
                          onChange(sv.filters);
                          setOpen(false);
                        }}
                        className="flex-1 text-left truncate text-slate-700 hover:text-slate-900 font-semibold"
                      >
                        {sv.name}
                      </button>
                      <button
                        onClick={() => onDeleteView(sv.name)}
                        className="text-slate-400 hover:text-rose-600"
                        title="Delete saved view"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
              {savingName ? (
                <div className="flex items-center gap-1.5 w-full">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="View name…"
                    className="flex-1 rounded-lg border-0 ring-1 ring-inset ring-slate-200 px-2 py-1 text-xs focus:ring-2 focus:ring-[#0D9488] bg-slate-50 text-slate-900"
                    autoFocus
                  />
                  <Button size="sm" variant="primary" onClick={handleSave}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSavingName(false)}>Cancel</Button>
                </div>
              ) : (
                <>
                  <Button size="sm" variant="secondary" icon={Bookmark} onClick={() => setSavingName(true)}>
                    Save View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onChange({ status: "", activeOnly: false });
                      setOpen(false);
                    }}
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default FilterPanel;
