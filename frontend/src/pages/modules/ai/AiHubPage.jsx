import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  Sparkles, Bot, Send, FileText, CheckCircle2, 
  AlertTriangle, Upload, RefreshCw, Cpu, Database, 
  Layers, ArrowRight, Zap, Check, Eye
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";

export function AiHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "copilot";

  
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { sender: "assistant", text: "Greetings! I am your Chandra Precision Operations Intelligence Copilot. How can I assist with your supply chain, OEE metrics, or vendor audits today?" },
    { sender: "user", text: "What is our current CNC machining OEE across all cells and do we have any critical raw material shortages?" },
    { sender: "assistant", text: "CNC shop floor OEE is currently 86.4% across 8 active cells. However, SS316 50mm Round Bar stock is at 12 KGS (reorder threshold: 50 KGS). I recommend raising an automated PO to SAIL immediately." },
  ]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg = { sender: "user", text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");

    setTimeout(() => {
      setChatMessages(prev => [
        ...prev,
        { sender: "assistant", text: `I have analyzed your query regarding "${userMsg.text}". Telemetry metrics and ERP records indicate operations are operating within expected parameters. Let me know if you would like me to draft an action!` }
      ]);
    }, 600);
  };

  
  const [ocrBills, setOcrBills] = useState([
    { id: "OCR-081", vendor: "Steel Authority of India Ltd (SAIL)", invoiceNo: "SAIL-2026-9941", totalAmt: 955800, gstMatch: "100% Match (HSN 7222)", confidence: "99.4%", status: "Ready for Auto-Post" },
    { id: "OCR-082", vendor: "Sandvik Coromant Cutting Tools", invoiceNo: "SAN-88120", totalAmt: 218300, gstMatch: "100% Match (HSN 8208)", confidence: "98.8%", status: "Ready for Auto-Post" },
  ]);

  const handleAutoPost = (id) => {
    setOcrBills(prev => prev.map(b => b.id === id ? { ...b, status: "Posted to Purchase Book (GRN Linked)" } : b));
    toast.success(`OCR Bill ${id} verified and booked into financial accounts!`);
  };

  
  const insights = [
    { title: "Raw Material Reorder Anomaly", desc: "SS316 50mm steel bar consumption rate increased by 22% due to increased automotive batch size on Line 1.", impact: "High Priority", time: "2 hours ago" },
    { title: "Supplier Lead Time Optimization", desc: "Sandvik Coromant cutting tool deliveries average 2.8 days, 40% faster than contractual SLA.", impact: "Positive", time: "5 hours ago" },
    { title: "Spindle Thermal Load Recommendation", desc: "Mazak QuickTurn 250 operating at 92% continuous load. Recommend scheduling 30-minute coolant lubrication cycle at 16:00.", impact: "Preventive", time: "1 day ago" },
  ];

  const headersMap = {
    copilot: {
      tag: "Neural Intelligence",
      title: "Neural Operations Copilot",
      sub: "Context-aware AI conversational assistant querying real-time shop floor telemetry and accounts.",
    },
    ocr: {
      tag: "Computer Vision",
      title: "Vendor Bill OCR Deep Parser",
      sub: "Deep vision parser extracting line items, HSN codes, and GST amounts directly from supplier invoices.",
    },
    insights: {
      tag: "Predictive Analytics",
      title: "Strategic Enterprise Insights",
      sub: "Automated pattern discovery, preventive maintenance alerts, and supply chain bottlenecks.",
    },
    forecasting: {
      tag: "Neural Forecasting",
      title: "Predictive Demand & Inventory Forecasting",
      sub: "Time-series neural forecasting, machine learning seasonality decomposition, and automated safety stock reorder recommendations.",
    },
  };

  
  const [demandForecasts, setDemandForecasts] = useState([
    { sku: "FG-SHAFT-45 (CNC Turned Shaft 45mm)", forecastDemand: "1,250 PCS (+18% YoY)", confidence: "96.4%", historical30d: "1,060 PCS", bufferRequired: "220 PCS", recommendedPoDate: "2026-09-05", trend: "Strong Surge (Auto Sector)", model: "ARIMA-Transformer Ensemble" },
    { sku: "SA-BUSH-25 (Flange Bushing EN8)", forecastDemand: "840 PCS (-4% Seasonal)", confidence: "94.2%", historical30d: "875 PCS", bufferRequired: "100 PCS", recommendedPoDate: "2026-09-20", trend: "Stable Plateau", model: "Prophet Decomposition" },
    { sku: "RAW-SS316-50 (Stainless Bar 50mm)", forecastDemand: "4,800 KGS (+25%)", confidence: "97.8%", historical30d: "3,840 KGS", bufferRequired: "600 KGS", recommendedPoDate: "2026-08-30 (Urgent)", trend: "Critical Raw Shortage Alert", model: "DeepAR Multivariate" },
  ]);

  const currentHeader = headersMap[activeTab] || headersMap.copilot;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Sparkles className="h-6 w-6" strokeWidth={1.75} />
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

      
      {activeTab === "copilot" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Neural Operations Copilot Workspace</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Connected to Enterprise Database, Shop Floor Telemetry & GST Portals</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-teal-50 text-[#0F766E] border border-teal-200">
              Model: Gemini 2.5 Pro Ultra
            </span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 min-h-[300px] max-h-[420px] overflow-y-auto font-sans text-xs">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={cx("flex gap-3", msg.sender === "user" ? "justify-end" : "justify-start")}>
                {msg.sender === "assistant" && (
                  <div className="h-7 w-7 rounded-lg bg-[#0D9488] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div className={cx("p-3.5 rounded-xl max-w-xl shadow-xs leading-relaxed", msg.sender === "user" ? "bg-[#0D9488] text-white" : "bg-white text-slate-900 border border-slate-200")}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask Copilot e.g., 'Summarize overdue customer invoices > 30 days' or 'Draft PO for depleted raw materials'..."
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            />
            <button
              onClick={handleSendMessage}
              className="px-4 py-2.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" /> Dispatch
            </button>
          </div>
        </div>
      )}

      
      {activeTab === "ocr" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Deep Vision OCR Vendor Bill Ingestion</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Automated Parsing of Inward Tax Invoices</p>
            </div>
            <button
              onClick={() => toast.success("Upload dialog opened. Select PDF or Scanned PNG file.")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" /> Upload Supplier Invoice
            </button>
          </div>

          <div className="space-y-3">
            {ocrBills.map((b) => (
              <div key={b.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#0D9488]">{b.id}</span>
                    <span className="font-bold text-slate-900">· {b.vendor}</span>
                  </div>
                  <p className="text-slate-600 mt-1 font-mono">Invoice: {b.invoiceNo} · Total: ₹{Number(b.totalAmt || 0).toLocaleString()} · GST Match: {b.gstMatch}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">OCR Confidence Score: {b.confidence}</p>
                </div>

                <div className="flex items-center gap-3">
                  {b.status.includes("Ready") ? (
                    <button
                      onClick={() => handleAutoPost(b.id)}
                      className="px-3 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" /> Auto-Book to Accounts
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ✓ {b.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      
      {activeTab === "insights" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Strategic Enterprise Intelligence & Anomalies</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Automated Multi-Module Pattern Discovery</p>
            </div>
          </div>

          <div className="space-y-3">
            {insights.map((ins, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">{ins.title}</h3>
                  <span className={cx("text-[10px] font-bold px-2 py-0.5 rounded-full border", ins.impact === "High Priority" ? "bg-rose-50 text-rose-800 border-rose-200" : "bg-teal-50 text-[#0F766E] border-teal-200")}>
                    {ins.impact}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{ins.desc}</p>
                <p className="text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-200">{ins.time}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === "forecasting" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Neural Demand & Stock Reorder Forecasting</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Machine Learning 90-Day Consumption Horizon, Seasonality Modeling & Buffer Reorder Triggers</p>
            </div>
            <button
              onClick={() => toast.success("Refreshed time-series neural forecasting model weights")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Recompute Forecasts
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Component / Material SKU</th>
                  <th className="py-2.5 px-3">Predicted Demand (90D)</th>
                  <th className="py-2.5 px-3 text-center">AI Confidence</th>
                  <th className="py-2.5 px-3">Historical 30D Velocity</th>
                  <th className="py-2.5 px-3">Buffer Stock Required</th>
                  <th className="py-2.5 px-3">Recommended PO Trigger</th>
                  <th className="py-2.5 px-3">Demand Pattern</th>
                  <th className="py-2.5 px-3 text-center">Neural Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {demandForecasts.map((df, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{df.sku}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{df.forecastDemand}</td>
                    <td className="py-3 px-3 text-center font-black text-[#0D9488]">{df.confidence}</td>
                    <td className="py-3 px-3 text-slate-600">{df.historical30d}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{df.bufferRequired}</td>
                    <td className={cx("py-3 px-3 font-mono font-bold text-[11px]", df.recommendedPoDate.includes("Urgent") ? "text-rose-600" : "text-slate-800")}>
                      {df.recommendedPoDate}
                    </td>
                    <td className="py-3 px-3 text-slate-700">{df.trend}</td>
                    <td className="py-3 px-3 text-center font-mono text-[10px] text-slate-500">{df.model}</td>
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

export default AiHubPage;
