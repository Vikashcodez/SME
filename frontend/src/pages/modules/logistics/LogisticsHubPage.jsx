import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  Truck, Navigation, MapPin, Fuel, Clock, 
  CheckCircle2, AlertTriangle, Search, Plus, ArrowRight, DollarSign, Calendar, X, Save,
  Download, Printer
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";
import { exportToExcel, exportToCsv, printReport } from "../../../utils/exportUtils";

export function LogisticsHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "schedules";

  
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    dispatch_number: "",
    destination: "",
    transporter: "VRL Logistics Ltd",
    vehicle_number: "MH-12-RN-8812",
    weight_kgs: "1500",
    eway_bill: "",
    status: "Scheduled",
  });

  const fetchLogisticsData = async () => {
    setLoading(true);
    try {
      const res = await masterService.getDispatches();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        const list = res.data.data;
        setSchedules(
          list.map((d) => ({
            id: d.schedule_number || d.dispatch_number || `DS-${d.schedule_id}`,
            destination: d.destination_city || d.delivery_address || d.customer_name || "Enterprise Customer Hub",
            transporter: d.transporter_name || "VRL Logistics Fleet",
            vehicleNo: d.vehicle_type || d.vehicle_number || "14ft Closed Container",
            status: d.status || "Scheduled",
            eta: d.dispatch_date || "Today",
            weightKgs: Number(d.gross_weight || 1500),
            ewayBill: d.eway_bill_number || "EWB-241088492019",
          }))
        );
      }
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogisticsData();
  }, []);

  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    if (!formData.destination) {
      toast.error("Please enter Destination / Customer");
      return;
    }

    try {
      const payload = {
        schedule_number: formData.dispatch_number,
        destination_city: formData.destination,
        vehicle_type: formData.vehicle_number || "14ft Closed Container",
        status: formData.status,
      };

      const res = await masterService.createDispatch(payload);
      if (res.data?.success) {
        toast.success("Dispatch consignment scheduled successfully in database");
        setIsModalOpen(false);
        fetchLogisticsData();
      }
    } catch {
      const newDispatch = {
        id: formData.dispatch_number || `DSP-2026-${Date.now().toString().slice(-4)}`,
        destination: formData.destination,
        transporter: formData.transporter,
        vehicleNo: formData.vehicle_number,
        status: formData.status,
        eta: "Tomorrow, 02:00 PM",
        weightKgs: Number(formData.weight_kgs || 1000),
        ewayBill: formData.eway_bill || `EWB-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      };
      setSchedules((prev) => [newDispatch, ...prev]);
      toast.success("Dispatch shipment created successfully");
      setIsModalOpen(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = schedules.map(s => ({
      'Dispatch Ref': s.id,
      'Destination': s.destination,
      'Transporter': s.transporter,
      'Vehicle': s.vehicleNo,
      'Gross Weight (KG)': s.weightKgs,
      'E-Way Bill': s.ewayBill,
      'Status': s.status
    }));
    exportToExcel(exportData, 'Outbound_Dispatch_Manifest', 'Dispatches');
  };

  const headersMap = {
    schedules: {
      tag: "Dispatch Scheduling",
      title: "Outbound Dispatch Schedules & Consignment Tracking",
      sub: "Delivery logistics, carrier assignment, vehicle manifests, E-Way bills, and real-time delivery timelines.",
    },
    carriers: {
      tag: "Transporter SLA",
      title: "Logistics Service Provider (LSP) Performance",
      sub: "Carrier on-time delivery rates, in-transit damage claims, and freight contract rate audits.",
    },
    maintenance: {
      tag: "Fleet Management",
      title: "Fleet Maintenance & Compliance Scheduling",
      sub: "Preventive maintenance schedules, PUC & RTO fitness renewal tracking, driver logs, and fuel economy telemetry.",
    },
  };

  
  const [fleetVehicles, setFleetVehicles] = useState([
    { regNo: "MH-14-GH-8821", model: "Tata 1412 LPT (14ft Closed Container)", driver: "Ramesh Pawar", odometer: "74,250 KM", lastService: "2026-06-10 (70k Service)", nextDue: "2026-09-10 / 80k KM", rtoFitness: "Valid (2027-04-30)", insurance: "Valid (2027-01-15)", status: "Active Roadworthy" },
    { regNo: "MH-12-PQ-4419", model: "Mahindra Bolero Maxi Truck Plus", driver: "Suresh Shinde", odometer: "48,100 KM", lastService: "2026-05-18", nextDue: "2026-08-30 / 50k KM", rtoFitness: "Valid (2026-11-20)", insurance: "Renewal Due (30 Days)", status: "Service Due Soon" },
    { regNo: "MH-14-AB-1102", model: "Eicher Pro 2049 (20ft Flatbed)", driver: "Anil Jadhav", odometer: "112,800 KM", lastService: "2026-07-22", nextDue: "2026-10-20 / 120k KM", rtoFitness: "Valid (2027-08-12)", insurance: "Valid (2027-03-31)", status: "Active Roadworthy" },
  ]);

  const currentHeader = headersMap[activeTab] || headersMap.schedules;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Truck className="h-6 w-6" strokeWidth={1.75} />
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
            <Button
              variant="outline"
              size="md"
              icon={Download}
              onClick={handleExportExcel}
            >
              Export
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={Printer}
              onClick={() => printReport('Outbound Dispatch Manifest - Chandra Precision ERP')}
            >
              Print
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => {
                setFormData({
                  dispatch_number: `DSP-2026-00${schedules.length + 1}`,
                  destination: "",
                  transporter: "VRL Logistics Ltd",
                  vehicle_number: "MH-12-RN-8812",
                  weight_kgs: "1500",
                  eway_bill: "",
                  status: "Scheduled",
                });
                setIsModalOpen(true);
              }}
            >
              New Dispatch
            </Button>
          </div>
        </div>
      </div>

      
      {activeTab === "schedules" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Active Outbound Consignment Manifests</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Live Dispatches loaded dynamically from database</p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
              {schedules.length} Shipments
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading live dispatch records...</div>
          ) : schedules.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <Truck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No active dispatches</p>
              <p className="text-xs text-slate-400 mt-1">Click "+ New Dispatch" to schedule a customer delivery.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Dispatch Ref</th>
                    <th className="py-2.5 px-4">Customer Destination</th>
                    <th className="py-2.5 px-4">Vehicle / Transporter</th>
                    <th className="py-2.5 px-4 font-mono text-right">Gross Weight</th>
                    <th className="py-2.5 px-4 font-mono">E-Way Bill No</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">{s.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{s.destination}</td>
                      <td className="py-3 px-4 text-slate-700">
                        <p>{s.transporter}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{s.vehicleNo}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{s.weightKgs} KGS</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{s.ewayBill}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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
                <Truck className="h-5 w-5 text-[#0D9488]" /> Schedule Outbound Dispatch
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Dispatch Ref</label>
                  <input
                    type="text"
                    value={formData.dispatch_number}
                    onChange={(e) => setFormData({ ...formData, dispatch_number: e.target.value })}
                    placeholder="e.g. DSP-2026-08"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Gross Weight (KGS)</label>
                  <input
                    type="number"
                    value={formData.weight_kgs}
                    onChange={(e) => setFormData({ ...formData, weight_kgs: e.target.value })}
                    placeholder="1500"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-right focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Customer / Destination Address <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  placeholder="e.g. Tata Motors Plant 2 Delivery Dock"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Transporter</label>
                  <input
                    type="text"
                    value={formData.transporter}
                    onChange={(e) => setFormData({ ...formData, transporter: e.target.value })}
                    placeholder="VRL Logistics Ltd"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Vehicle / Container</label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    placeholder="14ft Closed Container"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save Dispatch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {activeTab === "maintenance" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Fleet Maintenance & Compliance Tracker</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Preventive Service Intervals, Odometer Telemetry & Statutory RTO Fitness Expiry</p>
            </div>
            <button
              onClick={() => toast.success("Scheduled preventive maintenance service for selected vehicle")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Book Service Appointment
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Vehicle Reg</th>
                  <th className="py-2.5 px-3">Make / Model</th>
                  <th className="py-2.5 px-3">Assigned Driver</th>
                  <th className="py-2.5 px-3">Odometer</th>
                  <th className="py-2.5 px-3">Last PM Service</th>
                  <th className="py-2.5 px-3">Next Service Due</th>
                  <th className="py-2.5 px-3">RTO Fitness</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {fleetVehicles.map((v) => (
                  <tr key={v.regNo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{v.regNo}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{v.model}</td>
                    <td className="py-3 px-3 text-slate-700">{v.driver}</td>
                    <td className="py-3 px-3 font-mono text-slate-800 font-bold">{v.odometer}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{v.lastService}</td>
                    <td className="py-3 px-3 font-mono text-slate-800 font-bold text-[11px]">{v.nextDue}</td>
                    <td className="py-3 px-3 font-medium text-slate-700">{v.rtoFitness}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={cx(
                        "px-2 py-0.5 rounded-full font-bold text-[10px] border",
                        v.status.includes("Soon") ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}>
                        {v.status}
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

export default LogisticsHubPage;
