import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  User,
  Building,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  Play,
  Square,
  Coffee,
  CheckSquare,
  Plus,
  FileText,
  ShieldCheck,
  ChevronRight,
  Bell,
  Award,
  Layers,
  ArrowUpRight,
  HelpCircle,
  Cake,
  Copy
} from 'lucide-react';

const EmployeeDashboard = () => {
  const { user } = useAuth();

  // Punch clock state
  const [clockedIn, setClockedIn] = useState(true);
  const [onBreak, setOnBreak] = useState(false);
  const [shiftSeconds, setShiftSeconds] = useState(13420); // ~3h 43m
  const [punchLog, setPunchLog] = useState([
    { type: 'in', time: '09:00 AM', label: 'Shift Clock-In' },
    { type: 'break_start', time: '01:00 PM', label: 'Lunch Break Started' },
    { type: 'break_end', time: '01:45 PM', label: 'Lunch Break Ended' }
  ]);

  // Tasks state
  const [tasks, setTasks] = useState([
    { id: 1, title: 'Review quarterly branch inventory checklist', priority: 'High', due: 'Today, 5:00 PM', completed: true },
    { id: 2, title: 'Submit daily operational logs to Branch Manager', priority: 'High', due: 'Today, 6:00 PM', completed: false },
    { id: 3, title: 'Complete compliance and safety module assessment', priority: 'Medium', due: 'Tomorrow', completed: false },
    { id: 4, title: 'Coordinate with customer support on outstanding tickets', priority: 'Low', due: 'Friday', completed: false },
  ]);

  // Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Live timer for shift
  useEffect(() => {
    let interval = null;
    if (clockedIn && !onBreak) {
      interval = setInterval(() => {
        setShiftSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [clockedIn, onBreak]);

  const formatShiftTime = (totalSec) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handlePunchToggle = () => {
    const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (clockedIn) {
      setClockedIn(false);
      setOnBreak(false);
      setPunchLog(prev => [...prev, { type: 'out', time: timeNow, label: 'Shift Clock-Out' }]);
      toast.success(`Clocked out at ${timeNow}. Have a great evening!`);
    } else {
      setClockedIn(true);
      setPunchLog(prev => [...prev, { type: 'in', time: timeNow, label: 'Shift Clock-In' }]);
      toast.success(`Clocked in at ${timeNow}. Have a productive shift!`);
    }
  };

  const handleBreakToggle = () => {
    const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (onBreak) {
      setOnBreak(false);
      setPunchLog(prev => [...prev, { type: 'break_end', time: timeNow, label: 'Resumed from Break' }]);
      toast.success(`Break ended at ${timeNow}`);
    } else {
      setOnBreak(true);
      setPunchLog(prev => [...prev, { type: 'break_start', time: timeNow, label: 'Started Break' }]);
      toast('Break started. Enjoy your break!', { icon: '☕' });
    }
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const next = !t.completed;
        if (next) toast.success(`Task "${t.title}" marked completed!`);
        return { ...t, completed: next };
      }
      return t;
    }));
  };

  const handleApplyLeave = (e) => {
    e.preventDefault();
    if (!leaveStartDate || !leaveEndDate) {
      toast.error('Please select start and end dates');
      return;
    }
    toast.success(`Leave request for ${leaveType} submitted to Branch Admin!`);
    setShowLeaveModal(false);
    setLeaveReason('');
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const taskProgress = Math.round((completedCount / tasks.length) * 100) || 0;

  // Avatar gradient helper
  const getAvatarGradient = (name = '') => {
    return 'from-sky-500 via-blue-600 to-indigo-700';
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 font-sans text-slate-800">
      
      {/* ═══ Top Welcome Banner ═══ */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-900 via-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-6">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg border-2 border-white/20 shrink-0">
              {user?.first_name?.charAt(0)?.toUpperCase() || 'E'}
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-300 uppercase tracking-wider mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Employee Workspace</span>
                <span>•</span>
                <span>{user?.company_name || 'Tectum SME'}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.first_name || 'Staff Member'}! 👋
              </h1>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-slate-300">
                {user?.employee_code && (
                  <span className="font-mono font-bold bg-white/10 px-2 py-0.5 rounded-md text-sky-200 border border-white/10">
                    ID: {user.employee_code}
                  </span>
                )}
                {user?.role && (
                  <span className="inline-flex items-center gap-1 bg-sky-500/20 text-sky-200 px-2 py-0.5 rounded-md border border-sky-400/20 font-medium">
                    <Briefcase className="w-3 h-3" />
                    {user.role}
                  </span>
                )}
                {user?.department && (
                  <span className="inline-flex items-center gap-1 bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded-md border border-indigo-400/20 font-medium">
                    <Layers className="w-3 h-3" />
                    {user.department}
                  </span>
                )}
                {user?.branch_name && (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-md border border-emerald-400/20 font-medium">
                    <Building className="w-3 h-3" />
                    {user.branch_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Shift Punch Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 min-w-[280px]">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-xs font-bold text-sky-200 uppercase tracking-wider">
                Shift Timer
              </span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                onBreak 
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                  : clockedIn 
                  ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30' 
                  : 'bg-rose-400/20 text-rose-300 border border-rose-400/30'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                {onBreak ? 'On Break' : clockedIn ? 'On Duty' : 'Off Shift'}
              </span>
            </div>

            <div className="font-mono text-2xl sm:text-3xl font-black text-white tracking-wider mb-3">
              {formatShiftTime(shiftSeconds)}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePunchToggle}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all transform active:scale-95 cursor-pointer ${
                  clockedIn 
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm' 
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                }`}
              >
                {clockedIn ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{clockedIn ? 'Clock Out' : 'Clock In'}</span>
              </button>

              {clockedIn && (
                <button
                  onClick={handleBreakToggle}
                  className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                    onBreak 
                      ? 'bg-amber-400 text-slate-900 border-amber-300' 
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>{onBreak ? 'Resume' : 'Break'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KPI Stats Row ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Card 1: Attendance Rate */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance (MTD)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">96.2%</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              21/22 Days
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Excellent punctuality score</p>
        </div>

        {/* Card 2: Assigned Tasks */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Action Items</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{completedCount}/{tasks.length}</span>
            <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
              {taskProgress}% Done
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Daily deliverables pipeline</p>
        </div>

        {/* Card 3: Leave Balance */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Leave Balance</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">14</span>
            <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
              Days Left
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Paid leave balance for 2026</p>
        </div>

        {/* Card 4: Shift Schedule */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Standard Shift</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-black text-slate-900">09:00 - 18:00</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Mon - Sat (Regular Shift)</p>
        </div>

      </div>

      {/* ═══ Main Content Two-Column Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Left 2 Cols: Tasks & Shift Punch Log */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: My Action Items / Tasks */}
          <div id="tasks" className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">My Assigned Tasks</h3>
                  <p className="text-xs text-slate-400">Track and complete daily branch responsibilities</p>
                </div>
              </div>
              <div className="text-xs font-bold text-slate-500">
                {taskProgress}% Complete
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${taskProgress}%` }}
              />
            </div>

            {/* Task list */}
            <div className="space-y-2.5">
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    task.completed 
                      ? 'bg-slate-50/70 border-slate-200 text-slate-400 line-through' 
                      : 'bg-white border-slate-200/80 hover:border-sky-300 hover:shadow-xs text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                      task.completed ? 'bg-sky-600 text-white' : 'border border-slate-300 bg-white'
                    }`}>
                      {task.completed && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <span className="text-xs sm:text-sm font-semibold">
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      task.priority === 'High' 
                        ? 'bg-rose-50 text-rose-700' 
                        : task.priority === 'Medium'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {task.priority}
                    </span>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      {task.due}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Today's Shift & Punch Log */}
          <div id="attendance" className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Today's Punch History</h3>
                  <p className="text-xs text-slate-400">Live check-in and break timestamps</p>
                </div>
              </div>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Apply for Leave</span>
              </button>
            </div>

            <div className="space-y-3">
              {punchLog.map((log, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                      log.type === 'in'
                        ? 'bg-emerald-100 text-emerald-700'
                        : log.type === 'out'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {log.type === 'in' ? 'IN' : log.type === 'out' ? 'OUT' : 'BRK'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">{log.label}</span>
                      <span className="text-slate-400 text-[11px] block">Verified via Staff Portal</span>
                    </div>
                  </div>

                  <span className="font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                    {log.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right 1 Col: Employee Dossier & Notice Board */}
        <div className="space-y-6">
          
          {/* Employee Identity Dossier */}
          <div id="profile" className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Personnel Dossier</h3>
                <p className="text-xs text-slate-400">My registered personnel details</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {user?.first_name} {user?.last_name || ''}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Official Email</span>
                  <span className="font-semibold text-slate-800 truncate block mt-0.5">
                    {user?.email || 'N/A'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(user?.email || '');
                    toast.success('Email copied!');
                  }}
                  className="text-slate-400 hover:text-sky-600"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              {user?.phone_number && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Contact Number</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {user.phone_number}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
                  <span className="font-bold text-sky-700 truncate block mt-0.5">
                    {user?.department || 'General'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Designation</span>
                  <span className="font-bold text-slate-800 truncate block mt-0.5">
                    {user?.role || 'Staff Member'}
                  </span>
                </div>
              </div>

              {user?.date_of_joining && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">Date of Joining</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {new Date(user.date_of_joining).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Notice Board */}
          <div id="notices" className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Branch Notice Board</h3>
                <p className="text-xs text-slate-400">Important notices & team circulars</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sky-900">Monthly Branch Sync</span>
                  <span className="text-[10px] font-semibold text-sky-600">This Friday, 4 PM</span>
                </div>
                <p className="text-slate-600 text-[11.5px]">
                  All branch staff are requested to join the general assembly at Conference Room A.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-900">Health & Wellness Week</span>
                  <span className="text-[10px] font-semibold text-emerald-600">Upcoming</span>
                </div>
                <p className="text-slate-600 text-[11.5px]">
                  Free annual health checkup organized at the branch clinic next Tuesday.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ═══ APPLY FOR LEAVE MODAL ═══ */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Apply for Leave</h3>
                  <p className="text-xs text-slate-500">Submit formal leave request to Branch Admin</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Leave Type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 outline-hidden focus:bg-white focus:border-sky-500"
                >
                  <option value="Casual Leave">Casual Leave (CL)</option>
                  <option value="Sick Leave">Sick / Medical Leave (SL)</option>
                  <option value="Paid Annual Leave">Paid Annual Leave (PL)</option>
                  <option value="Compensatory Off">Compensatory Off (Comp-Off)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveStartDate}
                    onChange={(e) => setLeaveStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:bg-white focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveEndDate}
                    onChange={(e) => setLeaveEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:bg-white focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Leave
                </label>
                <textarea
                  rows={3}
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Briefly describe the reason for your leave request..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-hidden focus:bg-white focus:border-sky-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm shadow-sky-500/20"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmployeeDashboard;
