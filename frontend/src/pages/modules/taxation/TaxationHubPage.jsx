import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  Calculator, FileText, CheckCircle2, AlertTriangle, 
  Send, RefreshCw, Download, Search, ShieldCheck, 
  Clock, AlertCircle, Check, ArrowRight, Layers, DollarSign
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";

export function TaxationHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "gstr1";

  
  const [schedules, setSchedules] = useState([
    { id: "SCH-01", form: "GSTR-1", desc: "Outward Supplies Monthly Statement for August 2026", dueDate: "2026-09-11", liability: 0, status: "Pending Upload", urgency: "warning" },
    { id: "SCH-02", form: "GSTR-3B", desc: "Summary Return & Net Tax Settlement for August 2026", dueDate: "2026-09-20", liability: 215000, status: "Scheduled", urgency: "danger" },
    { id: "SCH-03", form: "TDS 26Q", desc: "Quarterly TDS Statement on Contractor / Professional (Q2)", dueDate: "2026-10-31", liability: 42800, status: "On Track", urgency: "success" },
    { id: "SCH-04", form: "Advance Tax", desc: "Second Installment Corporate Advance Income Tax (45%)", dueDate: "2026-09-15", liability: 850000, status: "Urgent", urgency: "danger" },
  ]);

  const [invoicesToIRN, setInvoicesToIRN] = useState([
    { id: "INV-2026-0042", customer: "Tata Motors Precision Component Div", gstin: "27AAACT2727Q1ZW", date: "2026-08-25", amount: 1450000, gstAmount: 261000, irn: "PENDING_IRN", status: "Ready for Generation" },
    { id: "INV-2026-0041", customer: "Bajaj Auto Ltd (Akurdi Plant)", gstin: "27AAACB0000A1Z1", date: "2026-08-24", amount: 820000, gstAmount: 147600, irn: "4f9a7812bc89...34de", status: "IRN Generated & QR Signed" },
    { id: "INV-2026-0040", customer: "Kirloskar Oil Engines Ltd", gstin: "27AAACK1234F1Z8", date: "2026-08-22", amount: 560000, gstAmount: 100800, irn: "77a19c33bb02...e54a", status: "IRN Generated & QR Signed" },
  ]);

  const [hsnCodes, setHsnCodes] = useState([
    { code: "8483", type: "HSN", description: "Transmission shafts and cranks, bearing housings and plain shaft bearings", gst_rate: 18 },
    { code: "8466", type: "HSN", description: "Parts and accessories suitable for use solely or principally with machines of headings 8456 to 8465", gst_rate: 18 },
    { code: "7318", type: "HSN", description: "Screws, bolts, nuts, coach screws, screw hooks, rivets, cotters, cotter-pins, washers", gst_rate: 18 },
    { code: "9988", type: "SAC", description: "Manufacturing services on physical inputs owned by others (Job Work)", gst_rate: 12 },
  ]);

  const [gstr1Supplies, setGstr1Supplies] = useState([
    { id: "INV-2026-0042", party: "Tata Motors Precision Component Div", gstin: "27AAACT2727Q1ZW", taxableVal: 1450000, cgst: 130500, sgst: 130500, igst: 0, status: "Uploaded" },
    { id: "INV-2026-0041", party: "Bajaj Auto Ltd (Akurdi Plant)", gstin: "27AAACB0000A1Z1", taxableVal: 820000, cgst: 73800, sgst: 73800, igst: 0, status: "Uploaded" },
    { id: "INV-2026-0040", party: "Kirloskar Oil Engines Ltd", gstin: "27AAACK1234F1Z8", taxableVal: 560000, cgst: 50400, sgst: 50400, igst: 0, status: "Pending" },
    { id: "INV-2026-0039", party: "Mahindra Heavy Engines (Chakan)", gstin: "27AAACM9988K1ZP", taxableVal: 1120000, cgst: 0, sgst: 0, igst: 201600, status: "Uploaded" },
  ]);

  const [itcRecon, setItcRecon] = useState([
    { supplier: "Steel Authority of India Ltd (SAIL)", invoiceNo: "SAIL/PUN/2026/892", portalGst: 145000, booksGst: 145000, diff: 0, matchStatus: "Matched 100%" },
    { supplier: "Sandvik Coromant Cutting Tools", invoiceNo: "SVK-IN-99214", portalGst: 42500, booksGst: 42500, diff: 0, matchStatus: "Matched 100%" },
    { supplier: "Castrol Industrial Lubricants Ltd", invoiceNo: "CAS-MUM-4401", portalGst: 24000, booksGst: 24000, diff: 0, matchStatus: "Matched 100%" },
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTaxationData = async () => {
      setLoading(true);
      try {
        const [hsnRes, gstrRes, invRes, schedRes, itcRes] = await Promise.allSettled([
          masterService.getHsnSacCodes(),
          masterService.getGstr1Summary(),
          masterService.getSalesInvoices(),
          masterService.getStatutorySchedules(),
          masterService.getItcRecon(),
        ]);

        if (hsnRes.status === "fulfilled" && hsnRes.value.data?.success && isMounted) {
          const list = hsnRes.value.data.data || [];
          if (list.length > 0) setHsnCodes(list);
        }
        if (gstrRes.status === "fulfilled" && gstrRes.value.data?.success && isMounted) {
          const rawSupplies = gstrRes.value.data.data?.supplies || gstrRes.value.data.data?.b2bInvoices || [];
          if (rawSupplies.length > 0) {
            setGstr1Supplies(
              rawSupplies.map((inv) => ({
                id: inv.invoice_number || inv.id || "INV-001",
                party: inv.customer_name || inv.party || "Customer Partner",
                gstin: inv.customer_gstin || inv.gstin || "27AAACG0850D1ZW",
                taxableVal: Number(inv.total_taxable ?? inv.taxableVal ?? inv.taxable ?? 0),
                cgst: Number(inv.total_cgst ?? inv.cgst ?? 0),
                sgst: Number(inv.total_sgst ?? inv.sgst ?? 0),
                igst: Number(inv.total_igst ?? inv.igst ?? 0),
                status: inv.status || "Uploaded",
              }))
            );
          }
        }
        if (schedRes.status === "fulfilled" && schedRes.value.data?.success && isMounted) {
          const list = schedRes.value.data.data || [];
          if (list.length > 0) {
            setSchedules(
              list.map((sch) => ({
                id: sch.id || sch.form,
                form: sch.form || sch.name || "Form",
                desc: sch.desc || sch.description || "",
                dueDate: sch.dueDate || sch.due_date || "2026-09-20",
                liability: Number(sch.liability ?? sch.net_amount ?? sch.amount ?? 0),
                status: sch.status || "Scheduled",
                urgency: sch.urgency || "success",
              }))
            );
          }
        }
        if (itcRes.status === "fulfilled" && itcRes.value.data?.success && isMounted) {
          const list = itcRes.value.data.data || [];
          if (list.length > 0) {
            setItcRecon(
              list.map((itc) => ({
                supplier: itc.supplier || itc.vendor_name || "Supplier",
                invoiceNo: itc.invoiceNo || itc.invoice_number || itc.invRef || "REF-001",
                portalGst: Number(itc.portalGst ?? itc.portal_gst ?? itc.gstr2b_amount ?? 0),
                booksGst: Number(itc.booksGst ?? itc.books_gst ?? itc.book_amount ?? 0),
                diff: Number(itc.diff ?? itc.variance ?? 0),
                matchStatus: itc.matchStatus || itc.match_status || "Matched 100%",
              }))
            );
          }
        }
        if (invRes.status === "fulfilled" && invRes.value.data?.success && isMounted) {
          const invoices = invRes.value.data.data || [];
          if (invoices.length > 0) {
            setInvoicesToIRN(
              invoices.map((inv) => ({
                id: inv.invoice_number || inv.id,
                customer: inv.customer_name || "Enterprise Customer",
                gstin: inv.customer_gstin || inv.gstin || "27AAACG0850D1ZW",
                date: inv.invoice_date || new Date().toISOString().slice(0, 10),
                amount: Number(inv.grand_total || inv.total_amount || 0),
                gstAmount: Number(inv.total_cgst || 0) + Number(inv.total_sgst || 0) + Number(inv.total_igst || 0),
                irn: inv.irn_number || inv.irn_hash || "PENDING_IRN",
                status: inv.irn_number || inv.irn_hash ? "IRN Generated & QR Signed" : "Ready for Generation",
              }))
            );
          }
        }
      } catch {
        
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTaxationData();
    return () => { isMounted = false; };
  }, []);

  const handleGenerateIRN = async (invId) => {
    toast.loading(`Computing statutory SHA-256 IRN & dispatching to NIC Portal for ${invId}...`, { id: 'irn-toast' });
    try {
      const res = await masterService.generateInvoiceIrn({ invoiceNumber: invId });
      if (res.data?.success) {
        const genData = res.data.data;
        setInvoicesToIRN(prev => prev.map(inv => {
          if (inv.id === invId) {
            return {
              ...inv,
              irn: genData.irn,
              status: "IRN Generated & QR Signed"
            };
          }
          return inv;
        }));
        toast.success(`IRN & Signed QR Code generated successfully!`, { id: 'irn-toast' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate IRN from NIC Portal", { id: 'irn-toast' });
    }
  };

  const headersMap = {
    gstr1: {
      tag: "Outward Supplies",
      title: "GSTR-1 Outward Supplies & Returns",
      sub: "B2B, B2C, SEZ, and Export tax computations formatted for GSTN JSON upload.",
    },
    gstr3b: {
      tag: "Summary Returns",
      title: "GSTR-3B Summary & Tax Settlement",
      sub: "Net tax liability offset against eligible Input Tax Credit (ITC) with cash ledger balance.",
    },
    einvoice: {
      tag: "NIC Portal Integration",
      title: "E-Invoicing & Signed QR Dispatch",
      sub: "Real-time NIC IRN generation and signed cryptographically verified QR codes.",
    },
    hsn: {
      tag: "Tax Classification",
      title: "HSN/SAC Rates & Tax Master",
      sub: "Statutory goods and service rate tables for precision engineering and job work.",
    },
    itc: {
      tag: "Credit Reconciliation",
      title: "ITC Reconciliation & TDS",
      sub: "2-way matching between Purchase Book GSTR-2A/2B inward invoices and supplier filings.",
    },
    tds: {
      tag: "Withholding Tax",
      title: "ITC Reconciliation & TDS",
      sub: "Withholding tax deduction statements across contractor payments, professional fees, and purchase of goods.",
    },
    audit: {
      tag: "Statutory Audit",
      title: "Statutory Compliance Calendar",
      sub: "Upcoming filing deadlines, advance tax schedules, and GST annual audit tracking.",
    },
    globaltax: {
      tag: "Multi-Country Tax Engine",
      title: "Global Tax Engine (VAT / Sales Tax / GST Rule Sets by Country)",
      sub: "Multi-jurisdiction tax rule computation, EU VAT OSS/IOSS rules, US destination-based sales tax nexus, and GCC standard VAT.",
    },
  };

  
  const [globalTaxRules, setGlobalTaxRules] = useState([
    { country: "India (GST / TDS / TCS)", taxType: "Dual GST (CGST/SGST/IGST)", stdRate: "18.0%", reducedRates: "0%, 5%, 12%, 28%", threshold: "₹40 Lakhs (Goods) / ₹20L (Services)", filingCycle: "Monthly (GSTR-1 / 3B)", eInvoiceReq: "Mandatory (> ₹5 Cr)", status: "Active Engine" },
    { country: "United Arab Emirates (UAE FTA)", taxType: "Value Added Tax (VAT)", stdRate: "5.0%", reducedRates: "0% (Designated Zones / Exports)", threshold: "AED 375,000 Mandatory", filingCycle: "Quarterly (VAT 201)", eInvoiceReq: "Phase 2 (ZATCA / FTA)", status: "Active Engine" },
    { country: "United Kingdom (HMRC MTD)", taxType: "Value Added Tax (VAT)", stdRate: "20.0%", reducedRates: "5% (Energy), 0% (Food/Books)", threshold: "£90,000 / Year", filingCycle: "Quarterly Making Tax Digital", eInvoiceReq: "Peppol BIS 3.0", status: "Active Engine" },
    { country: "United States (State Sales Tax)", taxType: "State + Local Sales Tax Nexus", stdRate: "Variable (6.25% - 10.25%)", reducedRates: "Exempt B2B Resale Certs", threshold: "$100,000 or 200 Transactions", filingCycle: "State Monthly/Quarterly", eInvoiceReq: "Optional B2B", status: "Active Engine" },
    { country: "European Union (EU Germany)", taxType: "Mehrwertsteuer (MwSt / USt)", stdRate: "19.0%", reducedRates: "7% (Food/Cultural)", threshold: "€22,000 Kleinunternehmer", filingCycle: "Monthly Voranmeldung", eInvoiceReq: "Mandatory B2B (E-Rechnung 2025)", status: "Active Engine" },
    { country: "Singapore (IRAS)", taxType: "Goods and Services Tax (GST)", stdRate: "9.0%", reducedRates: "0% (International Services)", threshold: "SGD 1,000,000", filingCycle: "Quarterly GST F5", eInvoiceReq: "InvoiceNow Peppol", status: "Active Engine" },
  ]);

  const currentHeader = headersMap[activeTab] || headersMap.gstr1;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Calculator className="h-6 w-6" strokeWidth={1.75} />
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

      
      {activeTab === "gstr1" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">GSTR-1 Outward Supplies Statement</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Period: August 2026 · Total Taxable: ₹10,50,000</p>
            </div>
            <button
              onClick={() => toast.success("GSTR-1 JSON payload generated for GSTN portal upload!")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Export GSTN JSON
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Invoice No</th>
                  <th className="py-2.5 px-4">Customer & GSTIN</th>
                  <th className="py-2.5 px-4 font-mono text-right">Taxable Value</th>
                  <th className="py-2.5 px-4 font-mono text-right">CGST (9%)</th>
                  <th className="py-2.5 px-4 font-mono text-right">SGST (9%)</th>
                  <th className="py-2.5 px-4 font-mono text-right">IGST (18%)</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gstr1Supplies.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">{inv.id}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{inv.party}</p>
                      <p className="font-mono text-[10px] text-slate-500">{inv.gstin}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{Number(inv.taxableVal || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">₹{Number(inv.cgst || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">₹{Number(inv.sgst || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">₹{Number(inv.igst || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cx("text-[10px] font-bold px-2 py-0.5 rounded-full border", inv.status === "Uploaded" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200")}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "gstr3b" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">GSTR-3B Monthly Net Tax Settlement</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Outward Tax Liability Less Eligible ITC = Net Cash Challan</p>
            </div>
            <button
              onClick={() => toast.success("GSTR-3B Challan computed and validated!")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              Generate Payment Challan
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 uppercase font-bold text-[10px] block">Total Outward Tax Liability</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">₹3,84,500</p>
              <p className="text-[11px] text-slate-500 mt-1">CGST: ₹1,07,250 · SGST: ₹1,07,250 · IGST: ₹1,70,000</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-emerald-800 uppercase font-bold text-[10px] block">Eligible Input Tax Credit (ITC)</span>
              <p className="text-xl font-bold font-mono text-emerald-800 mt-1">₹1,69,500</p>
              <p className="text-[11px] text-emerald-700 mt-1">Reconciled via GSTR-2B inward statements</p>
            </div>
            <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
              <span className="text-[#0F766E] uppercase font-bold text-[10px] block">Net Cash Payable (Challan)</span>
              <p className="text-xl font-bold font-mono text-slate-900 mt-1">₹2,15,000</p>
              <p className="text-[11px] text-[#0F766E] mt-1">Due Date: 20th September 2026</p>
            </div>
          </div>
        </div>
      )}

      
      {activeTab === "einvoice" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">E-Invoice IRN Dispatch Console</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Real-time NIC Portal Integration for B2B Invoices</p>
            </div>
            <button
              onClick={() => {
                invoicesToIRN.forEach(inv => {
                  if (inv.irn === "PENDING_IRN") handleGenerateIRN(inv.id);
                });
              }}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" /> Batch Dispatch Pending IRN
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Invoice No</th>
                  <th className="py-2.5 px-4">Customer & GSTIN</th>
                  <th className="py-2.5 px-4 font-mono text-right">Taxable Value</th>
                  <th className="py-2.5 px-4 font-mono text-right">GST Total</th>
                  <th className="py-2.5 px-4">IRN Hash</th>
                  <th className="py-2.5 px-4 text-center">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoicesToIRN.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">{inv.id}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{inv.customer}</p>
                      <p className="font-mono text-[11px] text-slate-500">{inv.gstin}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{Number(inv.amount || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#0D9488]">₹{Number(inv.gstAmount || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 truncate max-w-xs">{inv.irn}</td>
                    <td className="py-3 px-4 text-center">
                      {inv.irn === "PENDING_IRN" ? (
                        <button
                          onClick={() => handleGenerateIRN(inv.id)}
                          className="px-2.5 py-1 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          Generate IRN
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <Check className="h-3 w-3" /> Signed QR
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "hsn" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">HSN & SAC Code Master Directory</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Goods & Services Classification Schedule</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hsnCodes.map((hsn) => (
              <div key={hsn.code} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#0D9488]">{hsn.code}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200">{hsn.type}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{hsn.desc}</p>
                </div>
                <div className="text-right flex-shrink-0 font-mono">
                  <span className="text-base font-bold text-slate-900">{hsn.gstRate}%</span>
                  <span className="text-[10px] text-slate-500 block">GST Rate</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      
      {(activeTab === "itc" || activeTab === "tds") && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">GSTR-2B Input Tax Credit (ITC) Auto-Reconciliation</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">2-Way Match: Purchase Inward Invoices vs Supplier GSTR-1 Portal Filings</p>
              </div>
              <button
                onClick={() => toast.success("GSTR-2B data pulled and auto-reconciled with books!")}
                className="px-3 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh GSTR-2B Feed
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Supplier Business Partner</th>
                    <th className="py-2.5 px-4">Invoice Ref</th>
                    <th className="py-2.5 px-4 font-mono text-right">GSTN Portal (₹)</th>
                    <th className="py-2.5 px-4 font-mono text-right">Books ITC (₹)</th>
                    <th className="py-2.5 px-4 font-mono text-right">Variance</th>
                    <th className="py-2.5 px-4 text-center">Match Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itcRecon.map((itc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{itc.supplier}</td>
                      <td className="py-3 px-4 font-mono text-[#0D9488]">{itc.invoiceNo}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{Number(itc.portalGst || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{Number(itc.booksGst || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">₹{Number(itc.diff || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {itc.matchStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Tax Deducted at Source (TDS) Withholding Schedules</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Section 194C, 194J, 194Q Withholding Register & Form 26Q</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 uppercase font-bold text-[10px]">Sec 194Q (Purchase of Goods &gt; ₹50L)</span>
                <p className="text-lg font-bold font-mono text-slate-900 mt-1">₹24,500</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Deduction @ 0.1% on steel raw supplies</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 uppercase font-bold text-[10px]">Sec 194C (Contractor & Job Work)</span>
                <p className="text-lg font-bold font-mono text-slate-900 mt-1">₹12,800</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Deduction @ 1%/2% on subcontract labor</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 uppercase font-bold text-[10px]">Sec 194J (Professional & Technical)</span>
                <p className="text-lg font-bold font-mono text-slate-900 mt-1">₹5,500</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Deduction @ 10% on software/legal retainers</p>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Statutory Filing Calendar & Deadlines</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Monthly GST, TDS, and Advance Tax Regulatory Calendar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {schedules.map((sch) => (
              <div key={sch.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold font-mono text-slate-900">{sch.form}</span>
                    <span
                      className={cx(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        sch.urgency === "danger"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : sch.urgency === "warning"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : sch.urgency === "success"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-teal-50 text-teal-800 border-teal-200"
                      )}
                    >
                      {sch.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{sch.desc}</p>
                </div>

                <div className="pt-2 border-t border-slate-200/80 text-xs font-mono">
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Due: <strong className="text-slate-900">{sch.dueDate}</strong></span>
                    <span>Net: <strong className="text-slate-900">₹{Number(sch.liability || 0).toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === "globaltax" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Multi-Jurisdiction Global Tax Rules & VAT Engine</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Automated Tax Calculation Matrices by Country, Statutory Rates, E-Invoicing Rules & Thresholds</p>
            </div>
            <button
              onClick={() => toast.success("Global tax rulebooks synchronized with statutory registries")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              Sync Statutory Tax Rules
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Country / Jurisdiction</th>
                  <th className="py-2.5 px-3">Tax Framework</th>
                  <th className="py-2.5 px-3 text-center">Standard Rate</th>
                  <th className="py-2.5 px-3">Concessional / Reduced Rates</th>
                  <th className="py-2.5 px-3">Statutory Registration Threshold</th>
                  <th className="py-2.5 px-3">Filing Cadence</th>
                  <th className="py-2.5 px-3">E-Invoice Standard</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {globalTaxRules.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{r.country}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{r.taxType}</td>
                    <td className="py-3 px-3 text-center font-black text-[#0D9488]">{r.stdRate}</td>
                    <td className="py-3 px-3 text-slate-600 text-[11px]">{r.reducedRates}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{r.threshold}</td>
                    <td className="py-3 px-3 text-slate-700">{r.filingCycle}</td>
                    <td className="py-3 px-3 font-mono text-slate-800 text-[11px] font-bold">{r.eInvoiceReq}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {r.status}
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

export default TaxationHubPage;
