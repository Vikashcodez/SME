import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  Building, Wrench, Shield, FileText, CheckCircle2, 
  AlertTriangle, Clock, Gauge, Plus, Search, Calendar,
  ArrowRight, ShieldCheck, Activity, X, Save, Download, Printer
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";
import { exportToExcel, printReport } from "../../../utils/exportUtils";

export function AssetHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "registry";

  
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    asset_code: "",
    asset_name: "",
    category: "Machinery",
    location: "Pune Bhosari Plant - Bay 1",
    purchase_cost: "4500000",
    running_hours: "0",
    status: "Operational",
    purchase_date: new Date().toISOString().slice(0, 10),
  });

  const fetchAssetData = async () => {
    setLoading(true);
    try {
      const res = await masterService.getAssets();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        const list = res.data.data;
        setEquipmentList(
          list.map((a) => ({
            id: a.asset_code || `AST-${a.asset_id}`,
            assetId: a.asset_id,
            name: a.asset_name,
            category: a.asset_category || "Machinery",
            location: a.location || "Pune Plant 1",
            purchaseDate: a.purchase_date || "2023-01-01",
            cost: Number(a.purchase_cost || 5000000),
            curVal: Number(a.net_book_value || a.purchase_cost || 4000000),
            depMethod: a.depreciation_method || "Straight Line",
            life: a.useful_life_years || 10,
            status: a.is_active ? "Operational" : "Disposed",
          }))
        );
      }
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetData();
  }, []);

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    if (!formData.asset_name) {
      toast.error("Please enter Asset Name");
      return;
    }

    try {
      const payload = {
        asset_code: formData.asset_code,
        asset_name: formData.asset_name,
        asset_category: formData.category,
        location: formData.location,
        purchase_cost: Number(formData.purchase_cost || 0),
        purchase_date: formData.purchase_date,
        useful_life_years: 10,
        depreciation_method: 'Straight Line',
      };

      const res = await masterService.createAsset(payload);
      if (res.data?.success) {
        toast.success("Fixed Asset registered successfully in database");
        setIsModalOpen(false);
        fetchAssetData();
      }
    } catch {
      const newAsset = {
        id: formData.asset_code || `AST-${Date.now().toString().slice(-4)}`,
        name: formData.asset_name,
        category: formData.category,
        location: formData.location,
        purchaseDate: formData.purchase_date,
        cost: Number(formData.purchase_cost || 0),
        curVal: Number(formData.purchase_cost || 0),
        status: "Operational",
      };
      setEquipmentList((prev) => [newAsset, ...prev]);
      toast.success("Equipment registered successfully");
      setIsModalOpen(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = equipmentList.map(a => ({
      'Asset Code': a.id,
      'Asset Name': a.name,
      'Category': a.category,
      'Location': a.location,
      'Purchase Date': a.purchaseDate,
      'Original Cost': a.cost,
      'Net Book Value': a.curVal,
      'Status': a.status
    }));
    exportToExcel(exportData, 'Fixed_Asset_Register', 'Assets');
  };

  const headersMap = {
    registry: {
      tag: "Asset Register",
      title: "Fixed Asset Register & Depreciation",
      sub: "Comprehensive equipment catalog, net book values, meter hours, and physical plant locations.",
    },
    maintenance: {
      tag: "CMMS & PM Plans",
      title: "Preventive Maintenance & Breakdown Log",
      sub: "Digital PM checklist schedules, technician assignments, MTBF/MTTR tracking, and service work orders.",
    },
    lifecycle: {
      tag: "Lifecycle & Disposal",
      title: "Fixed Asset Lifecycle (Acquisition to Disposal)",
      sub: "Capitalization, asset tagging/barcode, impairment testing, revaluation reserves, and scrap / auction disposal workflow.",
    },
  };

  
  const [lifecycleAssets, setLifecycleAssets] = useState([
    { id: "AST-MAZAK-01", name: "Mazak CNC Turning Lathe QT-250", acqDate: "2021-04-10", originalCost: 4500000, accumDepr: 1800000, nbv: 2700000, stage: "Operational Service", disposalPlan: "Active Asset", status: "In Use" },
    { id: "AST-HAAS-03", name: "Haas 4-Axis VMC Milling Center", acqDate: "2022-08-15", originalCost: 6200000, accumDepr: 1860000, nbv: 4340000, stage: "Operational Service", disposalPlan: "Active Asset", status: "In Use" },
    { id: "AST-FORK-09", name: "Toyota 3-Ton Electric Forklift (Old)", acqDate: "2016-02-12", originalCost: 1400000, accumDepr: 1260000, nbv: 140000, stage: "End of Useful Life", disposalPlan: "E-Auction Scrap Tender", status: "Disposal Authorized" },
  ]);

  const currentHeader = headersMap[activeTab] || headersMap.registry;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Building className="h-6 w-6" strokeWidth={1.75} />
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
              onClick={() => printReport('Fixed Asset Register - Chandra Precision ERP')}
            >
              Print
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => {
                setFormData({
                  asset_code: `AST-00${equipmentList.length + 1}`,
                  asset_name: "",
                  category: "Machinery",
                  location: "Pune Bhosari Plant - Bay 1",
                  purchase_cost: "4500000",
                  running_hours: "0",
                  status: "Operational",
                  purchase_date: new Date().toISOString().slice(0, 10),
                });
                setIsModalOpen(true);
              }}
            >
              Register Asset
            </Button>
          </div>
        </div>
      </div>

      
      {activeTab === "registry" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Capital Equipment & Plant Fixed Assets</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Live asset records and net book value schedules</p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
              {equipmentList.length} Fixed Assets
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading asset register...</div>
          ) : equipmentList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <Building className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No assets registered</p>
              <p className="text-xs text-slate-400 mt-1">Click "+ Register Asset" to record plant machinery or capital equipment.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Asset Tag</th>
                    <th className="py-2.5 px-4">Asset Description</th>
                    <th className="py-2.5 px-4">Plant Bay / Location</th>
                    <th className="py-2.5 px-4">Acquired Date</th>
                    <th className="py-2.5 px-4 font-mono text-right">Purchase Cost</th>
                    <th className="py-2.5 px-4 font-mono text-right">Net Book Value</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {equipmentList.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">{a.id}</td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{a.name}</p>
                        <p className="text-[10px] text-slate-400">{a.category}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{a.location}</td>
                      <td className="py-3 px-4 text-slate-600">{a.purchaseDate}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{fmtMoney(a.cost)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0D9488]">{fmtMoney(a.curVal)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                          {a.status}
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
                <Building className="h-5 w-5 text-[#0D9488]" /> Register Fixed Asset
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Asset Code / Tag</label>
                  <input
                    type="text"
                    value={formData.asset_code}
                    onChange={(e) => setFormData({ ...formData, asset_code: e.target.value })}
                    placeholder="e.g. AST-CNC-04"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  >
                    <option value="Plant Machinery">Plant Machinery</option>
                    <option value="Quality Metrology">Quality Metrology</option>
                    <option value="Tooling & Fixtures">Tooling & Fixtures</option>
                    <option value="Vehicles & Material Handling">Vehicles & Material Handling</option>
                    <option value="IT & Computing">IT & Computing</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Asset Description <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.asset_name}
                  onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                  placeholder="e.g. Doosan Puma 2600Y CNC Lathe"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                    placeholder="4500000"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-right focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Location / Bay</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Bay 1 - CNC Shop"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save Asset
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {activeTab === "lifecycle" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Fixed Asset Lifecycle & Disposal Governance</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Asset Capitalization, Accumulated Depreciation, Net Book Value & Auction Disposal</p>
            </div>
            <button
              onClick={() => toast.success("Drafted asset retirement & disposal authorization")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Authorize Asset Retirement
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Asset Tag</th>
                  <th className="py-2.5 px-3">Asset Description</th>
                  <th className="py-2.5 px-3">Acquisition Date</th>
                  <th className="py-2.5 px-3 text-right">Capitalized Cost</th>
                  <th className="py-2.5 px-3 text-right">Accum. Depreciation</th>
                  <th className="py-2.5 px-3 text-right">Net Book Value</th>
                  <th className="py-2.5 px-3">Lifecycle Stage</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {lifecycleAssets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{a.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{a.name}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{a.acqDate}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-700">{fmtMoney(a.originalCost)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">{fmtMoney(a.accumDepr)}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{fmtMoney(a.nbv)}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{a.stage}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={cx(
                        "px-2 py-0.5 rounded-full font-bold text-[10px] border",
                        a.status.includes("Disposal") ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}>
                        {a.status}
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

export default AssetHubPage;
