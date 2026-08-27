import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  Boxes, AlertTriangle, CheckCircle2, ArrowRightLeft, 
  MapPin, Plus, Search, Layers, QrCode, Grid,
  Sliders, ArrowUpRight, Barcode, Check, X, Save
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";

export function InventoryHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "stock";

  
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    product_code: "",
    product_name: "",
    category: "Finished Goods",
    hsn_code: "8483",
    unit_price: "",
    uom: "EA",
    reorder_level: "50",
    initial_stock: "100",
    warehouse_location: "Central Bay A / Bin A1",
  });

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const res = await masterService.getProducts();
      if (res.data?.success && Array.isArray(res.data.data)) {
        const list = res.data.data;
        setStockItems(
          list.map((p) => ({
            id: p.product_code || `PRD-${p.product_id}`,
            name: p.product_name || p.name,
            category: p.item_type || p.category || p.category_name || "General Inventory",
            currentQty: Number(p.current_stock ?? p.stock_quantity ?? 0),
            minSafetyQty: Number(p.reorder_level ?? p.min_stock ?? 10),
            maxQty: Number(p.max_stock || (p.reorder_level ? p.reorder_level * 3 : 100)),
            uom: p.uom_code || p.uom || "PCS",
            location: p.warehouse_location || p.location || "Central Stores Bay 1",
          }))
        );
      }
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!formData.product_name || !formData.unit_price) {
      toast.error("Please enter Product Name and Unit Price");
      return;
    }
    try {
      await masterService.createProduct({
        product_code: formData.product_code || `SKU-${Date.now().toString().slice(-4)}`,
        product_name: formData.product_name,
        category: formData.category,
        hsn_code: formData.hsn_code,
        unit_price: Number(formData.unit_price),
        uom: formData.uom,
        reorder_level: Number(formData.reorder_level || 10),
        current_stock: Number(formData.initial_stock || 0),
        warehouse_location: formData.warehouse_location,
      });
      toast.success("Product created successfully");
      setIsModalOpen(false);
      fetchInventoryData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create product");
    }
  };

  
  const [selectedBin, setSelectedBin] = useState(null);
  const warehouseBays = [
    {
      bay: "Aisle A (Finished Goods)",
      bins: [
        { code: "A1-01", item: "Shaft 45mm", qty: "120 PCS", status: "Occupied" },
        { code: "A1-02", item: "Shaft 45mm", qty: "120 PCS", status: "Occupied" },
        { code: "A1-03", item: "Empty", qty: "0", status: "Available" },
        { code: "A1-04", item: "Flange Hubs", qty: "85 PCS", status: "Occupied" },
      ]
    },
    {
      bay: "Aisle B (Raw Bar Stocks)",
      bins: [
        { code: "B1-01", item: "SS316 50mm Bars", qty: "1000 KGS", status: "Occupied" },
        { code: "B1-02", item: "EN8 30mm Rods", qty: "500 KGS", status: "Occupied" },
        { code: "B1-03", item: "Empty", qty: "0", status: "Available" },
        { code: "B1-04", item: "Empty", qty: "0", status: "Available" },
      ]
    }
  ];

  
  const [pickList, setPickList] = useState([
    { id: 1, item: "SS316 Precision CNC Turned Shaft 45mm", bin: "A1-01", reqQty: 50, pickedQty: 50, status: "Picked" },
    { id: 2, item: "Hardened Steel Bushing 25mm ID", bin: "A3-01", reqQty: 30, pickedQty: 0, status: "Pending Pick" },
  ]);

  const handleConfirmPick = (id) => {
    setPickList(prev => prev.map(p => p.id === id ? { ...p, pickedQty: p.reqQty, status: "Picked" } : p));
    toast.success("Pick line item verified and deducted from bin stock!");
  };

  
  const [batchLots, setBatchLots] = useState([
    { lotNo: "LOT-SS316-202608", sku: "RAW-SS316-50", material: "Stainless Steel Round Bar 50mm", millHeatNo: "HEAT-SAIL-8841", mfgDate: "2026-08-01", expDate: "N/A (Metals)", qtyOnHand: "1,000 KGS", qcStatus: "Approved (Cert Attached)" },
    { lotNo: "LOT-SHAFT-0042", sku: "FG-SHAFT-45", material: "Precision CNC Turned Shaft 45mm", millHeatNo: "Linked to HEAT-SAIL-8841", mfgDate: "2026-08-20", expDate: "N/A", qtyOnHand: "240 PCS", qcStatus: "PDI Verified" },
  ]);

  const headersMap = {
    stock: {
      tag: "Perpetual Stock",
      title: "Perpetual Stock Balances & Buffers",
      sub: "Real-time stock valuation, physical inventory, and automated reorder threshold triggers.",
    },
    layout: {
      tag: "Warehouse Topology",
      title: "2D Warehouse Bay & Racking Matrix",
      sub: "Visual spatial location topology across central raw material stores and finished goods bins.",
    },
    picking: {
      tag: "Floor Operations",
      title: "Floor Tablet Picking Console",
      sub: "Touch-optimized outbound picking, dispatch packing verification, and bin deduction.",
    },
    batch: {
      tag: "Traceability & Lots",
      title: "Heat Lot Traceability & Genealogies",
      sub: "Mill heat test certificate tracking, batch genealogy from raw steel to finished components.",
    },
    expiry: {
      tag: "Shelf Life & Serial Tracking",
      title: "Batch / Serial & Expiry Tracking (Pharma / Food / Chemicals / Retail)",
      sub: "FEFO (First-Expired-First-Out) automated stock dispatch, shelf-life monitoring, and temperature-controlled storage logs.",
    },
    cyclecount: {
      tag: "Stock Auditing",
      title: "Cycle Counting & Physical Stock Audit",
      sub: "ABC classification scheduled blind counting, physical vs perpetual inventory reconciliation, and variance adjustments.",
    },
  };

  
  const [expiryLots, setExpiryLots] = useState([
    { lotNo: "LOT-COOL-2026", item: "Industrial Synthetic Cutting Coolant Grade 68", category: "Chemicals / Fluid", mfgDate: "2026-02-10", expDate: "2027-02-09", shelfLifeRemaining: "168 Days", storageCondition: "Cool & Dry (18°C - 25°C)", fefoPriority: "Priority 1 (Dispatch First)", status: "Active Good" },
    { lotNo: "LOT-PHAR-8812", item: "Sterile Cleanroom Packaging Film", category: "Medical / Pharma Packaging", mfgDate: "2026-05-15", expDate: "2026-11-14", shelfLifeRemaining: "78 Days (Alert)", storageCondition: "Class 10k Cleanroom", fefoPriority: "Urgent FEFO", status: "Expiring Soon" },
    { lotNo: "LOT-RUST-0091", item: "Anti-Rust Protective VCI Coating Compound", category: "Preservation Chemical", mfgDate: "2026-01-05", expDate: "2028-01-04", shelfLifeRemaining: "495 Days", storageCondition: "Flammables Crib", fefoPriority: "Standard", status: "Active Good" },
  ]);

  const [cycleCounts, setCycleCounts] = useState([
    { auditId: "CC-2026-034", item: "Stainless Steel Round Bar SS316 50mm", abcClass: "Class A (High Value)", systemQty: 1000, physicalCounted: 998, variance: -2, uom: "KGS", varianceValue: -840, auditor: "Santosh Mane", status: "Reconciled & Approved" },
    { auditId: "CC-2026-035", item: "Medium Carbon Steel EN8 30mm", abcClass: "Class B", systemQty: 500, physicalCounted: 500, variance: 0, uom: "KGS", varianceValue: 0, auditor: "Vikas Kadam", status: "Verified Exact Match" },
    { auditId: "CC-2026-036", item: "Carbide Turning Inserts CNMG", abcClass: "Class A (High Value Tooling)", systemQty: 25, physicalCounted: 24, variance: -1, uom: "BOX", varianceValue: -1850, auditor: "Ramesh Shinde", status: "Pending Supervisor Signoff" },
  ]);

  const currentHeader = headersMap[activeTab] || headersMap.stock;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Boxes className="h-6 w-6" strokeWidth={1.75} />
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
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => {
                setFormData({
                  product_code: `SKU-00${stockItems.length + 1}`,
                  product_name: "",
                  category: "Finished Goods",
                  hsn_code: "8483",
                  unit_price: "",
                  uom: "EA",
                  reorder_level: "50",
                  initial_stock: "100",
                  warehouse_location: "Central Bay A / Bin A1",
                });
                setIsModalOpen(true);
              }}
            >
              Add Product / Item
            </Button>
          </div>
        </div>
      </div>

      
      {activeTab === "stock" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Perpetual Stock Balances & Safety Buffers</h2>
            <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Live items loaded dynamically from PostgreSQL inventory master</p>
          </div>

          {stockItems.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <Boxes className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No inventory products found</p>
              <p className="text-xs text-slate-400 mt-1">Click "+ Add Product / Item" to register your first SKU.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Item SKU / Name</th>
                    <th className="py-2.5 px-4">Classification</th>
                    <th className="py-2.5 px-4 font-mono text-right">Available Qty</th>
                    <th className="py-2.5 px-4 font-mono text-right">Min Safety Level</th>
                    <th className="py-2.5 px-4 w-48">Stock Health</th>
                    <th className="py-2.5 px-4">Bin Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockItems.map((stk) => {
                    const isDepleted = stk.currentQty <= stk.minSafetyQty;

                    return (
                      <tr key={stk.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[#0D9488] text-[11px] block">{stk.id}</span>
                          <p className="font-bold text-slate-900 mt-0.5">{stk.name}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{stk.category}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {stk.currentQty} {stk.uom}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {stk.minSafetyQty} {stk.uom}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={cx("h-full rounded-full transition-all", isDepleted ? "bg-rose-500" : "bg-[#0D9488]")}
                                style={{ width: `${Math.min(100, (stk.currentQty / (stk.maxQty || 100)) * 100)}%` }}
                              />
                            </div>
                            <span className={cx("text-[10px] font-mono block text-right font-bold", isDepleted ? "text-rose-700" : "text-emerald-700")}>
                              {isDepleted ? "Depleted (Reorder)" : "Healthy Stock"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700">{stk.location}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="h-5 w-5 text-[#0D9488]" /> Add Inventory Item / Product
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Item SKU / Code</label>
                  <input
                    type="text"
                    value={formData.product_code}
                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                    placeholder="e.g. SKU-SHAFT-45"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Classification</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-[#0D9488]"
                  >
                    <option value="Finished Goods">Finished Goods</option>
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Semi-Finished">Semi-Finished</option>
                    <option value="Standard Parts">Standard Parts</option>
                    <option value="Consumables">Consumables</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Product Description / Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="e.g. SS316 Precision CNC Turned Shaft 45mm"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">HSN / SAC</label>
                  <input
                    type="text"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    placeholder="8483"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit Price (₹) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    placeholder="450.00"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold text-right focus:ring-2 focus:ring-[#0D9488]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit (UOM)</label>
                  <select
                    value={formData.uom}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  >
                    <option value="EA">EA (Each)</option>
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="KGS">KGS (Kilograms)</option>
                    <option value="MTR">MTR (Meters)</option>
                    <option value="BOX">BOX (Boxes)</option>
                    <option value="BARREL">BARREL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Reorder Safety Level</label>
                  <input
                    type="number"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                    placeholder="50"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Initial Stock Qty</label>
                  <input
                    type="number"
                    value={formData.initial_stock}
                    onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
                    placeholder="100"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {activeTab === "expiry" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Batch / Serial & Shelf-Life Expiry Tracker</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Automated First-Expired-First-Out (FEFO) picking priority & environmental storage monitoring</p>
            </div>
            <button
              onClick={() => toast.success("Batch expiry schedule scanned across all warehouses")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              Scan FEFO Dispatch Priority
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Batch / Lot No</th>
                  <th className="py-2.5 px-3">Material / Product</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Mfg Date</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3">Shelf Life Remaining</th>
                  <th className="py-2.5 px-3">Storage Protocol</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {expiryLots.map((lot, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{lot.lotNo}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{lot.item}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{lot.category}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{lot.mfgDate}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px] font-bold">{lot.expDate}</td>
                    <td className="py-3 px-3">
                      <span className={cx(
                        "font-bold",
                        lot.shelfLifeRemaining.includes("Alert") ? "text-amber-600" : "text-slate-800"
                      )}>
                        {lot.shelfLifeRemaining}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{lot.storageCondition}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={cx(
                        "px-2 py-0.5 rounded-full font-bold text-[10px] border",
                        lot.status.includes("Soon") ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}>
                        {lot.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "cyclecount" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Physical Stock Audit & Cycle Counting Console</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">ABC Classification Scheduled Audits · Perpetual vs Physical Reconciliation</p>
            </div>
            <button
              onClick={() => toast.success("Initialized new blind cycle count audit sheet")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Start Cycle Count
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Audit Batch</th>
                  <th className="py-2.5 px-3">Inventory SKU</th>
                  <th className="py-2.5 px-3">ABC Velocity</th>
                  <th className="py-2.5 px-3 text-right">System Book Qty</th>
                  <th className="py-2.5 px-3 text-right">Physical Counted</th>
                  <th className="py-2.5 px-3 text-right">Variance Qty</th>
                  <th className="py-2.5 px-3 text-right">Variance Value</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {cycleCounts.map((cc) => (
                  <tr key={cc.auditId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{cc.auditId}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{cc.item}</td>
                    <td className="py-3 px-3 text-slate-700 font-semibold">{cc.abcClass}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-700">{cc.systemQty} {cc.uom}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">{cc.physicalCounted} {cc.uom}</td>
                    <td className={cx("py-3 px-3 text-right font-black", cc.variance < 0 ? "text-rose-600" : (cc.variance > 0 ? "text-blue-600" : "text-emerald-600"))}>
                      {cc.variance > 0 ? "+" : ""}{cc.variance} {cc.uom}
                    </td>
                    <td className={cx("py-3 px-3 text-right font-black", cc.varianceValue < 0 ? "text-rose-600" : (cc.varianceValue > 0 ? "text-blue-600" : "text-slate-800"))}>
                      {fmtMoney(cc.varianceValue)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded-full font-bold text-[10px]">
                        {cc.status}
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

export default InventoryHubPage;
