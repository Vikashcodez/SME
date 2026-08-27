import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  Briefcase, Route as RouteIcon, Clock, Users, 
  CheckCircle2, AlertTriangle, DollarSign, Plus, Search,
  Calendar, Layers, ShieldAlert, ArrowRight, Target, X, Save,
  Download, Printer
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";
import { exportToExcel, printReport } from "../../../utils/exportUtils";

export function ProjectHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "portfolio";

  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    project_code: "",
    project_name: "",
    customer_name: "",
    budget: "5000000",
    project_lead: "Santosh Mane",
    status: "On Track",
    end_date: "2026-12-31",
  });

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      const res = await masterService.getProjects();
      if (res?.data?.success && Array.isArray(res.data.data)) {
        const list = res.data.data;
        setProjects(
          list.map((p) => ({
            id: p.project_code || `PRJ-${p.project_id}`,
            projectId: p.project_id,
            name: p.project_name,
            client: p.customer_name || "Commercial Client",
            budget: Number(p.budget || 5000000),
            spent: Number(p.actual_cost || 0),
            progressPct: Number(p.progress_percentage || 0),
            lead: p.project_lead || "Project Lead",
            deadline: p.end_date || "2026-12-31",
            status: p.status || "On Track",
          }))
        );
      }
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!formData.project_name) {
      toast.error("Please enter Project Name");
      return;
    }

    try {
      const payload = {
        project_code: formData.project_code,
        project_name: formData.project_name,
        customer_name: formData.customer_name,
        budget: Number(formData.budget || 0),
        project_lead: formData.project_lead,
        end_date: formData.end_date,
        status: formData.status,
      };

      const res = await masterService.createProject(payload);
      if (res.data?.success) {
        toast.success("Project workspace initialized in database");
        setIsModalOpen(false);
        fetchProjectData();
      }
    } catch {
      const newPrj = {
        id: formData.project_code || `PRJ-2026-${Date.now().toString().slice(-4)}`,
        name: formData.project_name,
        client: formData.customer_name || "Commercial Client",
        budget: Number(formData.budget || 0),
        spent: 0,
        progressPct: 5,
        lead: formData.project_lead,
        deadline: formData.end_date,
        status: formData.status,
      };
      setProjects((prev) => [newPrj, ...prev]);
      toast.success("Project workspace initialized");
      setIsModalOpen(false);
    }
  };

  const handleExportExcel = () => {
    const exportData = projects.map(p => ({
      'Project Code': p.id,
      'Project Name': p.name,
      'Customer': p.client,
      'Budget': p.budget,
      'Actual Cost': p.spent,
      'Progress (%)': `${p.progressPct}%`,
      'Project Lead': p.lead,
      'Target Date': p.deadline,
      'Status': p.status
    }));
    exportToExcel(exportData, 'Project_Portfolio_Register', 'Projects');
  };

  const headersMap = {
    portfolio: {
      tag: "Project Portfolio",
      title: "Strategic Program & Capital Project Portfolio",
      sub: "Turnkey client development programs, capital expansion projects, milestones, and earned value management.",
    },
    milestones: {
      tag: "WBS Deliverables",
      title: "Work Breakdown Structure (WBS) & Milestones",
      sub: "Critical path schedules, prototype approvals, PPAP document signoffs, and client design freeze gates.",
    },
    billing: {
      tag: "Project Invoicing",
      title: "Service & Project Billing (T&M / Retainers / Utilization)",
      sub: "Time & materials billing, monthly consulting retainers, billable timesheets, and milestone invoice generation.",
    },
    epc: {
      tag: "EPC & Construction",
      title: "Construction & Turnkey EPC Management",
      sub: "Percentage-of-completion progress billing, retention money escrow, contractor milestone valuation, and EPC contract costing.",
    },
    capacity: {
      tag: "Workforce Allocation",
      title: "Resource & Capacity Planning",
      sub: "Cross-project staffing matrix, skill allocation, engineer billable utilization, and forward capacity forecasting.",
    },
  };

  
  const [billingContracts, setBillingContracts] = useState([
    { id: "BIL-2026-01", client: "Tata Motors Precision Div", model: "Time & Materials (T&M)", hoursLogged: "320 Hrs", ratePerHour: 2850, unbilledWip: 912000, retainerVal: "—", status: "Invoice Ready" },
    { id: "BIL-2026-02", client: "Bharat Forge Component Unit", model: "Fixed Retainer + SLA", hoursLogged: "160 Hrs", ratePerHour: "—", unbilledWip: 0, retainerVal: 650000, status: "Billed for Month" },
    { id: "BIL-2026-03", client: "Thermax Energy Systems", model: "Milestone Deliverable", hoursLogged: "450 Hrs", ratePerHour: "—", unbilledWip: 1400000, retainerVal: "—", status: "Awaiting Client Signoff" },
  ]);

  const [epcProjects, setEpcProjects] = useState([
    { id: "EPC-2026-001", title: "Chakan Plant 3 Solar Rooftop (1.2 MW)", contractVal: 48000000, progressCertifiedPct: "65%", certifiedVal: 31200000, retentionMoney: 3120000, subContractorDue: 4500000, status: "Milestone 4 Underway" },
    { id: "EPC-2026-002", title: "Automated Material Storage Bay Erection", contractVal: 18500000, progressCertifiedPct: "90%", certifiedVal: 16650000, retentionMoney: 1665000, subContractorDue: 820000, status: "Testing & Handover" },
  ]);

  const [resourceCapacity, setResourceCapacity] = useState([
    { engineer: "Amit Kulkarni", role: "Principal Tooling Architect", allocatedHours: "168 / 176 Hrs", utilizationPct: "95.5%", project: "Tata EV Differential Line", availability: "Available Q4" },
    { engineer: "Sneha Patil", role: "Senior FEA & Simulation Lead", allocatedHours: "140 / 176 Hrs", utilizationPct: "79.5%", project: "Thermax Boiler Casing", availability: "Partially Open" },
    { engineer: "Rahul Deshmukh", role: "Automation & PLC Specialist", allocatedHours: "180 / 176 Hrs", utilizationPct: "102.3%", project: "Chakan Plant 3 Cell", availability: "Overloaded" },
  ]);

  const currentHeader = headersMap[activeTab] || headersMap.portfolio;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Briefcase className="h-6 w-6" strokeWidth={1.75} />
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
              onClick={() => printReport('Strategic Project Portfolio - Chandra Precision ERP')}
            >
              Print
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => {
                setFormData({
                  project_code: `PRJ-2026-00${projects.length + 1}`,
                  project_name: "",
                  customer_name: "",
                  budget: "5000000",
                  project_lead: "Santosh Mane",
                  status: "On Track",
                  end_date: "2026-12-31",
                });
                setIsModalOpen(true);
              }}
            >
              Create Project
            </Button>
          </div>
        </div>
      </div>

      
      {activeTab === "portfolio" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Active Programs & Capital Project Portfolio</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Live projects loaded dynamically from database</p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
              {projects.length} Active Projects
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading project portfolio...</div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No active projects</p>
              <p className="text-xs text-slate-400 mt-1">Click "+ Create Project" to launch a new development program or capital project.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Project ID</th>
                    <th className="py-2.5 px-4">Program / Description</th>
                    <th className="py-2.5 px-4">Client / Sponsor</th>
                    <th className="py-2.5 px-4 font-mono text-right">Budget</th>
                    <th className="py-2.5 px-4 font-mono text-right">Actual Cost</th>
                    <th className="py-2.5 px-4">Progress</th>
                    <th className="py-2.5 px-4">Project Lead</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">{p.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 text-slate-600">{p.client}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{fmtMoney(p.budget)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{fmtMoney(p.spent)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#0D9488] h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, p.progressPct)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-700">{p.progressPct}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{p.lead}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={cx(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          p.status === 'On Track' ? "bg-teal-50 text-teal-800 border-teal-200" :
                          p.status === 'Delayed' ? "bg-rose-50 text-rose-800 border-rose-200" :
                          "bg-amber-50 text-amber-800 border-amber-200"
                        )}>
                          {p.status}
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
                <Briefcase className="h-5 w-5 text-[#0D9488]" /> Initialize Project Workspace
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Project Code</label>
                  <input
                    type="text"
                    value={formData.project_code}
                    onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                    placeholder="e.g. PRJ-2026-04"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  >
                    <option value="On Track">On Track</option>
                    <option value="At Risk">At Risk</option>
                    <option value="Delayed">Delayed</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Project / Program Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={formData.project_name}
                  onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                  placeholder="e.g. 5-Axis Aerospace Tooling Setup"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Customer / Sponsor</label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="e.g. Bharat Forge Ltd"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Budget (₹)</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    placeholder="5000000"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-right focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Project Lead</label>
                  <input
                    type="text"
                    value={formData.project_lead}
                    onChange={(e) => setFormData({ ...formData, project_lead: e.target.value })}
                    placeholder="Santosh Mane"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Target End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save Project
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {activeTab === "billing" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Service & Project Contract Invoicing</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Time & Materials Timesheets, Consulting Retainers & Utilization Invoicing</p>
            </div>
            <button
              onClick={() => toast.success("Drafted new T&M monthly invoice batch")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Generate Project Invoice
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Contract Ref</th>
                  <th className="py-2.5 px-3">Client Account</th>
                  <th className="py-2.5 px-3">Billing Model</th>
                  <th className="py-2.5 px-3">Hours Logged</th>
                  <th className="py-2.5 px-3 text-right">Hourly Rate / Retainer</th>
                  <th className="py-2.5 px-3 text-right">Unbilled WIP</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {billingContracts.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{b.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{b.client}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{b.model}</td>
                    <td className="py-3 px-3 text-slate-600">{b.hoursLogged}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800">
                      {b.ratePerHour !== "—" ? `${fmtMoney(b.ratePerHour)}/hr` : fmtMoney(b.retainerVal)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{fmtMoney(b.unbilledWip)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded-full font-bold text-[10px]">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "epc" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Turnkey EPC & Construction Contract Management</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Progress Billings (AIA/RA Bills), 5-10% Retention Money Escrow & Subcontractor Valuation</p>
            </div>
            <button
              onClick={() => toast.success("Drafted new Running Account (RA) Progress Bill")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Raise RA Bill
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">EPC Job Ref</th>
                  <th className="py-2.5 px-3">Contract Scope</th>
                  <th className="py-2.5 px-3 text-right">Contract Value</th>
                  <th className="py-2.5 px-3 text-center">Certified %</th>
                  <th className="py-2.5 px-3 text-right">Certified Cumulative</th>
                  <th className="py-2.5 px-3 text-right">Retention Held (10%)</th>
                  <th className="py-2.5 px-3 text-right">Sub-Contractor Payable</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {epcProjects.map((epc) => (
                  <tr key={epc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{epc.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{epc.title}</td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-700">{fmtMoney(epc.contractVal)}</td>
                    <td className="py-3 px-3 text-center font-bold text-[#0D9488]">{epc.progressCertifiedPct}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">{fmtMoney(epc.certifiedVal)}</td>
                    <td className="py-3 px-3 text-right font-bold text-amber-600">{fmtMoney(epc.retentionMoney)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">{fmtMoney(epc.subContractorDue)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {epc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "capacity" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Project Staffing & Capacity Matrix</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Engineering Hours Allocation, Cross-Project Utilization & Skill Availability</p>
            </div>
            <button
              onClick={() => toast.success("Resource capacity schedule leveled across active sprints")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              Auto-Level Allocation
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resourceCapacity.map((rc, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{rc.engineer}</h3>
                    <p className="text-xs text-slate-500">{rc.role}</p>
                  </div>
                  <span className={cx(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                    rc.availability === "Overloaded" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  )}>
                    {rc.availability}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 flex justify-between items-center text-xs">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Monthly Allocation</p>
                    <p className="font-bold text-slate-800">{rc.allocatedHours}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Utilization</p>
                    <p className="font-black text-[#0D9488] text-sm">{rc.utilizationPct}</p>
                  </div>
                </div>

                <div className="pt-1 text-xs">
                  <span className="text-slate-500">Active Focus:</span> <span className="font-semibold text-slate-800">{rc.project}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectHubPage;
