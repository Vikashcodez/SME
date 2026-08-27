import { Calendar, Clock, Mail, Phone, Lock, Hash } from "lucide-react";
import { cx } from "../../utils/format";
import { inputBase } from "./inputStyles";
import { FieldShell } from "./FieldShell";

function IconInput({ icon: Icon, children }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" strokeWidth={2} />
      {children}
    </div>
  );
}

export function FieldInput({ field, value, onChange, onBlur, error, entities, seed, disabled }) {
  const isReadonly = disabled || field.role === "readonly_audit" || field.role === "approval";
  const common = { disabled: isReadonly, className: inputBase, onBlur: onBlur || undefined };

  if (field.ui === "fk") {
    const rows = seed[field.fkTarget] || [];
    const targetEntity = entities[field.fkTarget];
    const labelKey = targetEntity ? targetEntity.labelFieldKey : null;
    return (
      <FieldShell label={field.name} required={field.required} error={error}>
        <select {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select {field.name.replace(/ ID$/, "")}…</option>
          {rows.map((r) => (
            <option key={r[targetEntity.idFieldKey]} value={r[targetEntity.idFieldKey]}>
              {labelKey ? r[labelKey] : r[targetEntity.idFieldKey]}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  if (field.ui === "select") {
    return (
      <FieldShell label={field.name} required={field.required} error={error}>
        <select {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {(field.options || []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </FieldShell>
    );
  }

  if (field.ui === "boolean") {
    return (
      <FieldShell label={field.name} error={error}>
        <label className="inline-flex items-center gap-2 mt-1 select-none">
          <input
            type="checkbox"
            disabled={isReadonly}
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            onBlur={onBlur}
            className="h-4 w-4 rounded border-slate-300 text-[#0D9488] focus:ring-[#0D9488] focus:ring-offset-0"
          />
          <span className="text-sm text-slate-700 normal-case font-medium">{value ? "Yes" : "No"}</span>
        </label>
      </FieldShell>
    );
  }

  if (field.ui === "textarea") {
    return (
      <FieldShell label={field.name} required={field.required} error={error} full>
        <textarea {...common} rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
      </FieldShell>
    );
  }

  if (field.ui === "date") {
    return (
      <FieldShell label={field.name} required={field.required} error={error}>
        <IconInput icon={Calendar}>
          <input type="date" {...common} className={cx(inputBase, "pl-9")} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </IconInput>
      </FieldShell>
    );
  }
  if (field.ui === "datetime") {
    const v = value ? String(value).slice(0, 16) : "";
    return (
      <FieldShell label={field.name} error={error}>
        <IconInput icon={Calendar}>
          <input type="datetime-local" {...common} className={cx(inputBase, "pl-9")} disabled value={v} />
        </IconInput>
      </FieldShell>
    );
  }
  if (field.ui === "time") {
    return (
      <FieldShell label={field.name} required={field.required} error={error}>
        <IconInput icon={Clock}>
          <input type="time" {...common} className={cx(inputBase, "pl-9")} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </IconInput>
      </FieldShell>
    );
  }

  if (field.ui === "currency") {
    return (
      <FieldShell label={field.name} required={field.required} error={error}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₹</span>
          <input
            type="number"
            step="0.01"
            {...common}
            className={cx(inputBase, "pl-7")}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          />
        </div>
      </FieldShell>
    );
  }
  if (field.ui === "percent") {
    return (
      <FieldShell label={field.name} required={field.required} error={error}>
        <div className="relative">
          <input
            type="number"
            step="0.01"
            {...common}
            className={cx(inputBase, "pr-7")}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
        </div>
      </FieldShell>
    );
  }
  if (field.ui === "decimal" || field.ui === "integer") {
    return (
      <FieldShell label={field.name} required={field.required} error={error}>
        <input
          type="number"
          step={field.ui === "decimal" ? "0.01" : "1"}
          {...common}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </FieldShell>
    );
  }

  if (field.ui === "email") {
    return (
      <FieldShell label={field.name} required={field.required} error={error}>
        <IconInput icon={Mail}>
          <input type="email" {...common} className={cx(inputBase, "pl-9")} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </IconInput>
      </FieldShell>
    );
  }
  if (field.ui === "phone") {
    return (
      <FieldShell label={field.name} required={field.required} error={error}>
        <IconInput icon={Phone}>
          <input type="tel" {...common} className={cx(inputBase, "pl-9")} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
        </IconInput>
      </FieldShell>
    );
  }
  if (field.ui === "password") {
    return (
      <FieldShell label={field.name} required={field.required} error={error}>
        <IconInput icon={Lock}>
          <input type="password" {...common} className={cx(inputBase, "pl-9")} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="••••••••" />
        </IconInput>
      </FieldShell>
    );
  }
  if (field.ui === "id") {
    return (
      <FieldShell label={field.name} description="System-generated identifier" error={error}>
        <IconInput icon={Hash}>
          <input type="text" {...common} className={cx(inputBase, "pl-9 font-mono")} disabled value={value ?? "(auto-generated on save)"} />
        </IconInput>
      </FieldShell>
    );
  }

  return (
    <FieldShell label={field.name} required={field.required} error={error}>
      <input type="text" {...common} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </FieldShell>
  );
}
