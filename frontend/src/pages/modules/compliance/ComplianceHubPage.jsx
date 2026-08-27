import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  ShieldAlert, ShieldCheck, HeartPulse, FileText, 
  CheckCircle2, AlertTriangle, Scale, Globe, Plus,
  Search, Award, Clock, ArrowRight, Leaf, Lock, Shield, RefreshCw
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";

export function ComplianceHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "mca";

  
  const [auditTrailLogs, setAuditTrailLogs] = useState([]);
  const [complianceCalendar, setComplianceCalendar] = useState([]);
  const [loading, setLoading] = useState(false);

  
  const [incidents, setIncidents] = useState([
    { id: "INC-2026-04", type: "Near Miss", location: "CNC Shop Floor (Cell 1)", date: "2026-08-18", desc: "Coolant splash guard latch loose on Mazak lathe", actionTaken: "Latch replaced immediately during shift break", status: "Closed", severity: "Low" },
    { id: "INC-2026-03", type: "Minor First Aid", location: "Deburring & Chamfer Bench", date: "2026-07-22", desc: "Minor fingertip cut during deburring sharp edge", actionTaken: "Mandatory Kevlar cut-resistant gloves enforced", status: "Closed", severity: "Minor" },
  ]);

  const [sdsMaterials, setSdsMaterials] = useState([
    { code: "CHM-COOL-68", name: "Water-Soluble Cutting Fluid Coolant Grade 68", casNo: "64742-52-5", storage: "Chemical Crib C", hazardClass: "Skin Irritant (Class 2)", sdsRevDate: "2026-02-10" },
    { code: "CHM-SOLV-01", name: "Industrial Degreasing Solvent (IPA)", casNo: "67-63-0", storage: "Flammable Store", hazardClass: "Flammable Liquid (Class 3)", sdsRevDate: "2026-01-15" },
  ]);

  
  const [tradeLicenses, setTradeLicenses] = useState([
    { licenseNo: "IEC-0318992011", type: "Import Export Code (DGFT)", authority: "Ministry of Commerce, India", validity: "Lifetime", status: "Active & Verified" },
    { licenseNo: "EXP-AUTO-2026", type: "Automotive Precision Component Export Authorization", authority: "EPCG Scheme", validity: "2026-04-01 to 2031-03-31", status: "Active & Verified" },
  ]);

  const [screeningLogs, setScreeningLogs] = useState([
    { party: "Tata Motors Precision Component Div", jurisdiction: "India / Domestic", status: "Passed (Clear)", screenedDate: "2026-08-20" },
    { party: "Sandvik Coromant Sweden", jurisdiction: "EU / Global", status: "Passed (Clear)", screenedDate: "2026-08-15" },
  ]);

  
  const [carbonMetrics, setCarbonMetrics] = useState({
    scope1: "18.4 tCO2e (Direct Diesel & Natural Gas)",
    scope2: "42.1 tCO2e (Grid Electricity Consumption)",
    scope3: "115.0 tCO2e (Raw Steel Freight & Logistics)",
    solarOffset: "28.5 tCO2e (Rooftop 150 kW Solar Array)",
  });

  useEffect(() => {
    let isMounted = true;
    const fetchComplianceData = async () => {
      setLoading(true);
      try {
        const [auditRes, calRes] = await Promise.allSettled([
          masterService.getAuditTrail(),
          masterService.getComplianceCalendar(),
        ]);
        if (auditRes.status === "fulfilled" && auditRes.value.data?.success && isMounted) {
          setAuditTrailLogs(auditRes.value.data.data || []);
        }
        if (calRes.status === "fulfilled" && calRes.value.data?.success && isMounted) {
          setComplianceCalendar(calRes.value.data.data || []);
        }
      } catch {
        
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchComplianceData();
    return () => { isMounted = false; };
  }, []);

  const headersMap = {
    mca: {
      tag: "Companies Act 2013",
      title: "MCA Rule 3(1) Immutable Audit Trail",
      sub: "Statutory un-tamperable change data capture (CDC) logs, user timestamps, and cryptographic state verification.",
    },
    ehs: {
      tag: "EHS & Safety",
      title: "EHS Incident Logs & SDS Protocols",
      sub: "Workplace safety incident tracking, hazardous chemical SDS sheets, and mandatory safety certifications.",
    },
    trade: {
      tag: "Global Trade Compliance",
      title: "Global Trade Licenses & Screening",
      sub: "DGFT IEC codes, export authorizations, customs declarations, and automated sanctions screening.",
    },
    audit: {
      tag: "ESG & Carbon Audits",
      title: "Carbon Footprint & Statutory Audits",
      sub: "Scope 1, 2, 3 greenhouse gas emissions, rooftop solar carbon offsets, and statutory pollution control permits.",
    },
    consolidation: {
      tag: "Multi-Entity Consolidation",
      title: "Multi-Company & Multi-Entity Consolidation",
      sub: "Intercompany transaction eliminations, currency translation adjustments, minority interest, and consolidated P&L / Balance Sheet.",
    },
    calendar: {
      tag: "Statutory Filing Calendar",
      title: "Multi-Country Regulatory Filing Calendar",
      sub: "Statutory deadlines across MCA (India), GSTN, CBDT, UAE FTA, UK HMRC, US IRS, and labor compliance filings.",
    },
  };

  
  const [consolidationEntities, setConsolidationEntities] = useState([
    { entity: "Chandra Precision Holdings Ltd (Parent)", jurisdiction: "India (Pune HQ)", ownership: "100%", standaloneRev: 48500000, intercompanySales: -6200000, netConsolidatedRev: 42300000, ebitdaMargin: "24.5%", status: "Audited Standalone" },
    { entity: "Chandra Advanced Tooling FZE (Subsidiary)", jurisdiction: "UAE (Dubai SAIF Zone)", ownership: "100%", standaloneRev: 18400000, intercompanySales: -3100000, netConsolidatedRev: 15300000, ebitdaMargin: "28.0%", status: "Audited Standalone" },
    { entity: "Chandra Precision Inc (USA Distribution)", jurisdiction: "USA (Delaware)", ownership: "85% (15% Minority)", standaloneRev: 12500000, intercompanySales: -2400000, netConsolidatedRev: 10100000, ebitdaMargin: "19.2%", status: "Consolidated" },
  ]);

  const [multiCountryCalendar, setMultiCountryCalendar] = useState([
    { id: "REG-IND-01", jurisdiction: "India", returnName: "GSTR-3B Monthly Return", authority: "GSTN Portal", dueDate: "2026-09-20", officer: "Finance Team Pune", urgency: "Critical", status: "Preparation Underway" },
    { id: "REG-IND-02", jurisdiction: "India", returnName: "TDS Form 26Q Q2 Filing", authority: "Income Tax (CBDT)", dueDate: "2026-10-31", officer: "Direct Tax Lead", urgency: "Standard", status: "Scheduled" },
    { id: "REG-UAE-01", jurisdiction: "UAE", returnName: "VAT 201 Quarterly Filing", authority: "Federal Tax Authority (FTA)", dueDate: "2026-09-28", officer: "Dubai Finance Desk", urgency: "Critical", status: "Audit Reviewed" },
    { id: "REG-USA-01", jurisdiction: "USA", returnName: "Form 1120 Corporate Tax Extension", authority: "Internal Revenue Service (IRS)", dueDate: "2026-10-15", officer: "US CPA Partner", urgency: "Standard", status: "Filed Extension" },
    { id: "REG-DEU-01", jurisdiction: "Germany", returnName: "USt-Voranmeldung Monthly VAT", authority: "Finanzamt Munich", dueDate: "2026-09-10", officer: "European Tax Agent", urgency: "Urgent", status: "Pending Final Approval" },
  ]);

  const currentHeader = headersMap[activeTab] || headersMap.mca;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <ShieldAlert className="h-6 w-6" strokeWidth={1.75} />
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

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold font-mono">
              <Lock className="h-3.5 w-3.5" /> MCA Rule 3(1) Sealed
            </span>
          </div>
        </div>
      </div>

      
      {activeTab === "mca" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">MCA Statutory Audit Trail & Change Log</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Append-Only Change Data Capture (CDC) with User Verification</p>
              </div>
            </div>

            {auditTrailLogs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                <ShieldCheck className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Audit Trail Active & Cryptographically Enforced</p>
                <p className="text-xs text-slate-400 mt-1">All financial vouchers, invoices, and master modifications are permanently recorded with immutable timestamps.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Log ID</th>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Table / Entity</th>
                      <th className="py-2.5 px-4">Record ID</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Changed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditTrailLogs.map((log) => (
                      <tr key={log.log_id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 text-[#0D9488] font-bold">#LOG-{log.log_id}</td>
                        <td className="py-3 px-4 text-slate-500">{new Date(log.changed_at).toLocaleString()}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{log.table_name}</td>
                        <td className="py-3 px-4 text-slate-700">{log.record_id}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-800 font-sans font-medium">{log.changed_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Statutory Filing & Regulatory Compliance Status</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Automated tracking across GST, Income Tax TDS, EPFO, ESIC & MCA</p>
            </div>

            <div className="space-y-3">
              {complianceCalendar.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#0D9488]">{item.statute}</span>
                      <span className="font-bold text-slate-900">· {item.form}</span>
                    </div>
                    <p className="text-slate-600 mt-1 font-mono">Period: {item.period} · Due Date: {item.dueDate}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono font-bold text-slate-700">{item.status}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ✓ {item.riskLevel}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      
      {activeTab === "ehs" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Safety Incident & Near-Miss Logs</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Zero Lost Time Injury (LTI) Track Record: 412 Days Safe</p>
              </div>
              <button
                onClick={() => toast.success("EHS Incident reported!")}
                className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Log Safety Report
              </button>
            </div>

            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#0D9488]">{inc.id}</span>
                      <span className="font-bold text-slate-900">· {inc.location} ({inc.date})</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {inc.status}
                    </span>
                  </div>
                  <p className="text-slate-700">{inc.desc}</p>
                  <p className="text-slate-600 font-mono text-[11px] pt-1 border-t border-slate-200">
                    <strong className="text-slate-800">Action:</strong> {inc.actionTaken}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Hazardous Chemical Safety Data Sheets (SDS)</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Coolant, Degreasers & Solvents Storage Register</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sdsMaterials.map((mat) => (
                <div key={mat.code} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#0D9488]">{mat.code}</span>
                    <span className="font-mono text-[10px] text-slate-500">CAS: {mat.casNo}</span>
                  </div>
                  <h3 className="font-bold text-slate-900">{mat.name}</h3>
                  <div className="pt-2 border-t border-slate-200 font-mono text-[11px] text-slate-600 space-y-0.5">
                    <p>Storage: {mat.storage} · {mat.hazardClass}</p>
                    <p className="text-slate-400">Revision: {mat.sdsRevDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      
      {activeTab === "trade" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Statutory Export / Import Operating Licenses</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">DGFT Foreign Trade Policy Compliance</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tradeLicenses.map((lic, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#0D9488]">{lic.licenseNo}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {lic.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900">{lic.type}</h3>
                  <p className="text-slate-500 font-mono text-[11px] pt-1 border-t border-slate-200">{lic.authority} · Term: {lic.validity}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Automated Denied Party & Sanctions Screening</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">OFAC, UN & Domestic Restricted Entity Screening Logs</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Entity Screened</th>
                    <th className="py-2.5 px-4">Trade Jurisdiction</th>
                    <th className="py-2.5 px-4 font-mono">Date Screened</th>
                    <th className="py-2.5 px-4 text-center">Sanction Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {screeningLogs.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{s.party}</td>
                      <td className="py-3 px-4 text-slate-600">{s.jurisdiction}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{s.screenedDate}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ✓ {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Corporate Carbon Emissions & ESG Footprint</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Greenhouse Gas Protocol (GHG) Scope 1, 2, and 3 Accounting</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Scope 1 (Direct)</span>
              <p className="text-sm font-bold text-slate-900 mt-1">{carbonMetrics.scope1}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Scope 2 (Grid Power)</span>
              <p className="text-sm font-bold text-slate-900 mt-1">{carbonMetrics.scope2}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 uppercase font-bold text-[10px]">Scope 3 (Supply Chain)</span>
              <p className="text-sm font-bold text-slate-900 mt-1">{carbonMetrics.scope3}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-emerald-800 uppercase font-bold text-[10px]">Solar Renewable Offset</span>
              <p className="text-sm font-bold text-emerald-800 mt-1">{carbonMetrics.solarOffset}</p>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === "consolidation" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Multi-Entity Group Financial Consolidation</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Automated Intercompany Sales Eliminations, Currency Translation & Group EBITDA</p>
            </div>
            <button
              onClick={() => toast.success("Intercompany reconciliation matrix generated with zero uneliminated variance")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Run Consolidation Rollup
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Operating Legal Entity</th>
                  <th className="py-2.5 px-3">Tax Jurisdiction</th>
                  <th className="py-2.5 px-3">Parent Stake</th>
                  <th className="py-2.5 px-3 text-right">Standalone Revenue</th>
                  <th className="py-2.5 px-3 text-right">Intercompany Eliminations</th>
                  <th className="py-2.5 px-3 text-right">Consolidated Group Revenue</th>
                  <th className="py-2.5 px-3 text-center">EBITDA %</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {consolidationEntities.map((ent, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{ent.entity}</td>
                    <td className="py-3 px-3 text-slate-600">{ent.jurisdiction}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{ent.ownership}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">{fmtMoney(ent.standaloneRev)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">{fmtMoney(ent.intercompanySales)}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900">{fmtMoney(ent.netConsolidatedRev)}</td>
                    <td className="py-3 px-3 text-center font-black text-[#0D9488]">{ent.ebitdaMargin}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {ent.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "calendar" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Multi-Country Statutory & Regulatory Filing Calendar</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Automated Deadline Tracking across Tax, Corporate MCA, Labor & Environmental Agencies</p>
            </div>
            <button
              onClick={() => toast.success("Statutory filing alert notifications dispatched to officers")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              Dispatch Reminder Notices
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Filing Code</th>
                  <th className="py-2.5 px-3">Jurisdiction</th>
                  <th className="py-2.5 px-3">Statutory Return / Report</th>
                  <th className="py-2.5 px-3">Governing Authority</th>
                  <th className="py-2.5 px-3">Statutory Due Date</th>
                  <th className="py-2.5 px-3">Compliance Officer</th>
                  <th className="py-2.5 px-3 text-center">Priority</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {multiCountryCalendar.map((cal) => (
                  <tr key={cal.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{cal.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{cal.jurisdiction}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{cal.returnName}</td>
                    <td className="py-3 px-3 text-slate-600">{cal.authority}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 text-[11px]">{cal.dueDate}</td>
                    <td className="py-3 px-3 text-slate-700">{cal.officer}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={cx(
                        "px-2 py-0.5 rounded-full font-bold text-[10px] border",
                        cal.urgency === "Critical" ? "bg-rose-50 text-rose-700 border-rose-200" : (cal.urgency === "Urgent" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-teal-50 text-[#0F766E] border-teal-200")
                      )}>
                        {cal.urgency}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {cal.status}
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

export default ComplianceHubPage;
