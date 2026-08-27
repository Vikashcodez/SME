import { Plus, X, ListPlus } from "lucide-react";
import { fmtMoney2 } from "../../utils/format";
import { Button, IconButton } from "../ui/Button";
import { inputBase } from "./inputStyles";
import { cx } from "../../utils/format";

const cellInput = cx(inputBase, "py-1.5 rounded-md");

export function LineItemsEditor({ childEntity, items, onChange, seed }) {
  const products = seed.productMaster || [];
  const units = seed.unitMaster || [];
  const taxes = seed.taxMaster || [];
  const hasUnit = childEntity.fields.some((f) => f.key === "unitID");
  const hasDiscount = childEntity.fields.some((f) => f.key === "discount");
  const hasTax = childEntity.fields.some((f) => f.key === "taxID");
  const hasTaxAmount = childEntity.fields.some((f) => f.key === "taxAmount");

  const recompute = (row) => {
    const qty = Number(row.quantity) || 0;
    const rate = Number(row.rate) || 0;
    const discount = hasDiscount ? Number(row.discount) || 0 : 0;
    const gross = qty * rate;
    let taxAmount = 0;
    if (hasTaxAmount) {
      const tax = taxes.find((t) => t.taxID === row.taxID);
      const pctMatch = tax && String(tax.taxName || "").match(/(\d+(\.\d+)?)\s*%/);
      const pct = pctMatch ? parseFloat(pctMatch[1]) : 18;
      taxAmount = Math.round((gross - discount) * (pct / 100) * 100) / 100;
    }
    const amount = Math.round((gross - discount + taxAmount) * 100) / 100;
    return { ...row, taxAmount: hasTaxAmount ? taxAmount : row.taxAmount, amount };
  };

  const updateRow = (idx, patch) => {
    const next = items.map((it, i) => (i === idx ? recompute({ ...it, ...patch }) : it));
    onChange(next);
  };
  const addRow = () => {
    onChange([
      ...items,
      recompute({
        productID: products[0]?.productID || "",
        quantity: 1,
        unitID: units[0]?.unitID || "",
        rate: 0,
        discount: 0,
        taxID: taxes[0]?.taxID || "",
        taxAmount: 0,
        amount: 0,
      }),
    ]);
  };
  const removeRow = (idx) => onChange(items.filter((_, i) => i !== idx));

  const totals = items.reduce(
    (acc, it) => ({
      gross: acc.gross + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
      discount: acc.discount + (hasDiscount ? Number(it.discount) || 0 : 0),
      tax: acc.tax + (hasTaxAmount ? Number(it.taxAmount) || 0 : 0),
      net: acc.net + (Number(it.amount) || 0),
    }),
    { gross: 0, discount: 0, tax: 0, net: 0 }
  );

  return (
    <div className="col-span-2 border border-slate-200/70 rounded-2xl overflow-hidden bg-white">
      <div className="bg-emerald-50/60 px-4 sm:px-5 py-3 flex items-center justify-between border-b border-slate-200/70">
        <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
          <ListPlus className="h-3.5 w-3.5" />
          {childEntity.name}
        </span>
        <Button size="sm" variant="primary" icon={Plus} onClick={addRow}>Add Line</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wide">
              <th className="text-left px-3 py-2.5 font-semibold">Product</th>
              <th className="text-left px-3 py-2.5 font-semibold w-24">Qty</th>
              {hasUnit && <th className="text-left px-3 py-2.5 font-semibold w-28">Unit</th>}
              <th className="text-left px-3 py-2.5 font-semibold w-28">Rate</th>
              {hasDiscount && <th className="text-left px-3 py-2.5 font-semibold w-28">Discount</th>}
              {hasTax && <th className="text-left px-3 py-2.5 font-semibold w-32">Tax</th>}
              {hasTaxAmount && <th className="text-left px-3 py-2.5 font-semibold w-24">Tax Amt</th>}
              <th className="text-right px-3 py-2.5 font-semibold w-28">Amount</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((it, idx) => (
              <tr key={idx} className="hover:bg-slate-50/60">
                <td className="px-3 py-1.5">
                  <select className={cellInput} value={it.productID} onChange={(e) => updateRow(idx, { productID: e.target.value })}>
                    {products.map((p) => (
                      <option key={p.productID} value={p.productID}>{p.productName}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" step="0.01" className={cellInput} value={it.quantity} onChange={(e) => updateRow(idx, { quantity: Number(e.target.value) })} />
                </td>
                {hasUnit && (
                  <td className="px-3 py-1.5">
                    <select className={cellInput} value={it.unitID} onChange={(e) => updateRow(idx, { unitID: e.target.value })}>
                      {units.map((u) => (
                        <option key={u.unitID} value={u.unitID}>{u.unitSymbol || u.unitName}</option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="px-3 py-1.5">
                  <input type="number" step="0.01" className={cellInput} value={it.rate} onChange={(e) => updateRow(idx, { rate: Number(e.target.value) })} />
                </td>
                {hasDiscount && (
                  <td className="px-3 py-1.5">
                    <input type="number" step="0.01" className={cellInput} value={it.discount} onChange={(e) => updateRow(idx, { discount: Number(e.target.value) })} />
                  </td>
                )}
                {hasTax && (
                  <td className="px-3 py-1.5">
                    <select className={cellInput} value={it.taxID} onChange={(e) => updateRow(idx, { taxID: e.target.value })}>
                      {taxes.map((t) => (
                        <option key={t.taxID} value={t.taxID}>{t.taxName}</option>
                      ))}
                    </select>
                  </td>
                )}
                {hasTaxAmount && <td className="px-3 py-1.5 text-slate-500 tabular-nums text-xs">{fmtMoney2(it.taxAmount)}</td>}
                <td className="px-3 py-1.5 text-right font-semibold text-slate-900 tabular-nums">{fmtMoney2(it.amount)}</td>
                <td className="px-1"><IconButton icon={X} label="Remove line" tone="danger" onClick={() => removeRow(idx)} /></td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-400">No line items yet. Click "Add Line" to begin.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50/80 px-4 sm:px-5 py-3 border-t border-slate-200/70 flex flex-wrap items-center justify-end gap-x-6 gap-y-1 text-sm">
        <span className="text-slate-500">Subtotal <span className="font-semibold text-slate-800 ml-1 tabular-nums">{fmtMoney2(totals.gross)}</span></span>
        {hasDiscount && <span className="text-slate-500">Discount <span className="font-semibold text-slate-800 ml-1 tabular-nums">{fmtMoney2(totals.discount)}</span></span>}
        {hasTaxAmount && <span className="text-slate-500">Tax <span className="font-semibold text-slate-800 ml-1 tabular-nums">{fmtMoney2(totals.tax)}</span></span>}
        <span className="text-emerald-700 font-bold">Net <span className="ml-1 tabular-nums">{fmtMoney2(totals.net)}</span></span>
      </div>
    </div>
  );
}
