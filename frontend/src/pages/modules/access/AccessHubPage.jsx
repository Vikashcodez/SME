import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  ShieldCheck, Key, Users, Lock, CheckCircle2, 
  XCircle, Plus, Search, Shield, AlertTriangle, Check, X, Clock
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";

export function AccessHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "matrix";

  
  const [modulesList, setModulesList] = useState([
    { name: "Executive Dashboard", admin: "Full Control", manager: "Read Only", operator: "No Access", auditor: "Read Only" },
    { name: "Master Data Hub", admin: "Full Control", manager: "Edit & Create", operator: "Read Only", auditor: "Read Only" },
    { name: "Financial Accounts & GL", admin: "Full Control", manager: "Post Vouchers", operator: "No Access", auditor: "Full Audit" },
    { name: "Taxation & GST (IRN)", admin: "Full Control", manager: "Sign & Generate", operator: "No Access", auditor: "Full Audit" },
    { name: "Sales & CRM Pipeline", admin: "Full Control", manager: "Full Control", operator: "Create Quotes", auditor: "Read Only" },
    { name: "Procurement & Sourcing", admin: "Full Control", manager: "Approve PO", operator: "Raise Indent", auditor: "Read Only" },
    { name: "Manufacturing & MES", admin: "Full Control", manager: "Full Control", operator: "Log Job Status", auditor: "Read Only" },
    { name: "Quality Assurance (QA)", admin: "Full Control", manager: "Sign Certs", operator: "Log PDI Tests", auditor: "Read Only" },
  ]);

  
  const [users, setUsers] = useState([
    { id: "USR-001", name: "Chandra Shekhar (Admin)", email: "admin@chandraprecision.com", role: "Super Administrator", mfa: "FIDO2 Hardware Key", status: "Active", lastLogin: "10 mins ago" },
    { id: "USR-002", name: "Pooja Kulkarni", email: "pooja.k@chandraprecision.com", role: "Commercial Sales Lead", mfa: "Authenticator App (TOTP)", status: "Active", lastLogin: "1 hour ago" },
    { id: "USR-003", name: "Santosh Mane", email: "santosh.m@chandraprecision.com", role: "Shop Floor Production Lead", mfa: "Biometric Shift Card", status: "Active", lastLogin: "3 hours ago" },
    { id: "USR-004", name: "Statutory Auditor (External)", email: "auditor@deloitte.com", role: "Statutory Auditor", mfa: "SMS OTP", status: "Active", lastLogin: "Yesterday" },
  ]);

  
  const [auditLogs, setAuditLogs] = useState([
    { id: "AUD-9912", user: "admin@chandraprecision.com", event: "Approved Purchase Order PO-2026-0042 (₹84,500)", ip: "192.168.1.104", time: "Today, 10:15 AM", status: "Verified" },
    { id: "AUD-9911", user: "pooja.k@chandraprecision.com", event: "Generated E-Invoice IRN for Tata Motors INV-2026-0031", ip: "192.168.1.142", time: "Today, 09:40 AM", status: "Verified" },
    { id: "AUD-9910", user: "santosh.m@chandraprecision.com", event: "Completed Work Order WO-2026-0041 (180 PCS)", ip: "192.168.1.201", time: "Today, 09:00 AM", status: "Verified" },
  ]);

  const [sessions, setSessions] = useState([
    { id: "SES-8491", user: "admin@chandraprecision.com", device: "MacBook Pro (macOS 15.4 / Chrome 128)", ip: "192.168.1.104", location: "Pune, Maharashtra", loginTime: "Today, 08:30 AM", lastActivity: "Just now", status: "Active Current" },
    { id: "SES-8490", user: "pooja.k@chandraprecision.com", device: "Dell Latitude (Windows 11 / Edge)", ip: "192.168.1.142", location: "Pune, Maharashtra", loginTime: "Today, 09:15 AM", lastActivity: "10 mins ago", status: "Active" },
    { id: "SES-8489", user: "santosh.m@chandraprecision.com", device: "Samsung Galaxy Tab Active 4 (Android)", ip: "192.168.1.201", location: "Bhosari Plant Floor", loginTime: "Today, 07:00 AM", lastActivity: "25 mins ago", status: "Active Floor Session" },
    { id: "SES-8488", user: "auditor@deloitte.com", device: "Lenovo ThinkPad (Windows 11 / Chrome)", ip: "103.21.14.88", location: "Mumbai HQ", loginTime: "Yesterday, 14:20", lastActivity: "Idle (Expired)", status: "Session Ended" },
  ]);

  const [privacyControls, setPrivacyControls] = useState([
    { id: "DPIA-01", subject: "Employee Aadhaar & Biometric Vault", regulation: "DPDP Act 2023 (India) / GDPR Art. 9", masking: "SHA-256 Hash + Hardware HSM Key", consentStatus: "Consent Logged & Timestamped", retention: "7 Years Post Employment", status: "Compliant" },
    { id: "DPIA-02", subject: "Customer Bank Account & Credit Health", regulation: "RBI Data Localization / ISO 27001", masking: "Masked (Last 4 Digits Visible)", consentStatus: "Master Supply Agreement Consent", retention: "8 Years Statutory GL Period", status: "Compliant" },
    { id: "DPIA-03", subject: "Candidate Resumes & HR Applicant Data", regulation: "Right to be Forgotten (Art. 17)", masking: "Automated 6-Month Purge Policy", consentStatus: "Applicant Opt-in Consent", retention: "180 Days", status: "Compliant" },
  ]);

  const headersMap = {
    matrix: {
      tag: "Access Governance",
      title: "Role-Based Access (RBAC) Matrix",
      sub: "Granular CRUD access rules across all 20 ERP modules mapped to corporate roles.",
    },
    users: {
      tag: "Identity & MFA",
      title: "User Identity & MFA Directory",
      sub: "User provisioning, assigned security roles, and active authentication methods.",
    },
    audit: {
      tag: "Security Telemetry",
      title: "Cryptographic Security Audit Trail",
      sub: "Immutable transaction logs tracking authorizations, invoice generation, and master updates.",
    },
    sessions: {
      tag: "Device Governance",
      title: "Session & Device Management",
      sub: "Real-time active login tracking, device fingerprinting, IP whitelisting, and remote session termination.",
    },
    privacy: {
      tag: "Data Protection",
      title: "Data Privacy & GDPR/Local Data Protection Controls",
      sub: "India DPDP Act & GDPR compliance, PII field-level data masking, consent registry, and automated data retention policies.",
    },
  };

  const currentHeader = headersMap[activeTab] || headersMap.matrix;

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

      
      {activeTab === "matrix" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Module Permission Access Matrix</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Role Governance: Admin · Plant Manager · Floor Operator · Auditor</p>
            </div>
            <button
              onClick={() => toast.success("Access policy matrix published and deployed!")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              Deploy Access Policy
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">ERP Module Domain</th>
                  <th className="py-2.5 px-4">Administrator</th>
                  <th className="py-2.5 px-4">Plant Manager</th>
                  <th className="py-2.5 px-4">Floor Operator</th>
                  <th className="py-2.5 px-4">External Auditor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {modulesList.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-sans font-bold text-slate-900">{m.name}</td>
                    <td className="py-3 px-4 text-emerald-700 font-bold">{m.admin}</td>
                    <td className="py-3 px-4 text-teal-700 font-bold">{m.manager}</td>
                    <td className="py-3 px-4 text-slate-500">{m.operator}</td>
                    <td className="py-3 px-4 text-slate-700">{m.auditor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "users" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">User Identity & Authentication Directory</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Active Enterprise Accounts with Hardware / TOTP MFA Status</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">User Name / ID</th>
                  <th className="py-2.5 px-4">Corporate Email</th>
                  <th className="py-2.5 px-4">Assigned Role</th>
                  <th className="py-2.5 px-4">MFA Security Method</th>
                  <th className="py-2.5 px-4">Last Authentication</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <span className="font-mono text-[#0D9488] font-bold text-[11px] block">{u.id}</span>
                      <p className="font-bold text-slate-900 mt-0.5">{u.name}</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{u.role}</td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="inline-flex items-center gap-1 font-mono text-slate-800">
                        <Key className="h-3 w-3 text-[#0D9488]" /> {u.mfa}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{u.lastLogin}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Security & Operational Audit Log</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Cryptographically Sealed Audit Trail</p>
            </div>
          </div>

          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#0D9488]">{log.id}</span>
                    <span className="font-mono text-slate-500 font-bold">[{log.time}]</span>
                    <span className="font-bold text-slate-900">· {log.user}</span>
                  </div>
                  <p className="text-slate-700 mt-1">{log.event}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-slate-400">IP: {log.ip}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === "sessions" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Active User Sessions & Hardware Devices</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Real-time session monitoring with remote kill-switch and IP authentication</p>
            </div>
            <button
              onClick={() => toast.success("Terminated all non-current idle remote sessions")}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              Terminate Remote Sessions
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Session ID</th>
                  <th className="py-2.5 px-3">Authenticated User</th>
                  <th className="py-2.5 px-3">Device & Browser Fingerprint</th>
                  <th className="py-2.5 px-3">IP Address</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Login Time</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sessions.map((ses) => (
                  <tr key={ses.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{ses.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{ses.user}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{ses.device}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{ses.ip}</td>
                    <td className="py-3 px-3 text-slate-600">{ses.location}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{ses.loginTime}</td>
                    <td className="py-3 px-3 text-center">
                      {ses.status.includes("Current") ? (
                        <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded-full font-bold text-[10px]">
                          This Device
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setSessions(sessions.filter(s => s.id !== ses.id));
                            toast.success(`Session ${ses.id} revoked`);
                          }}
                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded text-[10px] cursor-pointer"
                        >
                          Revoke Token
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "privacy" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Data Privacy & Statutory Protection Controls</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">India DPDP Act 2023 · GDPR / ISO 27001 Data Protection Impact Assessments (DPIA)</p>
            </div>
            <button
              onClick={() => toast.success("DPIA compliance audit certificate generated")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              Export DPIA Audit Report
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {privacyControls.map((pc) => (
              <div key={pc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded font-mono text-[10px] font-bold">
                      {pc.id}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{pc.subject}</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                    {pc.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs pt-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Statutory Scope:</span>
                    <span className="font-semibold text-slate-800">{pc.regulation}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>PII Data Masking:</span>
                    <span className="font-mono text-slate-800 text-[11px]">{pc.masking}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Statutory Retention:</span>
                    <span className="font-bold text-[#0F766E]">{pc.retention}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">{pc.consentStatus}</span>
                  <span className="text-[10px] font-bold text-emerald-600">Verified</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AccessHubPage;
