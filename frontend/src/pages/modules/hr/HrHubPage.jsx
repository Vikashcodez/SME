import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { 
  Users, UserCheck, Clock, DollarSign, Calendar, 
  Plus, Search, Briefcase, FileText, CheckCircle2, Shield, X, Save
} from "lucide-react";
import { toast } from "react-hot-toast";
import { fmtMoney, cx } from "../../../utils/format";
import { Button } from "../../../components/ui/Button";

export function HrHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "employees";

  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    employee_code: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    designation: "CNC Machining Operator",
    department: "Manufacturing",
    shift: "Shift A (07:00 - 15:30)",
    basic_salary: "45000",
    date_of_joining: new Date().toISOString().slice(0, 10),
  });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await masterService.getEmployees();
      if (res.data?.success && Array.isArray(res.data.data)) {
        const list = res.data.data;
        setEmployees(
          list.map((e) => ({
            id: e.employee_code || e.id,
            name: `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.name,
            role: e.designation || e.role || "Staff",
            dept: e.department || "General",
            shift: e.shift || "General (09:00 - 18:00)",
            status: e.status || "On Duty",
            salary: Number(e.gross_salary || e.basic_salary || e.salary || 45000),
            joinDate: e.date_of_joining || "2022-01-01",
          }))
        );
      }
    } catch {
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!formData.first_name) {
      toast.error("Please enter Employee First Name");
      return;
    }
    try {
      await masterService.createEmployee({
        employee_code: formData.employee_code || `EMP-${Date.now().toString().slice(-4)}`,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        designation: formData.designation,
        department: formData.department,
        basic_salary: Number(formData.basic_salary || 45000),
        date_of_joining: formData.date_of_joining,
      });
      toast.success("Employee record saved successfully");
      setIsModalOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add employee");
    }
  };

  
  const [attendance, setAttendance] = useState([
    { empId: "EMP-001", name: "Santosh Mane", inTime: "06:55 AM", outTime: "03:35 PM", totalHours: "8.6 hrs", overtime: "0.6 hrs", biometricStatus: "Verified Punch" },
    { empId: "EMP-002", name: "Pooja Kulkarni", inTime: "08:58 AM", outTime: "06:05 PM", totalHours: "9.1 hrs", overtime: "0.0 hrs", biometricStatus: "Verified Punch" },
    { empId: "EMP-004", name: "Suresh Patil", inTime: "09:02 AM", outTime: "06:15 PM", totalHours: "9.2 hrs", overtime: "0.0 hrs", biometricStatus: "Verified Punch" },
  ]);

  
  const [payrollRows, setPayrollRows] = useState([
    { id: "PAY-001", name: "Santosh Mane", basic: 27000, hra: 10800, allowances: 7200, gross: 45000, pf: 3240, esi: 0, tds: 1200, net: 40560 },
    { id: "PAY-002", name: "Pooja Kulkarni", basic: 45000, hra: 18000, allowances: 12000, gross: 75000, pf: 5400, esi: 0, tds: 6500, net: 63100 },
    { id: "PAY-003", name: "Ramesh Shinde", basic: 31200, hra: 12480, allowances: 8320, gross: 52000, pf: 3744, esi: 0, tds: 2100, net: 46156 },
  ]);

  
  const [jobRequisitions, setJobRequisitions] = useState([
    { reqId: "REQ-2026-04", position: "Senior CNC Macro Programmer (Fanuc/Mazatrol)", dept: "Manufacturing", openings: 2, applicants: 14, status: "Active Interviewing" },
    { reqId: "REQ-2026-05", position: "CMM Metrology Quality Engineer", dept: "Quality Assurance", openings: 1, applicants: 8, status: "Screening" },
  ]);

  const [appraisals, setAppraisals] = useState([
    { emp: "Santosh Mane", role: "CNC Shop Lead", rating: "4.8 / 5.0 (Exceeds Expectations)", cycle: "FY 2025-26 Annual", recommendations: "Promote to Shop Floor Superintendent" },
    { emp: "Pooja Kulkarni", role: "Sales Manager", rating: "4.9 / 5.0 (Outstanding)", cycle: "FY 2025-26 Annual", recommendations: "Eligible for Key Account Retention Bonus" },
  ]);

  const headersMap = {
    employees: {
      tag: "Personnel Directory",
      title: "Personnel Directory & Shift Rosters",
      sub: "Comprehensive employee records, department allocations, shift rosters, and current duty statuses.",
    },
    attendance: {
      tag: "Biometric Telemetry",
      title: "Daily Biometric Shift Attendance",
      sub: "Real-time punch-in/out records, shift compliance, and automated overtime computations.",
    },
    payroll: {
      tag: "Salary & Statutory",
      title: "Monthly Salary Register & Statutory Payslips",
      sub: "Auto-computed Basic, HRA, Provident Fund (PF), ESIC, Professional Tax, and TDS deductions.",
    },
    talent: {
      tag: "HR Governance",
      title: "Talent Acquisition & Performance Appraisals",
      sub: "Active job requisitions, candidate screening pipeline, and annual 360 performance reviews.",
    },
    training: {
      tag: "Skills & LMS",
      title: "Training & Skills Matrix / LMS",
      sub: "Technical competency matrix (L1 to L4), machine operator certifications, safety modules, and LMS tracking.",
    },
    portal: {
      tag: "Self-Service",
      title: "Employee Self-Service Portal",
      sub: "Leave balance ledger, digital leave requests, monthly payslip downloads, and medical/travel reimbursement claims.",
    },
  };

  
  const [trainingPrograms, setTrainingPrograms] = useState([
    { id: "TRN-2026-01", course: "5-Axis CNC Programming & Toolpath Optimization", domain: "Machining Technology", targetRole: "CNC Operators & Programmers", enrolled: 12, completed: 10, completionPct: "83.3%", skillLevel: "Level 3 (Advanced)", nextRefresher: "2027-02-15", status: "In Progress" },
    { id: "TRN-2026-02", course: "IATF 16949:2016 Internal Auditor Certification", domain: "Quality & Compliance", targetRole: "QC Engineers & Inspectors", enrolled: 6, completed: 6, completionPct: "100%", skillLevel: "Level 4 (Expert Auditor)", nextRefresher: "2027-05-10", status: "Completed" },
    { id: "TRN-2026-03", course: "Industrial Safety, PPE & Fire Evacuation Protocols", domain: "EHS Safety", targetRole: "All Plant Floor Personnel", enrolled: 45, completed: 42, completionPct: "93.3%", skillLevel: "Mandatory Safety", nextRefresher: "2026-11-01", status: "Ongoing" },
  ]);

  const [essClaims, setEssClaims] = useState([
    { claimId: "CLM-2026-041", employee: "Santosh Mane", claimType: "Client Site Travel & Fuel", amount: 3450, receiptAttached: "3 Fuel Slips Attached", submittedDate: "2026-08-22", approvalStage: "Approved by HOD", status: "Reimbursed in Aug Payroll" },
    { claimId: "CLM-2026-042", employee: "Pooja Kulkarni", claimType: "Client Dinner & Hospitality", amount: 4800, receiptAttached: "Hotel Invoice Attached", submittedDate: "2026-08-25", approvalStage: "Pending Finance Clearance", status: "In Approval Workflow" },
  ]);

  const [leaveBalances, setLeaveBalances] = useState([
    { leaveType: "Privilege Leave (PL)", totalEntitled: 18, consumed: 6, balance: 12 },
    { leaveType: "Casual / Sick Leave (CL/SL)", totalEntitled: 12, consumed: 4, balance: 8 },
    { leaveType: "Compensatory Off (Comp-Off)", totalEntitled: 3, consumed: 1, balance: 2 },
  ]);

  const currentHeader = headersMap[activeTab] || headersMap.employees;

  return (
    <div className="space-y-6">
      
      <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Users className="h-6 w-6" strokeWidth={1.75} />
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
                  employee_code: `EMP-00${employees.length + 1}`,
                  first_name: "",
                  last_name: "",
                  email: "",
                  phone: "+91 ",
                  designation: "CNC Turning Specialist",
                  department: "Manufacturing",
                  shift: "Shift A (07:00 - 15:30)",
                  basic_salary: "45000",
                  date_of_joining: new Date().toISOString().slice(0, 10),
                });
                setIsModalOpen(true);
              }}
            >
              Add Employee
            </Button>
          </div>
        </div>
      </div>

      
      {activeTab === "employees" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Registered Plant Workforce</h2>
            <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Live Staff Directory loaded dynamically from database</p>
          </div>

          {employees.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No employee records found</p>
              <p className="text-xs text-slate-400 mt-1">Click "+ Add Employee" to register your first staff member.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {employees.map((emp) => (
                <div key={emp.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 hover:border-[#0D9488] transition-all shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-[#0D9488]">{emp.id}</span>
                      <h3 className="font-bold text-sm text-slate-900 mt-0.5">{emp.name}</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {emp.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">{emp.role}</p>
                    <p className="text-slate-500">{emp.dept}</p>
                    <p className="text-[11px] font-mono text-slate-400">{emp.shift}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Gross:</span>
                    <span className="font-bold text-slate-900">₹{Number(emp.salary || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#0D9488]" /> Add Employee Record
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Employee Code</label>
                  <input
                    type="text"
                    value={formData.employee_code}
                    onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    placeholder="e.g. EMP-005"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Monthly Basic (₹)</label>
                  <input
                    type="number"
                    value={formData.basic_salary}
                    onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                    placeholder="45000"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold text-right focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">First Name <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="e.g. Ramesh"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="e.g. Shinde"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-[#0D9488]"
                  >
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                    <option value="Procurement">Procurement</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="Finance & Accounts">Finance & Accounts</option>
                    <option value="HR & Admin">HR & Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g. Quality Metrology Engineer"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ramesh.s@company.com"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9822 123456"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save Employee
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {activeTab === "training" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Technical Skills Matrix & Learning Management (LMS)</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Operator Competency Levels (L1 to L4), Safety Certifications & Refresher Due Tracking</p>
            </div>
            <button
              onClick={() => toast.success("Enrolled employee cohort in new certification program")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Enroll Training Batch
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Course Code</th>
                  <th className="py-2.5 px-3">Curriculum / Program Title</th>
                  <th className="py-2.5 px-3">Domain</th>
                  <th className="py-2.5 px-3">Target Roles</th>
                  <th className="py-2.5 px-3">Skill Level</th>
                  <th className="py-2.5 px-3 text-center">Enrolled / Passed</th>
                  <th className="py-2.5 px-3">Next Refresher</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {trainingPrograms.map((tp) => (
                  <tr key={tp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{tp.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{tp.course}</td>
                    <td className="py-3 px-3 text-slate-600">{tp.domain}</td>
                    <td className="py-3 px-3 text-slate-700">{tp.targetRole}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{tp.skillLevel}</td>
                    <td className="py-3 px-3 text-center font-bold text-[#0D9488]">{tp.completed} / {tp.enrolled} ({tp.completionPct})</td>
                    <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{tp.nextRefresher}</td>
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

      
      {activeTab === "portal" && (
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaveBalances.map((lb, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-card space-y-1">
                <p className="text-xs font-bold text-slate-500">{lb.leaveType}</p>
                <div className="flex justify-between items-baseline pt-1">
                  <p className="text-2xl font-black text-slate-900">{lb.balance} Days</p>
                  <p className="text-xs text-slate-500 font-medium">Used: {lb.consumed} / {lb.totalEntitled}</p>
                </div>
              </div>
            ))}
          </div>

          
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Reimbursements & Expense Claims</h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Travel, Food, Client Hospitality & Medical Claims</p>
              </div>
              <button
                onClick={() => toast.success("Submitted expense claim for manager approval")}
                className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" /> Submit New Claim
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Claim ID</th>
                    <th className="py-2.5 px-3">Claimant</th>
                    <th className="py-2.5 px-3">Expense Category</th>
                    <th className="py-2.5 px-3 text-right">Claim Amount</th>
                    <th className="py-2.5 px-3">Receipt Status</th>
                    <th className="py-2.5 px-3">Submitted Date</th>
                    <th className="py-2.5 px-3">Approval Gate</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {essClaims.map((clm) => (
                    <tr key={clm.claimId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{clm.claimId}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{clm.employee}</td>
                      <td className="py-3 px-3 font-medium text-slate-700">{clm.claimType}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">{fmtMoney(clm.amount)}</td>
                      <td className="py-3 px-3 text-slate-600">{clm.receiptAttached}</td>
                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{clm.submittedDate}</td>
                      <td className="py-3 px-3 text-slate-700">{clm.approvalStage}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded-full font-bold text-[10px]">
                          {clm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HrHubPage;
