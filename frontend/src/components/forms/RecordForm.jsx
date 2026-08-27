import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { emptyRecordFor } from "../../context/AppDataContext";
import { FieldInput } from "./FieldInput";
import { LineItemsEditor } from "./LineItemsEditor";
import { Button } from "../ui/Button";
import { FormSectionHeading } from "../ui/Heading";
import { groupEntityFields } from "../../utils/listDisplay";
import { SECTION_ICONS, SECTION_SUBTITLES } from "../../utils/sectionIcons";

export function computeLineItemRollup(childEntity, parentEntity, items) {
  const hasDiscount = childEntity.fields.some((f) => f.key === "discount");
  const hasTaxAmount = childEntity.fields.some((f) => f.key === "taxAmount");
  const totals = items.reduce(
    (acc, it) => ({
      gross: acc.gross + (Number(it.quantity) || 0) * (Number(it.rate) || 0),
      discount: acc.discount + (hasDiscount ? Number(it.discount) || 0 : 0),
      tax: acc.tax + (hasTaxAmount ? Number(it.taxAmount) || 0 : 0),
      net: acc.net + (Number(it.amount) || 0),
    }),
    { gross: 0, discount: 0, tax: 0, net: 0 }
  );
  const round2 = (n) => Math.round(n * 100) / 100;
  const patch = {};
  const fieldKeys = new Set(parentEntity.fields.map((f) => f.key));
  if (fieldKeys.has("totalAmount")) patch.totalAmount = round2(totals.gross);
  if (fieldKeys.has("discount")) patch.discount = round2(totals.discount);
  if (fieldKeys.has("gST")) {
    patch.gST = hasTaxAmount ? round2(totals.tax) : round2(totals.gross * 0.18);
  }
  if (fieldKeys.has("netAmount")) {
    patch.netAmount = hasTaxAmount || fieldKeys.has("discount") ? round2(totals.net) : round2(totals.gross + (patch.gST || 0));
  }
  return patch;
}

function groupFields(fields) {
  return groupEntityFields(fields);
}

function validateField(field, value) {
  if (field.required && field.role === "field" && (value === "" || value === null || value === undefined)) {
    return "This field is required";
  }
  if (field.ui === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Enter a valid email address";
  }
  return null;
}

function FormSection({ title, fields, values, setField, errors, touched, onBlur, entities, seed }) {
  if (fields.length === 0) return null;
  return (
    <div className="border border-slate-200/80 rounded-2xl p-4 sm:p-5 bg-slate-50/50">
      <FormSectionHeading icon={SECTION_ICONS[title]} subtitle={SECTION_SUBTITLES[title]}>{title}</FormSectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 mt-4">
        {fields.map((f) => (
          <FieldInput
            key={f.key}
            field={f}
            value={values[f.key]}
            onChange={(v) => setField(f.key, v)}
            onBlur={() => onBlur(f.key)}
            error={touched.has(f.key) ? errors[f.key] : null}
            entities={entities}
            seed={seed}
          />
        ))}
      </div>
    </div>
  );
}

export function RecordForm({ entity, entities, seed, record, initialLineItems, onSave, onCancel }) {
  const isEdit = !!record;
  const [values, setValues] = useState(() => (record ? { ...record } : emptyRecordFor(entity)));
  const [lineItems, setLineItems] = useState(() => initialLineItems || []);
  const [touched, setTouched] = useState(new Set());
  const childEntity = entity.lineItemsKey ? entities[entity.lineItemsKey] : null;

  useEffect(() => {
    if (childEntity) {
      const patch = computeLineItemRollup(childEntity, entity, lineItems);
      setValues((v) => ({ ...v, ...patch }));
    }
    
  }, [lineItems]);

  const visibleFields = entity.fields.filter((f) => {
    if (f.role === "hidden_audit") return false;
    if (f.role === "id") return false;
    if ((f.role === "readonly_audit" || f.role === "approval") && !isEdit) return false;
    return true;
  });

  const groups = useMemo(() => groupFields(visibleFields), [visibleFields]);

  const errors = useMemo(() => {
    const e = {};
    visibleFields.forEach((f) => {
      const err = validateField(f, values[f.key]);
      if (err) e[f.key] = err;
    });
    return e;
  }, [visibleFields, values]);

  const setField = (key, val) => setValues((v) => ({ ...v, [key]: val }));
  const handleBlur = (key) => setTouched((t) => new Set(t).add(key));

  const errorCount = Object.keys(errors).length;

  const handleSubmit = () => {
    setTouched(new Set(visibleFields.map((f) => f.key)));
    if (errorCount) return;
    onSave(values, lineItems);
  };

  return (
    <div className="flex flex-col gap-4">
      <FormSection title="Basic Information" fields={groups.basic} values={values} setField={setField} errors={errors} touched={touched} onBlur={handleBlur} entities={entities} seed={seed} />
      <FormSection title="Dates & Scheduling" fields={groups.dates} values={values} setField={setField} errors={errors} touched={touched} onBlur={handleBlur} entities={entities} seed={seed} />
      <FormSection title="Financial Details" fields={groups.financial} values={values} setField={setField} errors={errors} touched={touched} onBlur={handleBlur} entities={entities} seed={seed} />

      {childEntity && <LineItemsEditor childEntity={childEntity} items={lineItems} onChange={setLineItems} seed={seed} />}

      <FormSection title="Approval & Audit Trail" fields={groups.audit} values={values} setField={setField} errors={errors} touched={touched} onBlur={handleBlur} entities={entities} seed={seed} />

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          {touched.size > 0 && errorCount > 0 ? (
            <span className="text-rose-500 font-medium">{errorCount} field{errorCount === 1 ? "" : "s"} need attention</span>
          ) : (
            <>Fields marked <span className="text-rose-500">*</span> are required</>
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" icon={Save} onClick={handleSubmit}>{isEdit ? "Save Changes" : "Create Record"}</Button>
        </div>
      </div>
    </div>
  );
}
