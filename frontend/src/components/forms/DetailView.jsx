import { CellValue } from "../table/CellValue";
import { StatusBadge } from "../ui/Badge";
import { StatusStepper } from "../ui/StatusStepper";
import { FormSectionHeading } from "../ui/Heading";
import { cx, fmtMoney2 } from "../../utils/format";
import { avatarPalette, initialsFor, pickHeroField, groupEntityFields } from "../../utils/listDisplay";
import { SECTION_ICONS, SECTION_SUBTITLES } from "../../utils/sectionIcons";

function DetailSection({ title, fields, record, entities, seed }) {
  if (fields.length === 0) return null;
  return (
    <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-slate-50">
      <FormSectionHeading icon={SECTION_ICONS[title]} subtitle={SECTION_SUBTITLES[title]}>{title}</FormSectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-4">
        {fields.map((f) => (
          <div key={f.key} className={cx("flex flex-col gap-1", f.ui === "textarea" ? "sm:col-span-2" : "")}>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{f.name}</span>
            <div className="text-sm text-slate-900 font-medium"><CellValue field={f} value={record[f.key]} entities={entities} seed={seed} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailView({ entity, record, entities, seed }) {
  const label = record[entity.labelFieldKey] || record[entity.idFieldKey];
  const palette = avatarPalette(label);
  const heroField = pickHeroField(entity);
  const heroValue = heroField ? record[heroField.key] : null;
  const statusField = entity.fields.find((f) => f.key === "status");

  const bodyFields = entity.fields.filter((f) => {
    if (f.role === "hidden_audit") return false;
    if (f.key === entity.labelFieldKey || f.key === entity.idFieldKey) return false;
    if (heroField && f.key === heroField.key) return false;
    return true;
  });
  const groups = groupEntityFields(bodyFields);

  const isTransaction = entity.kind === "transaction";

  return (
    <div className="flex flex-col gap-4 text-slate-900">
      <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
        <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center text-lg font-bold flex-shrink-0">
          {initialsFor(label)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold truncate text-slate-900">{String(label)}</h2>
          <p className="text-xs font-mono text-[#0D9488] font-bold mt-0.5">{record[entity.idFieldKey]}</p>
          {statusField && <div className="mt-2"><StatusBadge value={record.status} /></div>}
        </div>
        {heroValue !== null && heroValue !== undefined && heroValue !== "" && (
          <div className="text-right flex-shrink-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{heroField.name}</p>
            <p className="text-2xl font-bold font-mono text-slate-900 tracking-tight mt-0.5">{fmtMoney2(heroValue)}</p>
          </div>
        )}
      </div>

      {statusField && statusField.options && isTransaction && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
          <StatusStepper options={statusField.options} currentStatus={record.status} />
        </div>
      )}

      {groups.map((g) => (
        <DetailSection
          key={g.title}
          title={g.title}
          fields={g.fields}
          record={record}
          entities={entities}
          seed={seed}
        />
      ))}
    </div>
  );
}

export default DetailView;
