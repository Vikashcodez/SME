import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building,
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  Calendar, 
  ArrowUpRight,
  ArrowDownRight,
  UserCheck, 
  MapPin, 
  Phone, 
  Mail, 
  Briefcase, 
  Plus, 
  RefreshCw, 
  FileText, 
  Check, 
  X,
  Search,
  Filter,
  ShieldCheck,
  Package,
  Layers,
  ChevronRight
} from 'lucide-react';

const BranchAdminDashboard = () => {
  const { user } = useAuth();

  const [timeRange, setTimeRange] = useState('This Week');
  const [staffSearch, setStaffSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Mock stats
  const stats = [
    {
      title: 'Branch Staff',
      value: '18',
      subtitle: '16 Present today',
      change: '+2 this month',
      isPositive: true,
      icon: Users,
      color: '#2563eb',
      bgColor: '#eff6ff'
    },
    {
      title: "Today's Attendance",
      value: '94.4%',
      subtitle: '17/18 Check-ins logged',
      change: '+3.1% vs avg',
      isPositive: true,
      icon: UserCheck,
      color: '#10b981',
      bgColor: '#ecfdf5'
    },
    {
      title: 'Branch Revenue (MTD)',
      value: '₹4,85,200',
      subtitle: 'Target: ₹5,00,000',
      change: '+14.2% MoM',
      isPositive: true,
      icon: TrendingUp,
      color: '#8b5cf6',
      bgColor: '#f5f3ff'
    },
    {
      title: 'Active Tasks & Orders',
      value: '24',
      subtitle: '19 Done, 4 Active, 1 Due',
      change: '92% on-time',
      isPositive: true,
      icon: Briefcase,
      color: '#f59e0b',
      bgColor: '#fffbeb'
    }
  ];

  // Mock weekly attendance data
  const weeklyAttendance = [
    { day: 'Mon', present: 18, total: 18, rate: 100 },
    { day: 'Tue', present: 17, total: 18, rate: 94.4 },
    { day: 'Wed', present: 18, total: 18, rate: 100 },
    { day: 'Thu', present: 16, total: 18, rate: 88.8 },
    { day: 'Fri', present: 17, total: 18, rate: 94.4 },
    { day: 'Sat', present: 15, total: 18, rate: 83.3 },
    { day: 'Sun', present: 0, total: 18, rate: 0 }
  ];

  // Department distribution
  const departments = [
    { name: 'Sales & Marketing', count: 6, percentage: 33, color: '#3b82f6' },
    { name: 'Operations & Logistics', count: 5, percentage: 28, color: '#10b981' },
    { name: 'Customer Support', count: 4, percentage: 22, color: '#8b5cf6' },
    { name: 'Administration & HR', count: 3, percentage: 17, color: '#f59e0b' },
  ];

  // Staff members list
  const staffMembers = [
    {
      id: 'EMP-001',
      name: 'Rohan Sharma',
      role: 'Operations Lead',
      department: 'Operations & Logistics',
      checkIn: '08:55 AM',
      status: 'Present',
      avatarColor: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'EMP-002',
      name: 'Priya Verma',
      role: 'Senior Sales Executive',
      department: 'Sales & Marketing',
      checkIn: '09:05 AM',
      status: 'Present',
      avatarColor: 'from-emerald-500 to-teal-600'
    },
    {
      id: 'EMP-003',
      name: 'Amit Patel',
      role: 'Support Specialist',
      department: 'Customer Support',
      checkIn: '09:12 AM',
      status: 'Late',
      avatarColor: 'from-amber-500 to-orange-600'
    },
    {
      id: 'EMP-004',
      name: 'Sneha Kulkarni',
      role: 'Accountant',
      department: 'Administration & HR',
      checkIn: '08:50 AM',
      status: 'Present',
      avatarColor: 'from-purple-500 to-pink-600'
    },
    {
      id: 'EMP-005',
      name: 'Vikram Singh',
      role: 'Inventory Manager',
      department: 'Operations & Logistics',
      checkIn: 'Remote',
      status: 'Remote',
      avatarColor: 'from-indigo-500 to-cyan-600'
    },
    {
      id: 'EMP-006',
      name: 'Neha Joshi',
      role: 'Sales Representative',
      department: 'Sales & Marketing',
      checkIn: '-',
      status: 'On Leave',
      avatarColor: 'from-rose-500 to-red-600'
    }
  ];

  // Recent Branch activities
  const recentActivities = [
    {
      id: 1,
      title: 'Daily Attendance Report Compiled',
      desc: '17 staff members recorded present. 1 on approved casual leave.',
      time: '12 mins ago',
      type: 'attendance',
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-50'
    },
    {
      id: 2,
      title: 'Branch Stock Inward Verified',
      desc: 'Batch #SKU-9902 verified by Vikram Singh (50 units received).',
      time: '45 mins ago',
      type: 'inventory',
      icon: Package,
      color: 'text-blue-500 bg-blue-50'
    },
    {
      id: 3,
      title: 'Invoice Batch #INV-BR-104 Dispatched',
      desc: '6 local client invoices sent to headquarters for settlement.',
      time: '2 hours ago',
      type: 'invoice',
      icon: FileText,
      color: 'text-purple-500 bg-purple-50'
    },
    {
      id: 4,
      title: 'New Staff Onboarding Completed',
      desc: 'Priya Verma completed safety and CRM access onboarding.',
      time: 'Yesterday',
      type: 'staff',
      icon: UserCheck,
      color: 'text-amber-500 bg-amber-50'
    }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Dashboard data updated successfully!');
    }, 600);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredStaff = staffMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
                          member.role.toLowerCase().includes(staffSearch.toLowerCase()) ||
                          member.id.toLowerCase().includes(staffSearch.toLowerCase());
    const matchesDept = selectedDept === 'All' || member.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '28px 32px', background: '#fafbfc', minHeight: '100vh' }}>
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[100] p-3.5 bg-white border border-[#e5e7eb] rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="p-1 rounded-full text-emerald-600 bg-emerald-50">
            <Check size={16} />
          </div>
          <span className="text-sm font-medium text-gray-900">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-gray-600 ml-2">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-[#f0f0f0] rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold text-xl shadow-md shadow-emerald-600/20 flex-shrink-0">
              <Building size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 tracking-tight m-0">
                  {user?.branch_name || 'Branch Administration Hub'}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-full">
                  {user?.branch_code || 'MAIN-01'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200/60 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                  Active Operations
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-normal">
                {user?.company_name || 'Company Portal'} • Manager: <span className="text-gray-700 font-medium">{user?.first_name} {user?.last_name}</span> ({user?.email})
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center bg-[#f9fafb] border border-[#f3f4f6] rounded-lg p-1 text-xs">
              {['Today', 'This Week', 'This Month'].map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                    timeRange === range
                      ? 'bg-white text-gray-900 shadow-sm border border-[#e5e7eb]'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            <button
              onClick={handleRefresh}
              className="px-3 py-2 bg-white border border-[#f0f0f0] hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-medium flex items-center gap-2 transition-all"
              title="Refresh Data"
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowReportModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-2 shadow-sm shadow-emerald-600/20 transition-all"
            >
              <FileText size={14} />
              <span>Branch Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white border border-[#f0f0f0] rounded-xl p-5 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11.5px] font-semibold text-gray-500 uppercase tracking-wider">
                    {stat.title}
                  </span>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1 mb-0.5 tracking-tight">
                    {stat.value}
                  </h3>
                  <p className="text-xs text-gray-500 m-0">
                    {stat.subtitle}
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: stat.bgColor, color: stat.color }}
                >
                  <Icon size={20} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#f8f9fa] flex items-center justify-between text-xs">
                <span className={`inline-flex items-center gap-1 font-semibold ${stat.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {stat.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.change}
                </span>
                <span className="text-gray-400 text-[11px]">{timeRange}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section 2: Charts & Visuals Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Weekly Attendance Performance Chart */}
        <div className="lg:col-span-2 bg-white border border-[#f0f0f0] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-gray-900 m-0">Weekly Attendance Overview</h2>
              <p className="text-xs text-gray-500 mt-0.5">Staff presence trend across current operating week</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Present
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full bg-gray-200"></span> Total Staff (18)
              </span>
            </div>
          </div>

          {/* Bar Chart Visual */}
          <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-4 border-b border-[#f3f4f6]">
            {weeklyAttendance.map((item, idx) => {
              const heightPercent = item.total > 0 ? (item.present / item.total) * 100 : 0;
              const isToday = item.day === 'Fri';
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group relative">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-gray-900 text-white text-[10.5px] py-1 px-2 rounded font-medium pointer-events-none whitespace-nowrap z-10">
                    {item.day}: {item.present}/{item.total} ({item.rate}%)
                  </div>

                  <div className="w-full max-w-[38px] h-full flex items-end bg-[#f3f4f6] rounded-t-md overflow-hidden relative">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        isToday
                          ? 'bg-gradient-to-t from-emerald-600 to-teal-500'
                          : heightPercent > 90
                          ? 'bg-emerald-500'
                          : heightPercent > 70
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  </div>
                  <span className={`text-[11px] font-medium ${isToday ? 'text-emerald-700 font-bold' : 'text-gray-500'}`}>
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500 pt-1">
            <span className="flex items-center gap-1.5 font-medium text-emerald-700">
              <ShieldCheck size={15} /> 94.4% Weekly average attendance
            </span>
            <span>Target: 90% Minimum</span>
          </div>
        </div>

        {/* Department / Team Distribution */}
        <div className="bg-white border border-[#f0f0f0] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 m-0">Branch Department Split</h2>
              <span className="text-xs text-gray-500 font-medium">18 Members</span>
            </div>

            <div className="space-y-3.5">
              {departments.map((dept, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-gray-700">{dept.name}</span>
                    <span className="font-semibold text-gray-900">{dept.count} ({dept.percentage}%)</span>
                  </div>
                  <div className="w-full h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${dept.percentage}%`, background: dept.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#f0f0f0] bg-emerald-50/50 rounded-lg p-3 border border-emerald-100">
            <div className="flex items-start gap-2.5">
              <Building size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-950 m-0">Branch Assigned Quota</h4>
                <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                  Branch operating at full capacity. Next staffing review scheduled for end of month.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Today's Staff & Attendance Table */}
      <div className="bg-white border border-[#f0f0f0] rounded-xl mb-6 overflow-hidden">
        <div className="p-5 border-b border-[#f0f0f0] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 m-0">Branch Staff & Attendance Log</h2>
            <p className="text-xs text-gray-500 mt-0.5">Real-time daily shift & attendance status for this branch</p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search staff member..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[#f9fafb] border border-[#f3f4f6] rounded-md text-xs text-gray-900 focus:outline-none focus:bg-white focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-2.5 py-1.5 bg-[#f9fafb] border border-[#f3f4f6] rounded-md text-xs text-gray-700 focus:outline-none"
            >
              <option value="All">All Departments</option>
              <option value="Sales & Marketing">Sales & Marketing</option>
              <option value="Operations & Logistics">Operations</option>
              <option value="Customer Support">Customer Support</option>
              <option value="Administration & HR">Administration</option>
            </select>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus size={14} />
              <span>Add Staff</span>
            </button>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#fafbfc] border-b border-[#f3f4f6]">
                <th className="text-left py-3 px-5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Employee</th>
                <th className="text-left py-3 px-5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Role & Dept</th>
                <th className="text-left py-3 px-5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Check-in Time</th>
                <th className="text-left py-3 px-5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right py-3 px-5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((staff) => (
                <tr key={staff.id} className="hover:bg-[#f9fafb] border-b border-[#f5f5f5] last:border-0 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${staff.avatarColor} text-white flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                        {staff.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-900">{staff.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{staff.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <div className="text-xs font-medium text-gray-800">{staff.role}</div>
                    <div className="text-[11px] text-gray-500">{staff.department}</div>
                  </td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 font-mono">
                      <Clock size={12} className="text-gray-400" />
                      <span>{staff.checkIn}</span>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${
                      staff.status === 'Present'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                        : staff.status === 'Late'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200/70'
                        : staff.status === 'Remote'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/70'
                        : 'bg-rose-50 text-rose-700 border border-rose-200/70'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        staff.status === 'Present' ? 'bg-emerald-500' : staff.status === 'Late' ? 'bg-amber-500' : staff.status === 'Remote' ? 'bg-blue-500' : 'bg-rose-500'
                      }`} />
                      {staff.status}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <button
                      onClick={() => showToast(`Quick action triggered for ${staff.name}`)}
                      className="px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50 rounded font-medium transition-colors"
                    >
                      View Log
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Activities & Branch Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Branch Activity Feed */}
        <div className="lg:col-span-2 bg-white border border-[#f0f0f0] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 m-0">Recent Branch Activity</h2>
            <span className="text-xs text-gray-400 font-medium">Live Feed</span>
          </div>

          <div className="space-y-4">
            {recentActivities.map((act) => {
              const Icon = act.icon;
              return (
                <div key={act.id} className="flex items-start gap-3.5 p-3 rounded-lg hover:bg-gray-50/70 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${act.color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-gray-900 truncate">{act.title}</h4>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">{act.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{act.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Branch Profile Summary & Quick Actions */}
        <div className="bg-white border border-[#f0f0f0] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3">Branch Details</h2>
            
            <div className="space-y-2.5 text-xs text-gray-600">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <Building size={14} className="text-gray-400 flex-shrink-0" />
                <span className="font-medium text-gray-900">{user?.branch_name || 'Downtown Central Branch'}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{user?.address || 'Suite 400, Industrial Area, Sector 5'}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <Phone size={14} className="text-gray-400 flex-shrink-0" />
                <span>{user?.phone_number || '+91 98765 43210'}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                <Mail size={14} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{user?.email || 'branch.admin@example.com'}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#f0f0f0]">
            <h4 className="text-xs font-semibold text-gray-900 mb-2">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => showToast('Attendance register opened!')}
                className="p-2.5 bg-[#f9fafb] hover:bg-emerald-50 hover:text-emerald-700 border border-[#f0f0f0] rounded-lg text-xs font-medium text-gray-700 transition-colors flex flex-col items-center justify-center gap-1.5"
              >
                <UserCheck size={16} className="text-emerald-600" />
                <span>Mark Attendance</span>
              </button>
              <button
                onClick={() => showToast('Stock verification module opened!')}
                className="p-2.5 bg-[#f9fafb] hover:bg-blue-50 hover:text-blue-700 border border-[#f0f0f0] rounded-lg text-xs font-medium text-gray-700 transition-colors flex flex-col items-center justify-center gap-1.5"
              >
                <Package size={16} className="text-blue-600" />
                <span>Verify Stock</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 border border-[#f0f0f0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
              <h3 className="text-sm font-bold text-gray-900">Add Staff Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              setShowAddModal(false);
              showToast('Staff member added successfully!');
            }}>
              <div className="space-y-3 mt-4 text-xs">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Full Name</label>
                  <input required placeholder="e.g. Ananya Roy" className="w-full p-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-md" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Role / Designation</label>
                  <input required placeholder="e.g. Sales Executive" className="w-full p-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-md" />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Department</label>
                  <select className="w-full p-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-md">
                    <option>Sales & Marketing</option>
                    <option>Operations & Logistics</option>
                    <option>Customer Support</option>
                    <option>Administration & HR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Email Address</label>
                  <input type="email" required placeholder="staff@company.com" className="w-full p-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-md" />
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded-md font-medium text-xs hover:bg-emerald-700">
                  Save Staff Member
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-[#e5e7eb] rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 border border-[#f0f0f0]">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
              <h3 className="text-sm font-bold text-gray-900">Branch Performance Report Summary</h3>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p className="font-semibold text-emerald-900">Branch Health: Excellent (Grade A)</p>
                <p className="text-emerald-700 mt-1">All daily compliance, shifts, and operational metrics are operating on schedule.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-gray-700">
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-400 block text-[10.5px]">Attendance Compliance</span>
                  <span className="font-bold text-gray-900 text-sm">94.4%</span>
                </div>
                <div className="p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-400 block text-[10.5px]">Monthly Sales Velocity</span>
                  <span className="font-bold text-gray-900 text-sm">₹4,85,200</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  showToast('Exporting branch PDF report...');
                }}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-md font-medium text-xs hover:bg-emerald-700"
              >
                Export PDF Summary
              </button>
              <button onClick={() => setShowReportModal(false)} className="px-4 py-2 border border-[#e5e7eb] rounded-md text-xs font-medium text-gray-600 hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchAdminDashboard;
