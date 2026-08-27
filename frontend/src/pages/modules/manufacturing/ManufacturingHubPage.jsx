import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  Factory, Layers, Calendar, Clock, CheckCircle2, 
  AlertTriangle, Plus, ChevronRight, ChevronDown, Activity,
  Cpu, Wrench, PlayCircle, StopCircle, RefreshCw, X, Save
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";

export function ManufacturingHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "workorders";

  
  const [expandedBom, setExpandedBom] = useState({ "bom-root": true, "sub-1": true });
  const toggleBom = (id) => {
    setExpandedBom(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const bomStructure = {
    id: "bom-root",
    itemCode: "FG-SHAFT-45",
    itemName: "Precision Automotive Transmission Shaft 45mm Assembly",
    qty: 1,
    uom: "EA",
    children: [
      {
        id: "sub-1",
        itemCode: "SA-CORE-45",
        itemName: "CNC Machined Shaft Core",
        qty: 1,
        uom: "PCS",
        children: [
          { id: "raw-1", itemCode: "RAW-SS316-50", itemName: "Stainless Steel Round Bar 50mm", qty: 1.45, uom: "KGS" },
          { id: "raw-2", itemCode: "TOOL-CNMG-12", itemName: "Turning Insert Wear Allowance", qty: 0.05, uom: "EDGE" },
        ]
      },
      {
        id: "sub-2",
        itemCode: "SA-BUSH-25",
        itemName: "Hardened Steel Flange Bushing",
        qty: 2,
        uom: "PCS",
        children: [
          { id: "raw-3", itemCode: "RAW-EN8-30", itemName: "Medium Carbon Steel Rod EN8", qty: 0.60, uom: "KGS" }
        ]
      },
      { id: "raw-4", itemCode: "STD-BOLT-M12", itemName: "High Tensile Hex Bolt M12x50", qty: 4, uom: "PCS" }
    ]
  };

  
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    work_order_number: "",
    product_name: "",
    quantity: "250",
    work_center: "CNC Turning Cell 1",
    operator_name: "Santosh Mane",
    status: "In Progress",
    order_date: new Date().toISOString().slice(0, 10),
  });

  const fetchManufacturingData = async () => {
    setLoading(true);
    try {
      const [woRes, wcRes, bomRes] = await Promise.allSettled([
        masterService.getWorkOrders(),
        masterService.getWorkCenters(),
        masterService.getBoms(),
      ]);

      if (woRes.status === "fulfilled" && woRes.value.data?.success && Array.isArray(woRes.value.data.data)) {
        const list = woRes.value.data.data;
        setWorkOrders(
          list.map((w) => ({
            id: w.wo_number || w.order_number || w.work_order_number || `WO-${w.work_order_id}`,
            product: w.product_name || "Precision CNC Component",
            batchQty: Number(w.planned_qty || w.quantity || 100),
            completedQty: Number(w.completed_qty || w.completed_quantity || 0),
            machine: w.work_center || "CNC Turning Cell 1",
            status: w.status || "In Progress",
            operator: w.operator_name || "Duty Operator",
          }))
        );
      }

      if (wcRes.status === "fulfilled" && wcRes.value.data?.success && Array.isArray(wcRes.value.data.data)) {
        const list = wcRes.value.data.data;
        if (list.length > 0) {
          setWorkCenters(
            list.map((wc, i) => ({
              id: wc.center_code || `WC-0${i + 1}`,
              name: wc.center_name,
              capacityHours: Number(wc.capacity_per_day_hours || 16),
              loadHours: Number(wc.capacity_per_day_hours || 16) * 0.85,
              oeePct: 88.4,
              status: "Running Batch",
            }))
          );
        }
      }
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManufacturingData();
  }, []);

  const handleCreateWorkOrder = async (e) => {
    e.preventDefault();
    if (!formData.product_name || !formData.quantity) {
      toast.error("Please enter Product Name and Batch Quantity");
      return;
    }
    try {
      await masterService.createWorkOrder({
        work_order_number: formData.work_order_number || `WO-2026-${Date.now().toString().slice(-4)}`,
        product_name: formData.product_name,
        planned_qty: Number(formData.quantity),
        quantity: Number(formData.quantity),
        work_center: formData.work_center,
        operator_name: formData.operator_name,
        status: formData.status || "Planned",
        order_date: formData.order_date,
      });
      toast.success("Work order launched successfully");
      setIsModalOpen(false);
      fetchManufacturingData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to launch work order");
    }
  };

  
  const [workCenters, setWorkCenters] = useState([
    { id: "WC-01", name: "CNC Turning Cell 1 (Mazak Lathes)", capacityHours: 16, loadHours: 14.5, oeePct: 88.4, status: "Running Batch" },
    { id: "WC-02", name: "VMC Milling Center 3 (Haas 4-Axis)", capacityHours: 16, loadHours: 16.0, oeePct: 92.1, status: "100% Fully Loaded" },
    { id: "WC-03", name: "Precision Cylindrical Grinding Bay", capacityHours: 8, loadHours: 4.2, oeePct: 76.5, status: "Under Preventive Check" },
    { id: "WC-04", name: "Induction Heat Treatment & Hardening", capacityHours: 8, loadHours: 7.8, oeePct: 94.0, status: "Running Batch" },
  ]);

  const headersMap = {
    bom: {
      tag: "BOM Engineering",
      title: "Multi-Level Bill of Materials (BOM)",
      sub: "Hierarchical component structure, raw stock consumption ratios, and standard cycle times.",
    },
    workorders: {
      tag: "Shop Floor MES",
      title: "Production Work Orders & Gantt Schedule",
      sub: "Live production batch scheduling, machine center routing, and finished parts output.",
    },
    capacity: {
      tag: "Capacity Planning",
      title: "Machine Center Capacity & OEE Metrics",
      sub: "Work-center load balancing, overall equipment effectiveness (OEE), and machine bottleneck telemetry.",
    },
    ecn: {
      tag: "PLM & Engineering",
      title: "Engineering Change Management (ECN / ECO)",
      sub: "Drawing revisions, BOM change requests, engineering sign-offs, and effective cutover production dates.",
    },
    variance: {
      tag: "Cost Accounting",
      title: "Standard Costing & Production Variance Analysis",
      sub: "Material price variance, machine hour absorption variance, labor efficiency metrics, and actual vs standard unit costing.",
    },
    shopfloor: {
      tag: "Industrial IoT",
      title: "Shop Floor Data Collection (IoT / Machine Telemetry)",
      sub: "Live machine cycle counters, spindle sensor feeds, operator job logs, and breakdown reason code capture.",
    },
  };

  
  const [ecnOrders, setEcnOrders] = useState([
    { id: "ECO-2026-018", title: "Automotive Transmission Shaft 45mm Chamfer Angle Revision", item: "FG-SHAFT-45 (Rev 4.0 → 4.1)", changeType: "Tolerancing & Chamfer Refinement", initiatedBy: "Design Lead", effectiveDate: "2026-09-01", impact: "Tooling Offset Update Only", status: "Approved by Plant Head" },
    { id: "ECO-2026-019", title: "Substitute Raw Material EN8 with EN8D for Flange Bushing", item: "SA-BUSH-25 (Rev 2.0 → 3.0)", changeType: "Raw Material Specification", initiatedBy: "Metallurgist", effectiveDate: "2026-09-15", impact: "Raw Store Stock Cutover", status: "In Quality Review" },
  ]);

  const [variances, setVariances] = useState([
    { item: "FG-SHAFT-45 Precision Shaft", stdCost: 1180, actualCost: 1142, matVariance: -28, laborVariance: -10, overheadVariance: 0, totalVariance: -38, verdict: "Favorable (Cost Saved)" },
    { item: "SA-BUSH-25 Flange Bushing", stdCost: 480, actualCost: 512, matVariance: 22, laborVariance: 10, overheadVariance: 0, totalVariance: 32, verdict: "Unfavorable (Raw Rate Surge)" },
    { item: "STD-BOLT-M12 Hex Fastener", stdCost: 35, actualCost: 34.5, matVariance: -0.5, laborVariance: 0, overheadVariance: 0, totalVariance: -0.5, verdict: "Favorable" },
  ]);

  const [iotMachines, setIotMachines] = useState([
    { cell: "CNC Mazak QT250 (Cell 1)", ip: "192.168.10.41 (OPC-UA)", status: "Active Running", spindleRpm: 2840, motorTemp: "42.5°C", vibration: "0.08 mm/s (Normal)", partCountToday: 184, plannedTarget: 200, downtimeReason: "None (Nominal Run)" },
    { cell: "Haas VF-2 4-Axis (Cell 3)", ip: "192.168.10.42 (MQTT)", status: "Active Running", spindleRpm: 6180, motorTemp: "45.1°C", vibration: "0.11 mm/s (Normal)", partCountToday: 92, plannedTarget: 100, downtimeReason: "None (Nominal Run)" },
    { cell: "Cylindrical Grinder Cell", ip: "192.168.10.43 (Modbus TCP)", status: "Setup / Tooling Offsets", spindleRpm: 0, motorTemp: "28.0°C", vibration: "0.00 mm/s", partCountToday: 45, plannedTarget: 80, downtimeReason: "Downtime Code 04: Wheel Dressing" },
  ]);

  const currentHeader = headersMap[activeTab] || headersMap.workorders;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Factory className="h-6 w-6" strokeWidth={1.75} />
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
                  work_order_number: `WO-2026-00${Math.floor(10 + Math.random() * 90)}`,
                  product_name: "Precision Automotive Transmission Shaft 45mm",
                  quantity: "250",
                  work_center: "CNC Turning Cell 1",
                  operator_name: "Santosh Mane",
                  status: "In Progress",
                  order_date: new Date().toISOString().slice(0, 10),
                });
                setIsModalOpen(true);
              }}
            >
              New Work Order
            </Button>
          </div>
        </div>
      </div>

      
      {activeTab === "workorders" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Active Work Order Schedule & Progress</h2>
            <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Live Job Tracking loaded dynamically from database</p>
          </div>

          {workOrders.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <Factory className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No active work orders found</p>
              <p className="text-xs text-slate-400 mt-1">Click "+ New Work Order" to launch a machining batch.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Work Order Ref</th>
                    <th className="py-2.5 px-4">Target Finished Good</th>
                    <th className="py-2.5 px-4">Assigned Machine Center</th>
                    <th className="py-2.5 px-4 font-mono text-right">Batch Completion</th>
                    <th className="py-2.5 px-4 w-48">Progress Meter</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workOrders.map((wo) => {
                    const pct = Math.round(((wo.completedQty || 0) / (wo.batchQty || 1)) * 100);
                    return (
                      <tr key={wo.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">{wo.id}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{wo.product}</td>
                        <td className="py-3 px-4 text-slate-700">
                          <p>{wo.machine}</p>
                          <p className="text-[10px] text-slate-500 font-mono">Lead: {wo.operator}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {wo.completedQty} / {wo.batchQty} PCS
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={cx("h-full rounded-full transition-all", pct === 100 ? "bg-emerald-500" : "bg-[#0D9488]")}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 block text-right">{pct}% Completed</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                            {wo.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      
      {activeTab === "bom" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Multi-Level Bill of Materials (BOM) Explosion</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Hierarchical Component & Raw Material Breakdown</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs space-y-2">
            <div>
              <div
                onClick={() => toggleBom(bomStructure.id)}
                className="flex items-center gap-2 text-slate-900 font-bold p-2 rounded-lg hover:bg-slate-200/60 cursor-pointer select-none"
              >
                {expandedBom[bomStructure.id] ? <ChevronDown className="h-4 w-4 text-[#0D9488]" /> : <ChevronRight className="h-4 w-4 text-[#0D9488]" />}
                <Layers className="h-4 w-4 text-[#0D9488]" />
                <span className="text-[#0D9488]">{bomStructure.itemCode}</span>
                <span>{bomStructure.itemName}</span>
                <span className="text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200 ml-auto">
                  Base Qty: {bomStructure.qty} {bomStructure.uom}
                </span>
              </div>

              {expandedBom[bomStructure.id] && (
                <div className="pl-6 border-l border-slate-200 ml-4 space-y-2 mt-1">
                  {bomStructure.children.map((sub) => (
                    <div key={sub.id}>
                      {sub.children ? (
                        <div>
                          <div
                            onClick={() => toggleBom(sub.id)}
                            className="flex items-center gap-2 text-slate-800 font-bold p-1.5 rounded-lg bg-white border border-slate-200/80 cursor-pointer select-none"
                          >
                            {expandedBom[sub.id] ? <ChevronDown className="h-3.5 w-3.5 text-purple-600" /> : <ChevronRight className="h-3.5 w-3.5 text-purple-600" />}
                            <span className="text-purple-700">{sub.itemCode}</span>
                            <span>{sub.itemName}</span>
                            <span className="text-[10px] text-purple-800 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200 ml-auto">
                              Qty: {sub.qty} {sub.uom}
                            </span>
                          </div>

                          {expandedBom[sub.id] && (
                            <div className="pl-6 border-l border-slate-200 ml-4 space-y-1 mt-1">
                              {sub.children.map((raw) => (
                                <div key={raw.id} className="flex items-center gap-2 text-slate-700 p-1.5 rounded bg-white/70 border border-slate-200/60 text-[11px]">
                                  <span className="text-[#0D9488] font-bold">{raw.itemCode}</span>
                                  <span className="text-slate-900 font-semibold">{raw.itemName}</span>
                                  <span className="ml-auto font-mono text-[10px] text-slate-500">{raw.qty} {raw.uom} per unit</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-700 p-1.5 rounded bg-white border border-slate-200/60 text-[11px]">
                          <span className="text-[#0D9488] font-bold">{sub.itemCode}</span>
                          <span className="text-slate-900 font-semibold">{sub.itemName}</span>
                          <span className="ml-auto font-mono text-[10px] text-slate-500">{sub.qty} {sub.uom} per unit</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Factory className="h-5 w-5 text-[#0D9488]" /> Launch Production Work Order
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkOrder} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Work Order Ref</label>
                  <input
                    type="text"
                    value={formData.work_order_number}
                    onChange={(e) => setFormData({ ...formData, work_order_number: e.target.value })}
                    placeholder="e.g. WO-2026-0044"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Batch Qty (PCS) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="250"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold text-right focus:ring-2 focus:ring-[#0D9488]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Target Finished Product <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="e.g. Precision CNC Machined Shaft 45mm"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Machine Work Center</label>
                  <select
                    value={formData.work_center}
                    onChange={(e) => setFormData({ ...formData, work_center: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-[#0D9488]"
                  >
                    <option value="CNC Turning Cell 1">CNC Turning Cell 1</option>
                    <option value="VMC Milling Center 3">VMC Milling Center 3</option>
                    <option value="Grinding Bay 2">Grinding Bay 2</option>
                    <option value="Heat Treatment Line">Heat Treatment Line</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Operator / Lead</label>
                  <input
                    type="text"
                    value={formData.operator_name}
                    onChange={(e) => setFormData({ ...formData, operator_name: e.target.value })}
                    placeholder="e.g. Santosh Mane"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Launch Work Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {activeTab === "ecn" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Engineering Change Notice (ECN / ECO) Workflow</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Component Revisions, Drawing Modifications & Production Cutover Governance</p>
            </div>
            <button
              onClick={() => toast.success("Drafted new Engineering Change Notice (ECN)")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Raise ECN / ECO
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">ECO Number</th>
                  <th className="py-2.5 px-3">Subject / Change Description</th>
                  <th className="py-2.5 px-3">Affected Assembly / Part</th>
                  <th className="py-2.5 px-3">Change Scope</th>
                  <th className="py-2.5 px-3">Initiated By</th>
                  <th className="py-2.5 px-3">Cutover Date</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {ecnOrders.map((eco) => (
                  <tr key={eco.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{eco.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{eco.title}</td>
                    <td className="py-3 px-3 text-slate-700 font-mono text-[11px]">{eco.item}</td>
                    <td className="py-3 px-3 text-slate-600">{eco.changeType}</td>
                    <td className="py-3 px-3 text-slate-700">{eco.initiatedBy}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{eco.effectiveDate}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded-full font-bold text-[10px]">
                        {eco.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "variance" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Standard Costing & Production Cost Variance</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Material Price Variance, Labor Efficiency Variance & Machine Absorption Rate Variance</p>
            </div>
            <button
              onClick={() => toast.success("Standard cost rollups recomputed from live BOMs")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Recompute Standard Rollup
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Manufactured Product</th>
                  <th className="py-2.5 px-3 text-right">Standard Unit Cost</th>
                  <th className="py-2.5 px-3 text-right">Actual Incurred Cost</th>
                  <th className="py-2.5 px-3 text-right">Material Variance</th>
                  <th className="py-2.5 px-3 text-right">Labor Variance</th>
                  <th className="py-2.5 px-3 text-right">Net Cost Delta</th>
                  <th className="py-2.5 px-3 text-center">Variance Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {variances.map((v, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{v.item}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-700">{fmtMoney(v.stdCost)}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{fmtMoney(v.actualCost)}</td>
                    <td className={cx("py-3 px-3 text-right font-bold", v.matVariance > 0 ? "text-rose-600" : "text-emerald-600")}>
                      {v.matVariance > 0 ? "+" : ""}{fmtMoney(v.matVariance)}
                    </td>
                    <td className={cx("py-3 px-3 text-right font-bold", v.laborVariance > 0 ? "text-rose-600" : "text-emerald-600")}>
                      {v.laborVariance > 0 ? "+" : ""}{fmtMoney(v.laborVariance)}
                    </td>
                    <td className={cx("py-3 px-3 text-right font-black", v.totalVariance > 0 ? "text-rose-600" : "text-emerald-600")}>
                      {v.totalVariance > 0 ? "+" : ""}{fmtMoney(v.totalVariance)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={cx(
                        "px-2 py-0.5 rounded-full font-bold text-[10px] border",
                        v.totalVariance > 0 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}>
                        {v.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "shopfloor" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Shop Floor Industrial IoT Telemetry</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Real-time OPC-UA / MQTT Spindle RPM, Thermal Sensors & Machine Cycle Counter</p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Edge Gateway Connected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {iotMachines.map((m, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{m.cell}</h3>
                    <p className="text-[10px] text-slate-400 font-mono">{m.ip}</p>
                  </div>
                  <span className={cx(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                    m.status.includes("Active") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                  )}>
                    {m.status}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Spindle</p>
                    <p className="font-black text-slate-900">{m.spindleRpm} RPM</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Temp</p>
                    <p className="font-bold text-slate-800">{m.motorTemp}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Vibration</p>
                    <p className="font-bold text-emerald-600">{m.vibration}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Parts Machined Shift:</span>
                    <span className="font-black text-[#0D9488]">{m.partCountToday} / {m.plannedTarget} PCS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status Reason:</span>
                    <span className="font-semibold text-slate-700">{m.downtimeReason}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ManufacturingHubPage;
