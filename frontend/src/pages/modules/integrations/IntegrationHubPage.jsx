import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Share2, Landmark, Globe, Layers, Zap, 
  CheckCircle2, AlertTriangle, Plus, Search, RefreshCw, 
  ExternalLink, Key, ShieldCheck, Activity, Terminal, ArrowRight,
  Check, X, Clock
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";

export function IntegrationHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "banking";

  
  const [bankApis, setBankApis] = useState([
    { id: "BNK-01", bank: "HDFC Corporate Direct Banking API", accountNo: "50200084920194", apiType: "Host-to-Host (H2H) / Open Banking", authStatus: "Token Active (OAuth2)", lastSync: "5 mins ago", balance: 18450000, status: "Live Synchronized" },
    { id: "BNK-02", bank: "ICICI Corporate CIB API Gateway", accountNo: "001205018842", apiType: "REST API Direct Settlement", authStatus: "Token Active (OAuth2)", lastSync: "12 mins ago", balance: 6050000, status: "Live Synchronized" },
    { id: "BNK-03", bank: "State Bank of India (SBI E-Pay Gateway)", accountNo: "38920198421", apiType: "SFTP Encrypted Statement Feed", authStatus: "Public Key Verified", lastSync: "Today, 06:00 AM", balance: 4200000, status: "Live Synchronized" },
  ]);

  
  const [connectors, setConnectors] = useState([
    { id: "CON-01", name: "Shopify B2B Storefront", channel: "Direct GraphQL Admin API", rateLimit: "40 req/sec", webhookStatus: "Listening (Port 443)", lastPayload: "Order #SH-9921", status: "Active (0 Errors)" },
    { id: "CON-02", name: "Amazon SP-API (Seller Partner)", channel: "AWS IAM SigV4 REST", rateLimit: "10 req/sec", webhookStatus: "SQS Event Queue", lastPayload: "Settlement Report 2026-08", status: "Active (0 Errors)" },
    { id: "CON-03", name: "WooCommerce Wholesale Portal", channel: "REST API v3", rateLimit: "15 req/sec", webhookStatus: "Listening (Port 443)", lastPayload: "Product SKU sync", status: "Active (0 Errors)" },
  ]);

  
  const [thirdParty, setThirdParty] = useState([
    { id: "EXT-01", name: "ClearTax GSTN / NIC E-Invoice API", category: "Tax Compliance", endpoint: "https://api.cleartax.in/v2/e-invoicing", latency: "142 ms", uptime: "99.98%", status: "Connected & Verified" },
    { id: "EXT-02", name: "Delhivery & BlueDart Freight Logistics", category: "Transport & Tracking", endpoint: "https://track.delhivery.com/c/api/pin-codes/json", latency: "98 ms", uptime: "99.95%", status: "Connected & Verified" },
    { id: "EXT-03", name: "Salesforce Enterprise CRM Sync", category: "Lead & Account Sync", endpoint: "https://chandraprec.my.salesforce.com/services/data/v58.0", latency: "210 ms", uptime: "100.0%", status: "Connected & Verified" },
    { id: "EXT-04", name: "Razorpay / Cashfree Payment Gateway", category: "Merchant Inward Payments", endpoint: "https://api.razorpay.com/v1/orders", latency: "65 ms", uptime: "99.99%", status: "Connected & Verified" },
  ]);

  
  const [webhooks, setWebhooks] = useState([
    { id: "EVT-8812", event: "sales_order.confirmed", endpoint: "https://api.chandraprecision.com/hooks/so-confirm", deliveryCount: 142, responseCode: 200, lastTrigger: "2 mins ago", status: "Delivered (Success)" },
    { id: "EVT-8811", event: "inventory.stock_critical_low", endpoint: "https://slack.com/api/webhooks/ops-alerts", deliveryCount: 8, responseCode: 200, lastTrigger: "15 mins ago", status: "Delivered (Success)" },
    { id: "EVT-8810", event: "invoice.irn_generated", endpoint: "https://api.chandraprecision.com/hooks/tax-irn", deliveryCount: 65, responseCode: 200, lastTrigger: "1 hour ago", status: "Delivered (Success)" },
    { id: "EVT-8809", event: "qc_inspection.ncr_raised", endpoint: "https://teams.microsoft.com/webhook/qa-lead", deliveryCount: 3, responseCode: 200, lastTrigger: "3 hours ago", status: "Delivered (Success)" },
  ]);

  const headersMap = {
    banking: {
      tag: "Open Banking",
      title: "Corporate Banking & Bank APIs",
      sub: "Direct HDFC, ICICI, and SBI host-to-host API connections for live bank reconciliation, balance polling, and instant RTGS payouts.",
    },
    connectors: {
      tag: "Digital Commerce Connectors",
      title: "E-Commerce & Marketplace Connectors",
      sub: "GraphQL and REST API adapters synchronizing orders, pricing rate cards, and inventory levels across digital channels.",
    },
    thirdparty: {
      tag: "External Ecosystem",
      title: "Third-Party System Integrations",
      sub: "Direct integrations with ClearTax (NIC IRN/EWB), Delhivery Logistics, Salesforce CRM, and payment aggregators.",
    },
    webhooks: {
      tag: "Event Streaming",
      title: "Webhook & Event Streaming Framework",
      sub: "Real-time pub/sub event emitters, payload inspection console, retry exponential backoff policies, and SSL verification.",
    },
  };

  const currentHeader = headersMap[activeTab] || headersMap.banking;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Share2 className="h-6 w-6" strokeWidth={1.75} />
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

      
      {activeTab === "banking" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Corporate Open Banking Connections</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Direct Host-to-Host (H2H) & OAuth2 Bank Statement Sync</p>
            </div>
            <button 
              onClick={() => toast.success("Live bank balances and statement feeds refreshed")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Poll Bank Balances
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bankApis.map((b) => (
              <div key={b.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-[#0D9488]" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{b.bank}</h3>
                      <p className="text-xs text-slate-500 font-mono">A/C: {b.accountNo}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">API Protocol:</span>
                    <span className="font-semibold text-slate-700">{b.apiType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Authentication:</span>
                    <span className="font-bold text-[#0F766E]">{b.authStatus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Last Synced:</span>
                    <span className="text-slate-600 font-mono">{b.lastSync}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80 flex justify-between items-baseline">
                    <span className="text-[11px] font-bold text-slate-700 uppercase">Live Balance:</span>
                    <span className="text-base font-black text-slate-900">{fmtMoney(b.balance)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      
      {activeTab === "connectors" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Active Marketplace API Connectors</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Bi-directional order capture and inventory decrement adapters</p>
            </div>
            <button 
              onClick={() => toast.success("New channel connector created")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Connector
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Connector Ref</th>
                  <th className="py-2.5 px-3">Integration Target</th>
                  <th className="py-2.5 px-3">Channel Protocol</th>
                  <th className="py-2.5 px-3">Rate Limit</th>
                  <th className="py-2.5 px-3">Webhook Listener</th>
                  <th className="py-2.5 px-3">Last Processed Payload</th>
                  <th className="py-2.5 px-3 text-center">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {connectors.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{c.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{c.channel}</td>
                    <td className="py-3 px-3 text-slate-600">{c.rateLimit}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{c.webhookStatus}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{c.lastPayload}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
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

      
      {activeTab === "thirdparty" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Third-Party SaaS & Government Gateways</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">ClearTax GSTN · Logistics Carriers · Payment Gateways · CRM</p>
            </div>
            <button 
              onClick={() => toast.success("Gateway handshake ping test passed for all 4 services")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" /> Test Handshake
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">System Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">API Endpoint</th>
                  <th className="py-2.5 px-3">Latency</th>
                  <th className="py-2.5 px-3">SLA Uptime</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {thirdParty.map((tp) => (
                  <tr key={tp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{tp.name}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{tp.category}</td>
                    <td className="py-3 px-3 font-mono text-[10px] text-slate-500">{tp.endpoint}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{tp.latency}</td>
                    <td className="py-3 px-3 font-bold text-[#0D9488]">{tp.uptime}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {tp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "webhooks" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Event Streaming & Outbound Webhook Subscriptions</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Real-time JSON payload dispatch with exponential retry policies</p>
            </div>
            <button 
              onClick={() => toast.success("New webhook subscription registered")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Webhook Target
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Event Topic</th>
                  <th className="py-2.5 px-3">Subscriber Webhook URL</th>
                  <th className="py-2.5 px-3">Deliveries</th>
                  <th className="py-2.5 px-3">HTTP Status</th>
                  <th className="py-2.5 px-3">Last Triggered</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {webhooks.map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-[#0F766E] font-mono font-bold rounded text-[11px]">
                        {wh.event}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{wh.endpoint}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{wh.deliveryCount} events</td>
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold rounded text-[10px]">
                        {wh.responseCode} OK
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{wh.lastTrigger}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {wh.status}
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

export default IntegrationHubPage;
