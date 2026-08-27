import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Store, ShoppingCart, CreditCard, RefreshCw, Plus, Search, 
  Tag, CheckCircle2, AlertTriangle, ArrowRight, UserCheck, 
  Smartphone, Barcode, Gift, Sparkles, Globe, Layers, Receipt, 
  PackageCheck, DollarSign, Clock, Check, X
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";

export function RetailHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "pos";

  
  const [cartItems, setCartItems] = useState([
    { id: "SKU-001", name: "Precision Stainless Shaft 45mm", price: 1450, qty: 2, gst: 18 },
    { id: "SKU-002", name: "Hardened Flange Bushing EN8", price: 620, qty: 4, gst: 18 },
    { id: "SKU-003", name: "Hex Bolt M12x50 High Tensile", price: 45, qty: 20, gst: 18 },
  ]);
  const [posCustomer, setPosCustomer] = useState("Walk-in Retail Client");
  const [paymentMode, setPaymentMode] = useState("UPI / QR Code");

  const posSubtotal = cartItems.reduce((acc, it) => acc + it.price * it.qty, 0);
  const posTax = posSubtotal * 0.18;
  const posTotal = posSubtotal + posTax;

  const handleCheckout = () => {
    toast.success(`POS Receipt generated for ${fmtMoney(posTotal)} via ${paymentMode}!`);
    setCartItems([]);
  };

  
  const [stores, setStores] = useState([
    { id: "STR-01", name: "Pune Industrial Showroom & Retail Outlet", location: "Bhosari MIDC, Pune", manager: "Aniket Joshi", registers: 3, dailySales: 184500, status: "Open / Active" },
    { id: "STR-02", name: "Mumbai Parts Depot & Express Counter", location: "Andheri East, Mumbai", manager: "Pranav Shah", registers: 2, dailySales: 242000, status: "Open / Active" },
    { id: "STR-03", name: "Bengaluru Technology Corridor Store", location: "Peenya Industrial Area", manager: "Deepa Rao", registers: 2, dailySales: 135400, status: "Open / Active" },
  ]);

  
  const [omniStock, setOmniStock] = useState([
    { sku: "SKU-001", name: "Precision Stainless Shaft 45mm", storeA: 45, storeB: 30, storeC: 18, onlineReserved: 25, centralWarehouse: 450 },
    { sku: "SKU-002", name: "Hardened Flange Bushing EN8", storeA: 120, storeB: 85, storeC: 40, onlineReserved: 60, centralWarehouse: 1200 },
    { sku: "SKU-003", name: "Hex Bolt M12x50 High Tensile", storeA: 800, storeB: 650, storeC: 300, onlineReserved: 400, centralWarehouse: 8500 },
    { sku: "SKU-004", name: "Carbide Turning Inserts CNMG", storeA: 15, storeB: 12, storeC: 8, onlineReserved: 10, centralWarehouse: 250 },
  ]);

  
  const [subscriptions, setSubscriptions] = useState([
    { id: "SUB-801", customer: "Thermax Energy Systems", plan: "Quarterly CNC Tooling Replenishment", mrr: 85000, cycle: "Quarterly", nextBilling: "2026-10-01", status: "Active" },
    { id: "SUB-802", customer: "Kirloskar Oil Engines", plan: "Monthly Coolant & Consumables Pack", mrr: 42000, cycle: "Monthly", nextBilling: "2026-09-01", status: "Active" },
    { id: "SUB-803", customer: "Bajaj Auto Vendor Cell", plan: "Annual Metrology Calibration Retainer", mrr: 120000, cycle: "Annual", nextBilling: "2027-01-15", status: "Active" },
  ]);

  
  const [marketplaces, setMarketplaces] = useState([
    { platform: "Shopify B2B Portal", storeUrl: "shop.chandraprecision.com", syncedOrders: 142, lastSync: "2 mins ago", syncStatus: "Connected & Synced", health: "Healthy" },
    { platform: "Amazon Business (India)", storeUrl: "Merchant ID: A2ZCHANDRA", syncedOrders: 89, lastSync: "15 mins ago", syncStatus: "Connected & Synced", health: "Healthy" },
    { platform: "IndiaMART Verified Lead Sync", storeUrl: "indiamart.com/chandraprecision", syncedOrders: 310, lastSync: "Just now", syncStatus: "Real-time Webhook Active", health: "Healthy" },
  ]);

  
  const [promotions, setPromotions] = useState([
    { code: "AUTOEXPO2026", title: "Auto Expo 10% Trade Discount", discountType: "Percentage (10%)", minOrder: 50000, usageCount: 48, maxUses: 200, validUntil: "2026-12-31", status: "Active" },
    { code: "FREESHIP50K", title: "Free Express Freight on Bulk Orders", discountType: "100% Freight Waiver", minOrder: 50000, usageCount: 112, maxUses: 500, validUntil: "2026-11-30", status: "Active" },
    { code: "TIER1LOYALTY", title: "Gold Tier Preferred Partner Rebate", discountType: "Cashback (5%)", minOrder: 100000, usageCount: 29, maxUses: 100, validUntil: "2026-12-31", status: "Active" },
  ]);

  const headersMap = {
    pos: {
      tag: "Point-of-Sale Terminal",
      title: "Point-of-Sale (POS) Checkout Console",
      sub: "Rapid counter checkout, barcode item scanning, multi-tender split payments, and instant GST invoice thermal printing.",
    },
    stores: {
      tag: "Store Management",
      title: "Store Management & Register Controls",
      sub: "Manage multiple retail branches, cashier shifts, daily opening/closing registers, and cash drawer reconciliations.",
    },
    omnichannel: {
      tag: "Omnichannel Fulfillment",
      title: "Omnichannel Inventory & Store Stock",
      sub: "Real-time unified visibility across retail stores, warehouse safety buffers, and digital click-and-collect fulfillment.",
    },
    subscriptions: {
      tag: "Recurring Commerce",
      title: "Subscription & Recurring Billing",
      sub: "Automated recurring retainers, subscription lifecycle management, churn monitoring, and recurring payment schedules.",
    },
    ecommerce: {
      tag: "Digital Commerce",
      title: "E-commerce & Marketplace Connectors",
      sub: "Bi-directional catalog and order synchronization across Shopify, Amazon Business, and B2B digital storefronts.",
    },
    loyalty: {
      tag: "Customer Engagement",
      title: "Loyalty & Promotions Engine",
      sub: "Configurable discount coupon rules, trade customer tier rewards, volume promo campaigns, and loyalty points.",
    },
  };

  const currentHeader = headersMap[activeTab] || headersMap.pos;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Store className="h-6 w-6" strokeWidth={1.75} />
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

      
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Barcode className="h-5 w-5 text-[#0D9488]" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Active POS Register Cart</h2>
                </div>
                <button 
                  onClick={() => {
                    const newItem = { id: `SKU-00${cartItems.length + 1}`, name: "CNC Turning Insert Pack", price: 1850, qty: 1, gst: 18 };
                    setCartItems([...cartItems, newItem]);
                    toast.success("Added item to cart");
                  }}
                  className="px-3 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Scan / Add SKU
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Item Details</th>
                      <th className="py-2.5 px-3">Unit Price</th>
                      <th className="py-2.5 px-3">Quantity</th>
                      <th className="py-2.5 px-3">GST Rate</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {cartItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{item.id}</p>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700">{fmtMoney(item.price)}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                if (item.qty > 1) {
                                  setCartItems(cartItems.map(it => it.id === item.id ? { ...it, qty: it.qty - 1 } : it));
                                }
                              }}
                              className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs"
                            >-</button>
                            <span className="font-bold text-slate-900 w-6 text-center">{item.qty}</span>
                            <button 
                              onClick={() => {
                                setCartItems(cartItems.map(it => it.id === item.id ? { ...it, qty: it.qty + 1 } : it));
                              }}
                              className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs"
                            >+</button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-semibold">{item.gst}%</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {fmtMoney(item.price * item.qty)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button 
                            onClick={() => setCartItems(cartItems.filter(it => it.id !== item.id))}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {cartItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-medium text-xs">
                          Cart is currently empty. Scan a barcode or click Add SKU.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                Order Billing Summary
              </h2>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Customer Name / Mobile</label>
                  <input 
                    type="text" 
                    value={posCustomer}
                    onChange={(e) => setPosCustomer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-[#0D9488] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">Payment Tender Method</label>
                  <select 
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-1 focus:ring-[#0D9488] outline-none"
                  >
                    <option>UPI / QR Code</option>
                    <option>Credit / Debit Card (POS Swiper)</option>
                    <option>Cash Tender</option>
                    <option>Commercial Credit Account (30 Days)</option>
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between text-slate-500">
                    <span>Taxable Subtotal:</span>
                    <span className="font-semibold text-slate-700">{fmtMoney(posSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>GST (CGST 9% + SGST 9%):</span>
                    <span className="font-semibold text-slate-700">{fmtMoney(posTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                    <span>Grand Total:</span>
                    <span className="text-[#0D9488]">{fmtMoney(posTotal)}</span>
                  </div>
                </div>

                <button 
                  disabled={cartItems.length === 0}
                  onClick={handleCheckout}
                  className="w-full mt-4 py-3 bg-[#0D9488] hover:bg-[#0F766E] disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Receipt className="h-4 w-4" /> Complete POS Sale & Print Tax Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {activeTab === "stores" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Retail Stores & Showroom Locations</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">3 Active Outlets · Multi-Register Cash Reconciliation</p>
            </div>
            <button 
              onClick={() => toast.success("New store profile configured")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Store Location
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stores.map((store) => (
              <div key={store.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded font-mono text-[10px] font-bold">
                      {store.id}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{store.name}</h3>
                    <p className="text-xs text-slate-500">{store.location}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold">
                    {store.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Store Manager</p>
                    <p className="font-bold text-slate-800">{store.manager}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Registers</p>
                    <p className="font-bold text-slate-800">{store.registers} Active Lanes</p>
                  </div>
                  <div className="col-span-2 pt-1">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Today's Revenue</p>
                    <p className="font-black text-[#0D9488] text-sm">{fmtMoney(store.dailySales)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "omnichannel" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Omnichannel Stock & Buffer Allocation</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Real-time store availability, digital order reserve, and central warehouse buffer</p>
            </div>
            <button 
              onClick={() => toast.success("Omnichannel stock balances synced with ERP inventory")}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Rebalance Stores
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Item / SKU</th>
                  <th className="py-2.5 px-3 text-center">Pune Showroom</th>
                  <th className="py-2.5 px-3 text-center">Mumbai Depot</th>
                  <th className="py-2.5 px-3 text-center">Bengaluru Hub</th>
                  <th className="py-2.5 px-3 text-center">Online Reserved</th>
                  <th className="py-2.5 px-3 text-right">Central Warehouse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {omniStock.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900">{row.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{row.sku}</p>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">{row.storeA} PCS</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">{row.storeB} PCS</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">{row.storeC} PCS</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-bold text-[10px]">
                        {row.onlineReserved} PCS
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{row.centralWarehouse} PCS</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "subscriptions" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Subscription & Recurring Contracts Console</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Automated recurring billing cycles, MRR tracking, and SLA renewals</p>
            </div>
            <button 
              onClick={() => toast.success("Added new customer subscription plan")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> New Subscription
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Subscription ID</th>
                  <th className="py-2.5 px-3">Customer Account</th>
                  <th className="py-2.5 px-3">Plan / Contract Scope</th>
                  <th className="py-2.5 px-3 text-right">Recurring Value</th>
                  <th className="py-2.5 px-3">Cadence</th>
                  <th className="py-2.5 px-3">Next Scheduled Invoice</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{sub.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{sub.customer}</td>
                    <td className="py-3 px-3 text-slate-700">{sub.plan}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{fmtMoney(sub.mrr)}</td>
                    <td className="py-3 px-3 text-slate-600">{sub.cycle}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{sub.nextBilling}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {sub.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "ecommerce" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">E-Commerce & Digital Marketplace Integrations</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Bidirectional real-time sync with Amazon Business, Shopify B2B, and IndustryBuy</p>
            </div>
            <button 
              onClick={() => toast.success("Marketplace webhooks listening & all catalogs synchronized")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Sync Marketplace Feeds
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {marketplaces.map((m, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#0D9488]" />
                    <span className="font-bold text-xs text-slate-900">{m.platform}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                    {m.health}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 space-y-1">
                  <p className="truncate">URL: {m.storeUrl}</p>
                  <p>Orders Synced Today: <strong className="text-slate-900">{m.syncedOrders}</strong></p>
                  <p>Last Activity: {m.lastSync}</p>
                </div>
                <div className="pt-2 border-t border-slate-200 text-xs text-[#0D9488] font-semibold flex items-center gap-1">
                  <Check className="h-3 w-3" /> {m.syncStatus}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "loyalty" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Loyalty Programs & Promotional Matrix</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Discount coupons, volume price rules, and trade partner rewards</p>
            </div>
            <button 
              onClick={() => toast.success("New promo campaign published")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create Promo Rule
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Promo Code</th>
                  <th className="py-2.5 px-3">Campaign Title</th>
                  <th className="py-2.5 px-3">Benefit Type</th>
                  <th className="py-2.5 px-3">Min Order Value</th>
                  <th className="py-2.5 px-3">Redemption Usage</th>
                  <th className="py-2.5 px-3">Validity</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {promotions.map((promo, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <span className="px-2 py-1 bg-teal-50 border border-teal-200 text-[#0F766E] font-mono font-bold rounded">
                        {promo.code}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">{promo.title}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{promo.discountType}</td>
                    <td className="py-3 px-3 text-slate-700">{fmtMoney(promo.minOrder)}</td>
                    <td className="py-3 px-3">
                      <span className="text-slate-900 font-bold">{promo.usageCount}</span> / {promo.maxUses} uses
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">{promo.validUntil}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {promo.status}
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

export default RetailHubPage;
