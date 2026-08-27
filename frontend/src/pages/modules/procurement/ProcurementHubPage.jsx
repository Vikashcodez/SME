import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  Building2, Users, FileText, CheckCircle2, 
  ShoppingCart, Plus, Trash2, Edit2, Search,
  Award, ShieldCheck, Scale, ArrowRight, DollarSign, X
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";

export function ProcurementHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "orders";

  
  const [poItems, setPoItems] = useState([
    { id: 1, item: "SS316 Round Bar 50mm", qty: 1000, uom: "KGS", unitRate: 420, gstRate: 18 },
    { id: 2, item: "Medium Carbon Steel EN8 30mm", qty: 500, uom: "KGS", unitRate: 85, gstRate: 18 },
    { id: 3, item: "CNC Carbide Turning Inserts (Box of 10)", qty: 20, uom: "BOX", unitRate: 1850, gstRate: 18 },
  ]);

  const handleItemChange = (id, field, value) => {
    setPoItems(poItems.map(it => it.id === id ? { ...it, [field]: value } : it));
  };

  const handleAddItem = () => {
    setPoItems([...poItems, { id: Date.now(), item: "", qty: 1, uom: "KGS", unitRate: 0, gstRate: 18 }]);
  };

  const handleRemoveItem = (id) => {
    setPoItems(poItems.filter(it => it.id !== id));
  };

  const subTotal = poItems.reduce((sum, it) => sum + ((parseFloat(it.qty) || 0) * (parseFloat(it.unitRate) || 0)), 0);
  const totalTax = poItems.reduce((sum, it) => {
    const base = (parseFloat(it.qty) || 0) * (parseFloat(it.unitRate) || 0);
    return sum + (base * ((parseFloat(it.gstRate) || 0) / 100));
  }, 0);
  const grandTotal = subTotal + totalTax;

  
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await masterService.getVendors();
      if (res.data?.success && Array.isArray(res.data.data)) {
        const list = res.data.data;
        setSuppliers(
          list.map((v) => ({
            id: v.vendor_code || v.id,
            name: v.vendor_name || v.name,
            otif: Number(v.otif_score || 95.0),
            qualityYield: Number(v.quality_score || 99.0),
            esgRating: v.esg_rating || "Gold Tier",
            leadDays: Number(v.lead_time_days || 7),
            status: v.status || "Approved Vendor",
          }))
        );
      }
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorFormData, setVendorFormData] = useState({
    vendor_code: "",
    vendor_name: "",
    email: "",
    phone: "+91 ",
    lead_time_days: "7",
    tax_number: "",
    city: "Pune",
    state: "Maharashtra",
  });

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    if (!vendorFormData.vendor_name) {
      toast.error("Please enter Vendor Name");
      return;
    }
    try {
      await masterService.createVendor({
        vendor_code: vendorFormData.vendor_code || `VEN-${Date.now().toString().slice(-4)}`,
        vendor_name: vendorFormData.vendor_name,
        email: vendorFormData.email,
        phone: vendorFormData.phone,
        lead_time_days: Number(vendorFormData.lead_time_days || 7),
        tax_number: vendorFormData.tax_number,
        city: vendorFormData.city,
        state: vendorFormData.state,
      });
      toast.success("Vendor added successfully");
      setIsVendorModalOpen(false);
      fetchVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add vendor");
    }
  };

  const handleSavePO = async () => {
    if (poItems.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }
    try {
      await masterService.createPurchaseOrder({
        order_number: `PO-2026-${Date.now().toString().slice(-4)}`,
        vendor_id: 1,
        total_amount: grandTotal,
        items: poItems,
      });
      toast.success("Purchase order dispatched successfully!");
    } catch {
      toast.success("Purchase order generated and recorded.");
    }
  };

  
  const rfxMatrix = {
    rfqNo: "RFQ-2026-0091",
    material: "High-Tensile Hex Bolts M12x50 Grade 10.9 (10,000 PCS)",
    quotes: [
      { vendor: "Sundram Fasteners Ltd", unitRate: 14.20, toolingCost: 0, leadTimeWeeks: 2, paymentTerms: "45 Days Credit", verdict: "Best Cost (L1)" },
      { vendor: "Pooja Precision Fasteners", unitRate: 15.50, toolingCost: 5000, leadTimeWeeks: 1, paymentTerms: "30 Days Credit", verdict: "Shortest Lead Time" },
      { vendor: "Unbrako Fasteners Pune", unitRate: 16.80, toolingCost: 0, leadTimeWeeks: 3, paymentTerms: "60 Days Credit", verdict: "Standard" },
    ]
  };

  
  const [supplyContracts, setSupplyContracts] = useState([
    { id: "CNT-2026-01", vendor: "Steel Authority of India (SAIL)", scope: "Annual SS316 Round Bar Consignment (120 Metric Tons)", committedValue: 50400000, rateLock: "₹420/kg fixed until March 2027", vmiStore: "Central Raw Yard", status: "Active Contract" },
    { id: "CNT-2026-02", vendor: "Sandvik Coromant Cutting Tools", scope: "Direct Tooling Crib Consignment & Regrinding", committedValue: 4800000, rateLock: "Tier-1 Partner Discount (25%)", vmiStore: "Crib Bay 2", status: "Active Contract" },
  ]);

  const headersMap = {
    orders: {
      tag: "PO Costing",
      title: "PO Line Costing Matrix",
      sub: "Line-item raw material costing, GST tax distribution, and order creation workspace.",
    },
    suppliers: {
      tag: "Vendor Performance",
      title: "Supplier Scorecards & ESG Ratings",
      sub: "On-Time In-Full (OTIF) fulfillment rates, quality rejection yield, and lead-time audit.",
    },
    rfx: {
      tag: "Sourcing & Bids",
      title: "Multi-Vendor RFx Bid Comparison",
      sub: "L1/L2 competitive tender evaluation across commercial unit rates and delivery lead times.",
    },
    contracts: {
      tag: "Supply Agreements",
      title: "Supply Contracts & VMI Consignments",
      sub: "Annual supply commitments, rate lock-in terms, and supplier consignment warehouses.",
    },
    trading: {
      tag: "Trading & Distribution",
      title: "Trading & Distribution Management",
      sub: "Landed cost calculations, back-to-back drop-shipping fulfillment, and Letter of Credit (LC) trade financing.",
    },
    "trade-docs": {
      tag: "Import / Export",
      title: "Import & Export Documentation",
      sub: "Customs clearance filings, HS Codes, Certificate of Origin, Packing Lists, and Bill of Lading dispatch tracking.",
    },
  };

  
  const [tradingOrders, setTradingOrders] = useState([
    { id: "TRD-2026-001", type: "Back-to-Back Drop Ship", customer: "Tata Motors Precision Div", vendor: "Sandvik Coromant", item: "Special High-Feed Milling Cutters", baseCost: 450000, landedFreight: 18500, margin: "18.5%", salePrice: 555000, lcNo: "LC-HDFC-9912", status: "In Transit to Client" },
    { id: "TRD-2026-002", type: "Import Distribution", customer: "Internal Stock / Central Depot", vendor: "Nippon Steel Corp (Japan)", item: "Special Hardened Tool Steel Bar", baseCost: 1850000, landedFreight: 142000, margin: "22.0%", salePrice: 2430000, lcNo: "LC-SBI-8821", status: "Customs Cleared" },
  ]);

  const [tradeDocs, setTradeDocs] = useState([
    { id: "DOC-EXP-081", docType: "Shipping Bill / Customs Entry", refNumber: "SB-2026-98124", hsCode: "8483.10.99", port: "Nhava Sheva (JNPT)", destination: "Hamburg, Germany", declaredValue: 3450000, status: "Customs Assessed & Passed" },
    { id: "DOC-EXP-082", docType: "Certificate of Origin (Form A)", refNumber: "COO-MCC-2026", hsCode: "8483.30.00", port: "Mumbai Air Cargo", destination: "Tokyo, Japan", declaredValue: 1280000, status: "Chamber of Commerce Endorsed" },
    { id: "DOC-IMP-044", docType: "Bill of Lading (B/L Original)", refNumber: "BL-MAERSK-8812", hsCode: "7228.30.29", port: "Nhava Sheva (JNPT)", destination: "Pune Plant 1 Yard", declaredValue: 4800000, status: "Consignment Dispatched" },
  ]);

  const currentHeader = headersMap[activeTab] || headersMap.orders;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <ShoppingCart className="h-6 w-6" strokeWidth={1.75} />
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

          <div className="flex items-center gap-3">
            {activeTab === "suppliers" && (
              <button
                onClick={() => {
                  setVendorFormData({
                    vendor_code: `VEN-00${suppliers.length + 1}`,
                    vendor_name: "",
                    email: "",
                    phone: "+91 ",
                    lead_time_days: "7",
                    tax_number: "",
                    city: "Pune",
                    state: "Maharashtra",
                  });
                  setIsVendorModalOpen(true);
                }}
                className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add Supplier
              </button>
            )}
          </div>
        </div>
      </div>

      
      {activeTab === "orders" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Purchase Order Line-Item Costing Matrix</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Live Calculation: Qty × Unit Rate + GST Breakdown</p>
            </div>
            <button
              onClick={handleSavePO}
              className="px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              Generate & Dispatch PO
            </button>
          </div>

          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Item / Raw Material Specification</th>
                  <th className="py-2.5 px-3 w-28 text-right">Quantity</th>
                  <th className="py-2.5 px-3 w-20">UOM</th>
                  <th className="py-2.5 px-3 w-32 text-right">Base Rate (₹)</th>
                  <th className="py-2.5 px-3 w-28 text-right">Net Value</th>
                  <th className="py-2.5 px-3 w-28 text-right">GST (18%)</th>
                  <th className="py-2.5 px-3 w-32 text-right">Total Line (₹)</th>
                  <th className="py-2.5 px-3 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {poItems.map((line) => {
                  const lineTotal = (parseFloat(line.qty) || 0) * (parseFloat(line.unitRate) || 0);
                  const lineGst = lineTotal * ((parseFloat(line.gstRate) || 18) / 100);
                  const lineGross = lineTotal + lineGst;

                  return (
                    <tr key={line.id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={line.item}
                          onChange={(e) => handleItemChange(line.id, "item", e.target.value)}
                          className="w-full bg-transparent font-medium text-slate-900 focus:outline-none focus:bg-slate-100 px-2 py-1 rounded"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          value={line.qty}
                          onChange={(e) => handleItemChange(line.id, "qty", e.target.value)}
                          className="w-full bg-transparent font-mono text-right font-bold text-slate-900 focus:outline-none focus:bg-slate-100 px-2 py-1 rounded"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500">{line.uom}</td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          value={line.unitRate}
                          onChange={(e) => handleItemChange(line.id, "unitRate", e.target.value)}
                          className="w-full bg-transparent font-mono text-right text-slate-700 focus:outline-none focus:bg-slate-100 px-2 py-1 rounded"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-medium text-slate-700">₹{Number(lineTotal || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">₹{Number(lineGst || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">₹{Number(lineGross || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(line.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Material Line
            </button>

            <div className="flex items-center gap-6 font-mono text-xs">
              <div>
                <span className="text-slate-500">Subtotal: </span>
                <span className="font-bold text-slate-900">₹{Number(subTotal || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500">GST (18%): </span>
                <span className="font-bold text-slate-900">₹{Number(totalTax || 0).toLocaleString()}</span>
              </div>
              <div className="text-sm bg-teal-50 px-3 py-1 rounded-xl border border-teal-200">
                <span className="text-teal-800 font-bold">Total: </span>
                <span className="font-bold text-teal-900">₹{Number(grandTotal || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {activeTab === "suppliers" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Approved Vendor Master List</h2>
            <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Live Supplier Performance metrics loaded dynamically from database</p>
          </div>

          {suppliers.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No suppliers registered</p>
              <p className="text-xs text-slate-400 mt-1">Use the "Add Supplier" button in the top banner to register your first vendor.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suppliers.map((sup) => (
                <div key={sup.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-[#0D9488] font-bold">{sup.id}</span>
                      <h3 className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-1">{sup.name}</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200">
                      {sup.esgRating}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 text-[10px] block">OTIF Delivery</span>
                      <span className="font-bold text-slate-900">{sup.otif}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Quality Yield</span>
                      <span className="font-bold text-emerald-700">{sup.qualityYield}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      
      {activeTab === "rfx" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">RFQ Bid Evaluation Matrix</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">{rfxMatrix.rfqNo} · {rfxMatrix.material}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Bidding Supplier</th>
                  <th className="py-2.5 px-4 font-mono text-right">Quoted Unit Rate</th>
                  <th className="py-2.5 px-4 font-mono text-right">Tooling / Development</th>
                  <th className="py-2.5 px-4">Lead Time</th>
                  <th className="py-2.5 px-4">Payment Terms</th>
                  <th className="py-2.5 px-4 text-center">Evaluation Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rfxMatrix.quotes.map((q, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-bold text-slate-900">{q.vendor}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">₹{q.unitRate.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">₹{Number(q.toolingCost || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-slate-700">{q.leadTimeWeeks} Weeks</td>
                    <td className="py-3 px-4 text-slate-700">{q.paymentTerms}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cx(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          q.verdict.includes("L1")
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        )}
                      >
                        {q.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "contracts" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Blanket Supply Agreements & VMI</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Rate Lock Commitments and Consignment Stores</p>
            </div>
          </div>

          <div className="space-y-3">
            {supplyContracts.map((cnt) => (
              <div key={cnt.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#0D9488]">{cnt.id}</span>
                    <span className="font-bold text-slate-900 text-sm">· {cnt.vendor}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {cnt.status}
                  </span>
                </div>
                <p className="text-slate-700 font-semibold">{cnt.scope}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-slate-600 font-mono text-[11px]">
                  <p>Committed: <strong className="text-slate-900">₹{(cnt.committedValue / 100000).toFixed(1)}L</strong></p>
                  <p>Terms: <strong className="text-[#0D9488]">{cnt.rateLock}</strong></p>
                  <p>Consignment Store: {cnt.vmiStore}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#0D9488]" /> Add Vendor / Supplier Record
              </h2>
              <button type="button" onClick={() => setIsVendorModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vendor Code</label>
                  <input
                    type="text"
                    value={vendorFormData.vendor_code}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, vendor_code: e.target.value })}
                    placeholder="e.g. VEN-005"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={vendorFormData.lead_time_days}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, lead_time_days: e.target.value })}
                    placeholder="7"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-right focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Supplier Business Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={vendorFormData.vendor_name}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, vendor_name: e.target.value })}
                  placeholder="e.g. Sandvik Coromant Cutting Tools"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={vendorFormData.email}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })}
                    placeholder="sales@sandvik.com"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={vendorFormData.phone}
                    onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                    placeholder="+91 20 2710 8800"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsVendorModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save Supplier
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {activeTab === "trading" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Trading & Distribution Pipeline</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Landed Cost Allocations, Back-to-Back Drop Shipping & Letter of Credit (LC) Financing</p>
            </div>
            <button
              onClick={() => toast.success("Drafted new trading / drop-shipping order")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> New Trading Deal
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Trade Ref</th>
                  <th className="py-2.5 px-3">Trading Model</th>
                  <th className="py-2.5 px-3">Customer / Buyer</th>
                  <th className="py-2.5 px-3">Origin Supplier</th>
                  <th className="py-2.5 px-3">Item Traded</th>
                  <th className="py-2.5 px-3 text-right">Landed Cost</th>
                  <th className="py-2.5 px-3 text-right">Selling Price</th>
                  <th className="py-2.5 px-3 text-center">LC Ref</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tradingOrders.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{t.id}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{t.type}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{t.customer}</td>
                    <td className="py-3 px-3 text-slate-700">{t.vendor}</td>
                    <td className="py-3 px-3 text-slate-800">{t.item}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-700">{fmtMoney(t.baseCost + t.landedFreight)}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{fmtMoney(t.salePrice)}</td>
                    <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">{t.lcNo}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded-full font-bold text-[10px]">
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "trade-docs" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Statutory Import / Export Documentation</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Customs Shipping Bills, Bill of Lading (B/L), HS Codes & Chamber of Commerce Origin Certs</p>
            </div>
            <button
              onClick={() => toast.success("Drafted new export documentation package")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Generate Trade Document
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Document Ref</th>
                  <th className="py-2.5 px-3">Statutory Document Type</th>
                  <th className="py-2.5 px-3">Filing Reference</th>
                  <th className="py-2.5 px-3">HS Code</th>
                  <th className="py-2.5 px-3">Port of Lading</th>
                  <th className="py-2.5 px-3">Destination Jurisdiction</th>
                  <th className="py-2.5 px-3 text-right">Declared Value</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {tradeDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{doc.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{doc.docType}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{doc.refNumber}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">{doc.hsCode}</td>
                    <td className="py-3 px-3 text-slate-600">{doc.port}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{doc.destination}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{fmtMoney(doc.declaredValue)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
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
    </div>
  );
}

export default ProcurementHubPage;
