import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  FileCheck, FileText, CheckCircle2, AlertTriangle, 
  Plus, Search, Clock, ArrowRight, ShieldCheck, 
  FileSignature, FolderTree, GitBranch, Lock, Download, 
  ExternalLink, Check, X, RefreshCw, Layers, UserCheck
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";

export function DocumentHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "dms";

  
  const [documents, setDocuments] = useState([
    { id: "DOC-2026-001", name: "IATF 16949 Quality Manual & Procedures.pdf", category: "Quality & Metrology", folder: "/Engineering/Standards", version: "v4.2", size: "4.8 MB", updatedBy: "Ramesh Shinde", updatedDate: "2026-08-20", status: "Controlled Copy" },
    { id: "DOC-2026-002", name: "Master Vendor Supply Agreement - SAIL 2026.pdf", category: "Legal & Procurement", folder: "/Procurement/Contracts", version: "v2.0", size: "2.1 MB", updatedBy: "Suresh Patil", updatedDate: "2026-08-15", status: "Signed & Locked" },
    { id: "DOC-2026-003", name: "Bhosari Plant Factory License Renewal Certificate.pdf", category: "Statutory Compliance", folder: "/Corporate/Compliance", version: "v1.0", size: "1.4 MB", updatedBy: "Pooja Kulkarni", updatedDate: "2026-08-10", status: "Active Statutory" },
    { id: "DOC-2026-004", name: "CNC Mazak QT250 Engineering Blueprints.dwg", category: "R&D / CAD", folder: "/Engineering/Drawings", version: "v3.1", size: "18.5 MB", updatedBy: "Santosh Mane", updatedDate: "2026-08-22", status: "Draft Approved" },
  ]);

  
  const [workflows, setWorkflows] = useState([
    { id: "WF-01", name: "Purchase Order Approval (PO > ₹50,000)", trigger: "PO Creation", steps: "HOD Review → Finance Controller → MD Authorization", sla: "24 Hours", activeInstances: 4, status: "Active Production" },
    { id: "WF-02", name: "Engineering Change Order (ECO/ECN)", trigger: "Drawing Revision", steps: "Design Engineer → Quality Lead → Plant Head Sign-off", sla: "48 Hours", activeInstances: 2, status: "Active Production" },
    { id: "WF-03", name: "Customer Credit Limit Increase (> ₹10L)", trigger: "Credit Review", steps: "Sales Lead → Accounts Head → Director Approval", sla: "12 Hours", activeInstances: 1, status: "Active Production" },
    { id: "WF-04", name: "Vendor Onboarding & Statutory Audit", trigger: "New Supplier", steps: "Procurement → Quality Audit → GST & Bank Validation", sla: "72 Hours", activeInstances: 3, status: "Active Production" },
  ]);

  
  const [contracts, setContracts] = useState([
    { id: "CNT-2026-08", title: "Automotive Precision Component Supply Agreement", party: "Tata Motors Precision Component Div", domain: "Sales & Commercial", value: 14500000, start: "2026-04-01", end: "2027-03-31", renewalNotice: "60 Days Prior", status: "Active (Executing)" },
    { id: "CNT-2026-09", title: "Annual Coolant & Industrial Lubricants Supply", party: "Castrol Industrial Lubricants Ltd", domain: "Procurement / SRM", value: 2400000, start: "2026-01-01", end: "2026-12-31", renewalNotice: "30 Days Prior", status: "Active (Executing)" },
    { id: "CNT-2026-10", title: "Plant Industrial Real Estate Lease Agreement", party: "MIDC Bhosari Industrial Estate", domain: "Real Estate & Legal", value: 3600000, start: "2024-04-01", end: "2029-03-31", renewalNotice: "90 Days Prior", status: "Active (Executing)" },
  ]);

  
  const [signatures, setSignatures] = useState([
    { id: "SIG-991", docTitle: "Purchase Order PO-2026-0042 (SAIL)", signer: "Chandra Shekhar (MD)", service: "Aadhaar eSign / DSC Class 3", signedAt: "2026-08-25 14:30", hash: "SHA256: 4f9a...8b12", status: "Cryptographically Verified" },
    { id: "SIG-992", docTitle: "Sales Contract SO-2026-0034 (Tata Motors)", signer: "Rajesh Nair (Procurement Lead)", service: "DocuSign Enterprise API", signedAt: "2026-08-24 11:15", hash: "SHA256: 9e3d...44c1", status: "Cryptographically Verified" },
    { id: "SIG-993", docTitle: "Employment Agreement - CNC Lead Machinist", signer: "Santosh Mane", service: "OTP Verified Digital Consent", signedAt: "2026-08-22 09:45", hash: "SHA256: 11a0...99f0", status: "Cryptographically Verified" },
  ]);

  const headersMap = {
    dms: {
      tag: "Document Management",
      title: "Document Management System (DMS)",
      sub: "Centralized enterprise document vault with strict role-based folder permissions, metadata tagging, and revision history.",
    },
    workflows: {
      tag: "Process Automation",
      title: "Configurable Workflow & Approval Engine",
      sub: "Design multi-tier conditional approval pipelines, SLA escalations, and automated task assignments across modules.",
    },
    contracts: {
      tag: "Contract Governance",
      title: "Contract Lifecycle Management (CLM)",
      sub: "Universal enterprise contract repository across Sales, Sourcing, Real Estate, and Employment with automated expiry alerts.",
    },
    esign: {
      tag: "Digital Trust",
      title: "E-Signature & Digital Signing Engine",
      sub: "Statutory Class 3 DSC, Aadhaar eSign, and DocuSign integration with cryptographic audit verification logs.",
    },
  };

  const currentHeader = headersMap[activeTab] || headersMap.dms;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <FileCheck className="h-6 w-6" strokeWidth={1.75} />
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

      
      {activeTab === "dms" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Enterprise Document Repository</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Controlled Engineering Drawings · Contracts · Compliance Manuals</p>
            </div>
            <button 
              onClick={() => toast.success("Document uploaded to DMS vault")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Upload Document
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Document Title</th>
                  <th className="py-2.5 px-3">Category / Domain</th>
                  <th className="py-2.5 px-3">Folder Path</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Updated By</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#0D9488] flex-shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900">{doc.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{doc.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{doc.category}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{doc.folder}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">{doc.version}</td>
                    <td className="py-3 px-3 text-slate-600">{doc.size}</td>
                    <td className="py-3 px-3 text-slate-700">
                      <p className="font-semibold">{doc.updatedBy}</p>
                      <p className="text-[10px] text-slate-400">{doc.updatedDate}</p>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded-full font-bold text-[10px]">
                        {doc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "workflows" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Active Workflow Pipelines</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Multi-tier conditional approvals and automated escalation rules</p>
            </div>
            <button 
              onClick={() => toast.success("New workflow definition template created")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create Workflow
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workflows.map((wf) => (
              <div key={wf.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded font-mono text-[10px] font-bold">
                      {wf.id}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{wf.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                    {wf.status}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 text-xs space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Approval Routing Steps</p>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-[#0D9488]" /> {wf.steps}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">SLA Resolution</p>
                    <p className="font-bold text-slate-800">{wf.sla}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Active Tasks in Queue</p>
                    <p className="font-bold text-[#0D9488]">{wf.activeInstances} In Flight</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      
      {activeTab === "contracts" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Contract Lifecycle Registry</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Commercial Contracts · Supplier Agreements · Lease Escrows</p>
            </div>
            <button 
              onClick={() => toast.success("New enterprise contract registered")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> New Contract
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Contract Ref</th>
                  <th className="py-2.5 px-3">Counterparty</th>
                  <th className="py-2.5 px-3">Domain</th>
                  <th className="py-2.5 px-3">Contract Value</th>
                  <th className="py-2.5 px-3">Tenure Period</th>
                  <th className="py-2.5 px-3">Renewal SLA</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {contracts.map((cnt) => (
                  <tr key={cnt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{cnt.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{cnt.party}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{cnt.domain}</td>
                    <td className="py-3 px-3 font-black text-slate-900">{fmtMoney(cnt.value)}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{cnt.start} to {cnt.end}</td>
                    <td className="py-3 px-3 text-slate-600">{cnt.renewalNotice}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {cnt.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "esign" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">E-Signature Audit Ledger & DSC Status</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Aadhaar eSign · Class 3 DSC · Cryptographic hash validation</p>
            </div>
            <button 
              onClick={() => toast.success("Initiated digital signing request with DSC provider")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileSignature className="h-4 w-4" /> Request E-Sign
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Signing Log ID</th>
                  <th className="py-2.5 px-3">Document Subject</th>
                  <th className="py-2.5 px-3">Authorized Signatory</th>
                  <th className="py-2.5 px-3">Signing Gateway</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 font-mono">SHA-256 Hash</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {signatures.map((sig) => (
                  <tr key={sig.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{sig.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{sig.docTitle}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{sig.signer}</td>
                    <td className="py-3 px-3 text-slate-600">{sig.service}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{sig.signedAt}</td>
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-500">{sig.hash}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {sig.status}
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

export default DocumentHubPage;
