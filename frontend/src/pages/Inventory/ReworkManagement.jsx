import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { qualityChecks as qcApi, branches as branchesApi, companies as companiesApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  RotateCcw,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Eye,
  ShieldCheck,
  Building2,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  X,
  Check,
  Clock,
  Trash2,
  Wrench,
  Flame
} from 'lucide-react';

const ReworkManagement = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [reworkList, setReworkList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [showScrapModal, setShowScrapModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [reworkFormData, setReworkFormData] = useState({
    rework_cost: '',
    rework_notes: ''
  });

  const [scrapFormData, setScrapFormData] = useState({
    scrap_reason: ''
  });

  // Sync with Auth Context
  useEffect(() => {
    if (user?.branch_id) setSelectedBranchId(user.branch_id);
    if (user?.company_id) setSelectedCompanyId(user.company_id);
  }, [user]);

  useEffect(() => {
    if (isSuperAdmin) fetchCompanies();
  }, [isSuperAdmin]);

  useEffect(() => {
    const effectiveCompanyId = selectedCompanyId || user?.company_id;
    if (effectiveCompanyId) {
      fetchBranches(effectiveCompanyId);
    }
  }, [selectedCompanyId, user?.company_id]);

  useEffect(() => {
    fetchReworkQueue();
  }, [selectedCompanyId, selectedBranchId]);

  const fetchCompanies = async () => {
    try {
      const res = await companiesApi.getAll();
      setCompaniesList(res.data.data || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBranches = async (compId) => {
    try {
      const res = await branchesApi.getByCompany(compId);
      setBranchesList(res.data.data || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReworkQueue = async () => {
    setLoading(true);
    try {
      const res = await qcApi.getReworks({
        company_id: selectedCompanyId || undefined,
        branch_id: selectedBranchId !== 'all' ? selectedBranchId : undefined
      });
      setReworkList(res.data?.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load rework records');
    } finally {
      setLoading(false);
    }
  };

  // Open Rework Modal
  const handleOpenReworkModal = (item) => {
    setSelectedItem(item);
    setReworkFormData({
      rework_cost: item.total_rework_cost > 0 ? item.total_rework_cost : '',
      rework_notes: item.rework_notes || ''
    });
    setShowReworkModal(true);
  };

  // Submit Send to Rework
  const handleConfirmRework = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    const cost = parseFloat(reworkFormData.rework_cost) || 0;
    if (cost < 0) {
      toast.error('Rework cost cannot be negative');
      return;
    }

    setSubmitting(true);
    try {
      const res = await qcApi.sendToRework(selectedItem.id, {
        rework_cost: cost,
        rework_notes: reworkFormData.rework_notes
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Product sent for rework! It is now queued in Quality Check for re-inspection.');
        setShowReworkModal(false);
        fetchReworkQueue();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to process rework');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Scrap Modal
  const handleOpenScrapModal = (item) => {
    setSelectedItem(item);
    setScrapFormData({
      scrap_reason: item.scrap_reason || ''
    });
    setShowScrapModal(true);
  };

  // Submit Complete Reject / Scrap
  const handleConfirmScrap = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    if (!scrapFormData.scrap_reason.trim()) {
      toast.error('Please provide a reason for scrapping this batch.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await qcApi.scrapProduct(selectedItem.id, {
        scrap_reason: scrapFormData.scrap_reason
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Product permanently scrapped.');
        setShowScrapModal(false);
        fetchReworkQueue();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to scrap product');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered List
  const filteredList = useMemo(() => {
    return reworkList.filter(item => {
      const text = `${item.product_name || ''} ${item.product_code || ''} ${item.batch_number || ''} ${item.reason || ''}`.toLowerCase();
      const matchSearch = !searchTerm || text.includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [reworkList, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    let pendingDecision = 0;
    let inRework = 0;
    let completed = 0;
    let scrapped = 0;
    let totalCost = 0;

    reworkList.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const cost = parseFloat(item.total_rework_cost) || 0;
      totalCost += cost;

      if (item.status === 'PENDING_DECISION') pendingDecision += qty;
      else if (item.status === 'IN_REWORK' || item.status === 'IN_REWORK_QC') inRework += qty;
      else if (item.status === 'COMPLETED') completed += qty;
      else if (item.status === 'SCRAPPED') scrapped += qty;
    });

    return {
      totalDefective: pendingDecision + inRework + completed + scrapped,
      pendingDecision,
      inRework,
      completed,
      scrapped,
      totalCost
    };
  }, [reworkList]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto bg-slate-50/50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Rework & Rejection Management
            </h1>
            <p className="text-xs text-slate-500">
              Manage defective production items: Add rework cost to send for QC re-inspection, or permanently scrap.
            </p>
          </div>
        </div>

        {/* Global Scope Filters & QC Link */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isSuperAdmin && companiesList.length > 0 && (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {companiesList.map(c => (
                <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
              ))}
            </select>
          )}

          {(isSuperAdmin || isCompanyAdmin) && branchesList.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Branches</option>
              {branchesList.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          )}

          <Link
            to="/quality-checks"
            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Open Quality Check →</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Defective</span>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900">{stats.totalDefective.toLocaleString()}</div>
          <span className="text-[10px] text-slate-400">All QC-flagged units</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-2xs bg-gradient-to-br from-amber-50/40 to-white">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Decision</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-700">{stats.pendingDecision.toLocaleString()}</div>
          <span className="text-[10px] text-amber-800">Awaiting rework or scrap</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-2xs bg-gradient-to-br from-blue-50/40 to-white">
          <div className="flex items-center justify-between text-blue-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">In Rework / Re-QC</span>
            <RotateCcw className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-700">{stats.inRework.toLocaleString()}</div>
          <span className="text-[10px] text-blue-800">Sent back to QC queue</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-2xs bg-gradient-to-br from-rose-50/40 to-white">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Scrapped (Loss)</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-700">{stats.scrapped.toLocaleString()}</div>
          <span className="text-[10px] text-rose-800">Permanent rejects</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs bg-gradient-to-br from-emerald-50/40 to-white col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rework Cost</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700">₹{stats.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          <span className="text-[10px] text-emerald-800">Total invested in repairs</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search product, batch, reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchReworkQueue}
              className="p-1.5 text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg"
              title="Refresh List"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Status Tabs */}
          <div className="flex bg-slate-200/60 p-1 rounded-xl text-xs overflow-x-auto">
            {['all', 'PENDING_DECISION', 'IN_REWORK_QC', 'COMPLETED', 'SCRAPPED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' && 'All Defective Items'}
                {st === 'PENDING_DECISION' && '⚠️ Pending Decision'}
                {st === 'IN_REWORK_QC' && '🔁 In Rework / Re-QC'}
                {st === 'COMPLETED' && '✅ Approved'}
                {st === 'SCRAPPED' && '❌ Scrapped'}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4 text-right">Defective Units</th>
                <th className="py-3 px-4">Defect Reason / Notes</th>
                <th className="py-3 px-4 text-right">Rework Cost</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-500" />
                    Loading rework items...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                    <p className="font-bold text-slate-600">No defective items found!</p>
                    <p className="text-xs text-slate-400 mt-0.5">Either all batches passed QC, or no items match the selected filter.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-medium">
                      <div className="font-mono font-bold text-blue-600">{item.batch_number}</div>
                      <div className="text-[10px] text-slate-400">
                        QC Date: {item.qc_inspection_date ? new Date(item.qc_inspection_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <strong className="text-slate-900 block font-semibold">{item.product_name}</strong>
                      <span className="font-mono text-[10.5px] text-slate-500">{item.product_code}</span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-rose-600 text-sm">
                        {parseFloat(item.quantity).toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">{item.product_unit || 'units'}</span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="text-slate-800 font-medium line-clamp-2">
                        {item.reason || 'Defects found during QC inspection'}
                      </div>
                      {item.rework_notes && (
                        <div className="text-[10.5px] text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded mt-1 border border-blue-100">
                          🔧 Rework Notes: {item.rework_notes}
                        </div>
                      )}
                      {item.scrap_reason && (
                        <div className="text-[10.5px] text-rose-700 bg-rose-50/80 px-2 py-0.5 rounded mt-1 border border-rose-100">
                          🔥 Scrap Reason: {item.scrap_reason}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      ₹{parseFloat(item.total_rework_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        item.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.status === 'IN_REWORK_QC' || item.status === 'IN_REWORK'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse'
                          : item.status === 'SCRAPPED'
                          ? 'bg-slate-100 text-slate-600 border-slate-300 line-through'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}>
                        {item.status === 'PENDING_DECISION' && '⚠️ Pending Decision'}
                        {item.status === 'IN_REWORK_QC' && '🔁 Queued in QC'}
                        {item.status === 'IN_REWORK' && '🔧 In Rework'}
                        {item.status === 'COMPLETED' && '✅ Approved'}
                        {item.status === 'SCRAPPED' && '❌ Scrapped'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      {item.status === 'PENDING_DECISION' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenReworkModal(item)}
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            title="Assign Rework Cost & Send to QC"
                          >
                            <Wrench className="w-3 h-3" />
                            <span>Rework</span>
                          </button>

                          <button
                            onClick={() => handleOpenScrapModal(item)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1"
                            title="Complete Reject / Scrap"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Scrap</span>
                          </button>
                        </div>
                      ) : item.status === 'IN_REWORK_QC' ? (
                        <Link
                          to="/quality-checks"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline"
                        >
                          <span>Inspect in QC</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : item.status === 'SCRAPPED' ? (
                        <span className="text-[11px] text-slate-400 font-medium italic">Scrapped permanently</span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-medium">Passed to Inventory</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. REWORK MODAL: Assign Rework Cost & Send for Quality Re-Inspection */}
      {/* ========================================================================= */}
      {showReworkModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-200" />
                <div>
                  <h3 className="font-bold text-sm">Send to Rework & Quality Re-Check</h3>
                  <p className="text-[11px] text-amber-100">Add rework cost and instructions to re-inspect in QC</p>
                </div>
              </div>
              <button
                onClick={() => setShowReworkModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRework} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Product:</span>
                  <strong className="text-slate-900 font-bold">{selectedItem.product_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Batch Number:</span>
                  <span className="font-mono font-bold text-blue-600">{selectedItem.batch_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Defective Quantity:</span>
                  <span className="font-bold text-rose-600">{parseFloat(selectedItem.quantity)} {selectedItem.product_unit}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-amber-200/60">
                  <span className="text-slate-500">QC Defect:</span>
                  <span className="text-slate-700 italic">{selectedItem.reason || 'None provided'}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Estimated Rework Cost (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="e.g. 250.00"
                  value={reworkFormData.rework_cost}
                  onChange={(e) => setReworkFormData({ ...reworkFormData, rework_cost: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <span className="text-[10.5px] text-slate-500 block mt-0.5">
                  Cost of additional materials, labor, or repairs required for fixing this batch.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Rework Instructions / Defect Correction Plan
                </label>
                <textarea
                  rows="3"
                  placeholder="e.g. Sanding and re-coating surfaces, recalibrating tolerance..."
                  value={reworkFormData.rework_notes}
                  onChange={(e) => setReworkFormData({ ...reworkFormData, rework_notes: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-[11px]">
                ℹ️ <strong>What happens next:</strong> Clicking confirm will assign the rework cost and immediately send this batch back into the <strong>Quality Check</strong> queue with a <strong>REWORK RE-INSPECTION</strong> badge. Once approved in QC, the units will be added to Product Inventory.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReworkModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Sending...' : 'Confirm & Send to QC'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. COMPLETE REJECT / SCRAP MODAL */}
      {/* ========================================================================= */}
      {showScrapModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-rose-600 to-rose-700 text-white">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-200" />
                <div>
                  <h3 className="font-bold text-sm">Complete Reject / Permanently Scrap Batch</h3>
                  <p className="text-[11px] text-rose-100">Declare items irreparable; write off from stock</p>
                </div>
              </div>
              <button
                onClick={() => setShowScrapModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmScrap} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Product:</span>
                  <strong className="text-slate-900 font-bold">{selectedItem.product_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Batch Number:</span>
                  <span className="font-mono font-bold text-blue-600">{selectedItem.batch_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Scrap Quantity:</span>
                  <span className="font-bold text-rose-600">{parseFloat(selectedItem.quantity)} {selectedItem.product_unit}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reason for Scrapping / Rejection *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="e.g. Critical fracture, irreparable thermal damage, unfeasible rework cost..."
                  value={scrapFormData.scrap_reason}
                  onChange={(e) => setScrapFormData({ ...scrapFormData, scrap_reason: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px]">
                ⚠️ <strong>Warning:</strong> Scrapped items will be permanently written off. They will <strong>NEVER</strong> be inserted into Finished Product Inventory and will not appear in the Quality Check queue again.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowScrapModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-md transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Scrapping...' : 'Confirm Scrap (Permanent)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReworkManagement;
