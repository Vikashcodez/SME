import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, 
  FileText, Plus, Search, Tag, Eye, Check, X, ShieldAlert, Award
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";

export function QualityHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "inspections";

  
  const [qcChecklist, setQcChecklist] = useState([
    { id: 1, parameter: "Shaft Outer Diameter (OD)", spec: "45.000 mm ± 0.008 mm", actual: "45.004 mm", method: "Digital Micrometer", status: "Pass" },
    { id: 2, parameter: "Surface Roughness (Ra)", spec: "Ra <= 0.40 um", actual: "Ra 0.28 um", method: "Surface Tester", status: "Pass" },
    { id: 3, parameter: "Concentricity & Runout", spec: "<= 0.005 mm TIR", actual: "0.003 mm", method: "Dial Gauge", status: "Pass" },
  ]);

  const [defectTags, setDefectTags] = useState([
    { code: "DEF-01", name: "Diameter Oversize (+0.012mm)", count: 14, severity: "Critical", scrapPct: 62.5 },
    { code: "DEF-02", name: "Tool Chatter Marks on Taper", count: 8, severity: "Moderate", scrapPct: 25.0 },
    { code: "DEF-03", name: "Burr on Internal Thread", count: 4, severity: "Minor", scrapPct: 12.5 },
  ]);
  const [ncrList, setNcrList] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleChecklistStatus = (id) => {
    setQcChecklist((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === "Pass" ? "Fail" : "Pass";
          toast.success(`Parameter verdict toggled to '${nextStatus}'`);
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  useEffect(() => {
    let isMounted = true;
    const fetchQualityData = async () => {
      setLoading(true);
      try {
        const res = await masterService.getQcInspections();
        if (res.data?.success && Array.isArray(res.data.data) && isMounted) {
          const list = res.data.data;
          setNcrList(
            list.map((q) => ({
              id: q.inspection_number || q.id,
              part: q.item_name || "Precision Component",
              vendorOrMachine: q.work_center || "Machine Shop",
              cause: q.remarks || "Dimensional Variance",
              action: q.corrective_action || "Tool calibration and batch re-inspection",
              status: q.status || "Closed (Verified)",
              daysOpen: Number(q.days_open || 1),
            }))
          );
        }
      } catch {
        
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchQualityData();
    return () => { isMounted = false; };
  }, []);

  
  const [sopList, setSopList] = useState([
    { code: "SOP-QC-001", title: "CMM Coordinate Measuring Metrology Procedure", rev: "Rev 4.2", effectiveDate: "2026-01-15", owner: "Ramesh Shinde", status: "Approved" },
    { code: "SOP-MFG-014", title: "CNC Hard Turning Tool Offset Calibration", rev: "Rev 2.0", effectiveDate: "2026-03-01", owner: "Santosh Mane", status: "Approved" },
    { code: "SOP-EHS-008", title: "Chemical Coolant Handling & Disposal", rev: "Rev 3.1", effectiveDate: "2026-05-10", owner: "EHS Lead", status: "Approved" },
  ]);

  const headersMap = {
    inspections: {
      tag: "QC Metrology",
      title: "Digital QC Metrology Checklist",
      sub: "Micrometric tolerances, surface roughness Ra tests, and digital quality sign-offs.",
    },
    defects: {
      tag: "Defect Matrix",
      title: "Defect Matrix & Rejection Pareto",
      sub: "Defect frequency logging, scrap classification, and rework routing.",
    },
    ncr: {
      tag: "IATF 16949 CAPA",
      title: "IATF NCR & 8D CAPA Action Plans",
      sub: "Corrective and preventive action tracking with verification of effectiveness.",
    },
    sop: {
      tag: "Document Control",
      title: "SOP Document Control Hub",
      sub: "Controlled engineering standards, revision histories, and quality governance.",
    },
    calibration: {
      tag: "Metrology Calibration",
      title: "Calibration Management (Gauges & Precision Instruments)",
      sub: "NABL traceability, calibration due date alerts, master test equipment certificates, and gauge MSA studies.",
    },
    "supplier-audits": {
      tag: "Vendor Audits",
      title: "Supplier Quality Audits & Process Approvals (PPAP)",
      sub: "Tier-1 supplier quality audits, VDA 6.3 process scores, PPAP Level 3 submissions, and corrective action logs.",
    },
  };

  
  const [calibrations, setCalibrations] = useState([
    { id: "GAUGE-MIC-014", name: "Digital External Micrometer (0-25mm / 0.001mm)", mfr: "Mitutoyo Japan", location: "QC Lab Standard Crib", lastCal: "2026-02-15", nextDue: "2027-02-14", certRef: "NABL-CAL-8842", status: "Calibrated & Valid" },
    { id: "GAUGE-VER-022", name: "Digital Vernier Caliper (0-300mm / 0.01mm)", mfr: "Mitutoyo Japan", location: "CNC Shop Floor Cell 1", lastCal: "2025-09-10", nextDue: "2026-09-09", certRef: "NABL-CAL-7719", status: "Due Within 14 Days" },
    { id: "GAUGE-CMM-001", name: "3D CNC Coordinate Measuring Machine (CMM)", mfr: "Carl Zeiss", location: "Standards Metrology Room", lastCal: "2026-06-01", nextDue: "2027-05-31", certRef: "ZEISS-NABL-0019", status: "Calibrated & Valid" },
  ]);

  const [supplierAudits, setSupplierAudits] = useState([
    { vendor: "Steel Authority of India (SAIL)", standard: "ISO 9001:2015 & IATF 16949", auditScore: "96.5%", findings: "0 Major / 2 Minor", auditDate: "2026-04-12", nextAudit: "2027-04-11", ppapStatus: "PPAP Level 3 Approved", status: "Grade A Supplier" },
    { vendor: "Sandvik Coromant Cutting Tools", standard: "ISO 9001:2015 / ISO 14001", auditScore: "98.0%", findings: "0 Major / 0 Minor", auditDate: "2026-05-20", nextAudit: "2027-05-19", ppapStatus: "Approved Partner", status: "Grade A Supplier" },
    { vendor: "Precision Heat Treaters Pune", standard: "CQI-9 Heat Treat Assessment", auditScore: "89.2%", findings: "0 Major / 4 Minor (Pyrometry)", auditDate: "2026-07-10", nextAudit: "2027-01-10", ppapStatus: "Conditional Approval", status: "Under Surveillance" },
  ]);

  const currentHeader = headersMap[activeTab] || headersMap.inspections;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs text-[#0D9488] font-bold uppercase tracking-[0.14em]">
                {currentHeader.tag}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                {currentHeader.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {currentHeader.sub}
              </p>
            </div>
          </div>
        </div>
      </div>

      
      {activeTab === "inspections" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Final PDI Quality Checklist (Click Status to Toggle)</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Sample Lot: LOT-2026-081 · Part: CNC Turned Shaft 45mm</p>
            </div>
            <button
              onClick={() => toast.success("Quality Certificate generated and signed digitally!")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" /> Sign Quality Certificate
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Inspection Parameter</th>
                  <th className="py-2.5 px-4 font-mono">Engineering Specification</th>
                  <th className="py-2.5 px-4 font-mono">Actual Measurement</th>
                  <th className="py-2.5 px-4">Metrology Instrument</th>
                  <th className="py-2.5 px-4 text-center">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {qcChecklist.map((qc) => (
                  <tr key={qc.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-bold text-slate-900">{qc.parameter}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{qc.spec}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{qc.actual}</td>
                    <td className="py-3 px-4 text-slate-600">{qc.method}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleChecklistStatus(qc.id)}
                        className={cx(
                          "px-3 py-1 rounded-full text-[10px] font-bold font-mono border transition-all cursor-pointer",
                          qc.status === "Pass"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        )}
                      >
                        {qc.status === "Pass" ? "✓ PASS" : "✕ FAIL"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "defects" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Shop Floor Defect Classification Matrix</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Defect Pareto Tagging and Root-Cause Tracking</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {defectTags.map((def) => (
              <div key={def.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-2.5">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[10px] text-[#0D9488]">{def.code}</span>
                    <span className={cx("text-[10px] font-bold px-1.5 py-0.2 rounded border", def.severity === "Critical" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-amber-50 text-amber-800 border-amber-200")}>
                      {def.severity}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 mt-1">{def.name}</h3>
                </div>

                <div className="flex justify-between items-center text-xs font-mono pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Lot: {def.lotNo}</span>
                  <span className="font-bold text-slate-900">{def.count} Rejects</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      
      {activeTab === "ncr" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Non-Conformance Reports (NCR) & CAPA Logs</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Corrective & Preventive Actions with Root-Cause Countermeasures</p>
            </div>
          </div>

          <div className="space-y-3">
            {ncrList.map((ncr) => (
              <div key={ncr.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#0D9488]">{ncr.id}</span>
                    <span className="font-bold text-slate-900">· {ncr.part}</span>
                  </div>
                  <span className={cx("text-[10px] font-bold px-2 py-0.5 rounded-full border", ncr.status.includes("Closed") ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200")}>
                    {ncr.status}
                  </span>
                </div>

                <p className="text-slate-600"><strong className="text-slate-700">Root Cause:</strong> {ncr.cause}</p>
                <p className="text-slate-600"><strong className="text-slate-700">CAPA Countermeasure:</strong> {ncr.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      
      {activeTab === "sop" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Standard Operating Procedures (SOP) & Control Plans</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Engineering Guidelines, Work Instructions & Audit Control</p>
            </div>
          </div>

          <div className="space-y-3">
            {sopList.map((sop) => (
              <div key={sop.code} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#0D9488]">{sop.code}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200">{sop.rev}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 mt-1">{sop.title}</h3>
                  <p className="text-slate-500 mt-0.5 font-mono text-[11px]">Owner: {sop.owner} · Effective: {sop.effectiveDate}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {sop.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === "calibration" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Gauge & Metrology Calibration Directory</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">NABL Traceable Calibration Schedules, Calibration Certs & Due Date Surveillance</p>
            </div>
            <button
              onClick={() => toast.success("Calibration recall notice dispatched for due instruments")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Register Instrument
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Instrument Tag</th>
                  <th className="py-2.5 px-3">Gauge Description</th>
                  <th className="py-2.5 px-3">OEM Maker</th>
                  <th className="py-2.5 px-3">Physical Location</th>
                  <th className="py-2.5 px-3">Last Calibrated</th>
                  <th className="py-2.5 px-3">Next Due Date</th>
                  <th className="py-2.5 px-3">NABL Certificate</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {calibrations.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{c.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-3 text-slate-700">{c.mfr}</td>
                    <td className="py-3 px-3 text-slate-600">{c.location}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{c.lastCal}</td>
                    <td className="py-3 px-3 font-mono text-slate-800 font-bold text-[11px]">{c.nextDue}</td>
                    <td className="py-3 px-3 font-mono text-[#0D9488] font-bold text-[11px]">{c.certRef}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={cx(
                        "px-2 py-0.5 rounded-full font-bold text-[10px] border",
                        c.status.includes("Days") ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "supplier-audits" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Tier-1 Supplier Quality Audits & PPAP Approvals</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">IATF 16949 / VDA 6.3 Process Quality Audits and Production Part Approval (PPAP)</p>
            </div>
            <button
              onClick={() => toast.success("Scheduled new supplier process audit")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Schedule Supplier Audit
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Audit Protocol</th>
                  <th className="py-2.5 px-3">Audit Score %</th>
                  <th className="py-2.5 px-3">Audit Findings</th>
                  <th className="py-2.5 px-3">Last Audit</th>
                  <th className="py-2.5 px-3">Next Due</th>
                  <th className="py-2.5 px-3">PPAP Signoff</th>
                  <th className="py-2.5 px-3 text-center">Quality Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {supplierAudits.map((sa, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{sa.vendor}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{sa.standard}</td>
                    <td className="py-3 px-3 font-black text-[#0D9488]">{sa.auditScore}</td>
                    <td className="py-3 px-3 text-slate-600">{sa.findings}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{sa.auditDate}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{sa.nextAudit}</td>
                    <td className="py-3 px-3 font-medium text-slate-800">{sa.ppapStatus}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {sa.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default QualityHubPage;
