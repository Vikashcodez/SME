import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { qualityChecks as qcApi, productionOrders as orderApi, branches as branchesApi, companies as companiesApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Search,
  Plus,
  Eye,
  X,
  Check,
  FileCheck2,
  DollarSign,
  Boxes,
  Package,
  Layers,
  Sparkles,
  ChevronRight,
  ClipboardList
} from 'lucide-react';

const QualityCheckManagement = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('inspections'); // 'inspections' or 'rework'
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  const [qcList, setQcList] = useState([]);
  const [reworkList, setReworkList] = useState([]);
  const [pendingBatchesList, setPendingBatchesList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedRework, setSelectedRework] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Inspect Form
  const [inspectForm, setInspectForm] = useState({
    production_batch_id: '',
    inspected_quantity: 0,
    passed_quantity: 0,
    rework_quantity: 0,
    rejected_quantity: 0,
    rework_cost: 0,
    rework_reason: '',
    rejection_reason: '',
    remarks: '',
    items: [
      { parameter_name: 'Dimension Check', specification: 'Standard Spec', actual_value: 'OK', result: 'PASS', remarks: '' },
      { parameter_name: 'Surface Finish & Color', specification: 'Visual Defect Free', actual_value: 'OK', result: 'PASS', remarks: '' },
      { parameter_name: 'Strength / Load Test', specification: '>50N Load Capacity', actual_value: 'OK', result: 'PASS', remarks: '' }
    ]
  });

  // Rework Form
  const [reworkForm, setReworkForm] = useState({
    passed_quantity: 0,
    rejected_quantity: 0,
    additional_material_cost: 0,
    additional_labor_cost: 0,
    other_cost: 0
  });

  useEffect(() => {
    fetchQualityChecks();
    fetchReworks();
    fetchPendingBatches();
  }, [selectedCompanyId, selectedBranchId]);

  const fetchQualityChecks = async () => {
    setLoading(true);
    try {
      const res = await qcApi.getAll({
        company_id: selectedCompanyId || undefined,
        branch_id: selectedBranchId !== 'all' ? selectedBranchId : undefined
      });
      setQcList(res.data?.data || []);
    } catch (e) {
      toast.error('Failed to load Quality Check inspections');
    } finally {
      setLoading(false);
    }
  };

  const fetchReworks = async () => {
    try {
      const res = await qcApi.getReworks({
        company_id: selectedCompanyId || undefined,
        branch_id: selectedBranchId !== 'all' ? selectedBranchId : undefined
      });
      setReworkList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch batches waiting for QC
  const fetchPendingBatches = async () => {
    try {
      const res = await qcApi.getPendingBatches({
        company_id: selectedCompanyId || undefined,
        branch_id: selectedBranchId !== 'all' ? selectedBranchId : undefined
      });
      setPendingBatchesList(res.data?.data || []);
    } catch (e) {
      console.error('Error fetching pending batches for QC:', e);
    }
  };

  // Open Inspection Modal for batch
  const handleOpenInspect = (batch) => {
    setSelectedBatch(batch);
    const produced = parseFloat(batch.produced_quantity || batch.planned_quantity || 1);
    setInspectForm({
      production_batch_id: batch.id,
      inspected_quantity: produced,
      passed_quantity: produced,
      rework_quantity: 0,
      rejected_quantity: 0,
      rework_cost: 0,
      rework_reason: '',
      rejection_reason: '',
      remarks: '',
      items: [
        { parameter_name: 'Dimension Check', specification: 'Standard Spec', actual_value: 'OK', result: 'PASS', remarks: '' },
        { parameter_name: 'Surface Finish & Color', specification: 'Visual Defect Free', actual_value: 'OK', result: 'PASS', remarks: '' },
        { parameter_name: 'Strength / Load Test', specification: '>50N Load Capacity', actual_value: 'OK', result: 'PASS', remarks: '' }
      ]
    });
    setShowInspectModal(true);
  };

  // Submit Quality Inspection
  const handleSubmitInspect = async (e) => {
    e.preventDefault();
    const insp = parseFloat(inspectForm.inspected_quantity) || 0;
    const pass = parseFloat(inspectForm.passed_quantity) || 0;
    const rew = parseFloat(inspectForm.rework_quantity) || 0;
    const rej = parseFloat(inspectForm.rejected_quantity) || 0;

    if (Math.abs((pass + rew + rej) - insp) > 0.001) {
      toast.error(`Passed (${pass}) + Rework (${rew}) + Rejected (${rej}) must equal Inspected (${insp})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await qcApi.record(inspectForm);
      if (res.data?.success) {
        toast.success(`Quality Check complete! ${pass} units added to Product Inventory. ${rew} sent to Rework.`);
        setShowInspectModal(false);
        fetchQualityChecks();
        fetchReworks();
        fetchPendingBatches();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record Quality Check');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Rework Complete Modal
  const handleOpenCompleteRework = (rework) => {
    setSelectedRework(rework);
    setReworkForm({
      passed_quantity: parseFloat(rework.quantity),
      rejected_quantity: 0,
      additional_material_cost: 0,
      additional_labor_cost: 0,
      other_cost: 0
    });
    setShowReworkModal(true);
  };

  // Submit Rework Complete
  const handleSubmitRework = async (e) => {
    e.preventDefault();
    const pass = parseFloat(reworkForm.passed_quantity) || 0;
    const rej = parseFloat(reworkForm.rejected_quantity) || 0;
    const total = parseFloat(selectedRework.quantity);

    if (pass + rej > total + 0.001) {
      toast.error(`Passed (${pass}) + Rejected (${rej}) cannot exceed Total Rework Units (${total})`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await qcApi.completeRework(selectedRework.id, reworkForm);
      if (res.data?.success) {
        toast.success(`Rework completed! ${pass} units passed and added to Product Inventory.`);
        setShowReworkModal(false);
        fetchQualityChecks();
        fetchReworks();
        fetchPendingBatches();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete rework');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Quality Check & Rework</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Production Batch QC Inspection • Passed → Product Inventory • Rework → Re-QC Loop • Scrap Tracking
            </p>
          </div>
        </div>

        {/* Tab Switcher & Navigation to Rework Page */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('inspections')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                activeTab === 'inspections'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Inspections ({qcList.length})
            </button>
            <button
              onClick={() => setActiveTab('rework')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                activeTab === 'rework'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Rework Queue ({reworkList.filter(r => r.status === 'IN_REWORK' || r.status === 'PENDING_DECISION').length})
            </button>
          </div>

          <Link
            to="/rework-management"
            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Manage Rejected & Rework Products →</span>
          </Link>
        </div>
      </div>

      {/* PENDING QC BATCHES ALERT BANNER */}
      {pendingBatchesList.length > 0 && activeTab === 'inspections' && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>{pendingBatchesList.length} Production Batch(es) Ready for Quality Inspection</span>
            </div>
            <span className="text-[11px] text-amber-700 font-medium">Pending QC verification</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingBatchesList.map(batch => (
              <div 
                key={batch.id} 
                className={`bg-white p-3.5 rounded-lg border shadow-2xs flex items-center justify-between ${
                  batch.is_rework_reinspection || batch.status === 'REWORK_QC_PENDING'
                    ? 'border-amber-400 bg-amber-50/40 ring-1 ring-amber-300'
                    : 'border-blue-200/80'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-blue-600">{batch.batch_number}</span>
                    {(batch.is_rework_reinspection || batch.status === 'REWORK_QC_PENDING') && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                        🔁 REWORK RE-INSPECTION
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-gray-900 mt-0.5">{batch.product_name}</div>
                  <div className="text-[11px] text-gray-500">
                    Produced/Pending: <strong>{parseFloat(batch.produced_quantity || batch.planned_quantity)}</strong> {batch.product_unit || 'Units'}
                  </div>
                  {batch.total_rework_cost > 0 && (
                    <div className="text-[10.5px] text-emerald-700 font-semibold mt-0.5">
                      Rework Cost: ₹{parseFloat(batch.total_rework_cost).toFixed(2)}
                    </div>
                  )}
                  {batch.previous_rejection_reason && (
                    <div className="text-[10.5px] text-amber-800 italic mt-0.5 line-clamp-1">
                      Defect: {batch.previous_rejection_reason}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleOpenInspect(batch)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-2xs transition shrink-0 ml-2"
                >
                  Inspect Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: INSPECTIONS */}
      {activeTab === 'inspections' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Inspection Date</th>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4 text-right">Inspected</th>
                  <th className="py-3 px-4 text-right">Passed</th>
                  <th className="py-3 px-4 text-right">Rework</th>
                  <th className="py-3 px-4 text-right">Rejected</th>
                  <th className="py-3 px-4 text-center">QC Status</th>
                  <th className="py-3 px-4">Inspector</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="text-center py-10 text-gray-400">Loading QC records...</td>
                  </tr>
                ) : qcList.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-gray-400">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No Quality Checks recorded yet.
                    </td>
                  </tr>
                ) : (
                  qcList.map((qc) => (
                    <tr key={qc.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 text-gray-500">{new Date(qc.checked_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{qc.batch_number}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{qc.product_name}</td>
                      <td className="py-3 px-4 text-right font-medium">{parseFloat(qc.inspected_quantity)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        {parseFloat(qc.passed_quantity)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-600">
                        {parseFloat(qc.rework_quantity)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-red-500">
                        {parseFloat(qc.rejected_quantity)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          qc.quality_status === 'PASSED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : qc.quality_status === 'REWORK'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {qc.quality_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{qc.checked_by_name || 'Inspector'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: REWORK QUEUE */}
      {activeTab === 'rework' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4 text-right">Rework Units</th>
                  <th className="py-3 px-4">Reason for Rework</th>
                  <th className="py-3 px-4 text-right">Rework Cost (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {reworkList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-400">
                      <RotateCcw className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No batches in Rework queue.
                    </td>
                  </tr>
                ) : (
                  reworkList.map((rw) => (
                    <tr key={rw.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-amber-600">{rw.batch_number}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{rw.product_name}</td>
                      <td className="py-3 px-4 text-right font-bold text-amber-700">{parseFloat(rw.quantity)}</td>
                      <td className="py-3 px-4 text-gray-600">{rw.reason}</td>
                      <td className="py-3 px-4 text-right font-medium">₹{parseFloat(rw.total_rework_cost || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          rw.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {rw.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {rw.status === 'IN_REWORK' ? (
                          <button
                            onClick={() => handleOpenCompleteRework(rw)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Complete & Pass
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400">Rework Done</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INSPECTION MODAL */}
      {showInspectModal && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div>
                <span className="text-xs font-mono font-bold text-emerald-600">{selectedBatch.batch_number}</span>
                <h2 className="text-sm font-bold text-gray-900">Record Quality Check Inspection</h2>
              </div>
              <button onClick={() => setShowInspectModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInspect} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Product and batch info */}
              <div className="p-3 bg-gray-50 rounded-lg text-xs grid grid-cols-3 gap-2">
                <div>
                  <span className="text-gray-400 text-[11px] block">Product</span>
                  <span className="font-bold text-gray-900">{selectedBatch.product_name}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Batch Number</span>
                  <span className="font-mono font-bold text-blue-600">{selectedBatch.batch_number}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Produced Quantity</span>
                  <span className="font-bold text-gray-900">{parseFloat(selectedBatch.produced_quantity || selectedBatch.planned_quantity)} units</span>
                </div>
              </div>

              {/* Quantities Distribution */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Inspected Qty</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={inspectForm.inspected_quantity}
                    onChange={(e) => setInspectForm({ ...inspectForm, inspected_quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">Passed Qty (FG)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={inspectForm.passed_quantity}
                    onChange={(e) => setInspectForm({ ...inspectForm, passed_quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-emerald-300 bg-emerald-50/30 rounded-lg font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-amber-700 mb-1">Rework Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={inspectForm.rework_quantity}
                    onChange={(e) => setInspectForm({ ...inspectForm, rework_quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-amber-300 bg-amber-50/30 rounded-lg font-bold text-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-red-600 mb-1">Rejected Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={inspectForm.rejected_quantity}
                    onChange={(e) => setInspectForm({ ...inspectForm, rejected_quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-red-300 bg-red-50/30 rounded-lg font-bold text-red-600"
                  />
                </div>
              </div>

              {/* Rework and Rejection Reasons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {parseFloat(inspectForm.rework_quantity) > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-amber-800 mb-1">Rework Reason & Action</label>
                    <input
                      type="text"
                      placeholder="e.g. Paint touchup required"
                      value={inspectForm.rework_reason}
                      onChange={(e) => setInspectForm({ ...inspectForm, rework_reason: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg"
                    />
                    <div className="mt-2">
                      <label className="block text-xs font-semibold text-amber-800 mb-1">Est. Rework Cost (₹)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="₹ 0.00"
                        value={inspectForm.rework_cost}
                        onChange={(e) => setInspectForm({ ...inspectForm, rework_cost: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {parseFloat(inspectForm.rejected_quantity) > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-red-700 mb-1">Rejection / Scrap Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Broken frame / irreparable"
                      value={inspectForm.rejection_reason}
                      onChange={(e) => setInspectForm({ ...inspectForm, rejection_reason: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Checklist Parameters */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Quality Parameters Checklist</h4>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="py-2 px-3">Parameter</th>
                        <th className="py-2 px-3">Specification</th>
                        <th className="py-2 px-3">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {inspectForm.items.map((param, pi) => (
                        <tr key={pi}>
                          <td className="py-2 px-3 font-medium text-gray-800">{param.parameter_name}</td>
                          <td className="py-2 px-3 text-gray-500">{param.specification}</td>
                          <td className="py-2 px-3">
                            <select
                              value={param.result}
                              onChange={(e) => {
                                const newItems = [...inspectForm.items];
                                newItems[pi].result = e.target.value;
                                setInspectForm({ ...inspectForm, items: newItems });
                              }}
                              className={`px-2 py-1 text-xs rounded font-bold border ${
                                param.result === 'PASS'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : 'bg-red-50 text-red-700 border-red-300'
                              }`}
                            >
                              <option value="PASS">PASS</option>
                              <option value="FAIL">FAIL</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-xs text-blue-800 space-y-1">
                <p>
                  ✓ <strong>{inspectForm.passed_quantity} Passed units</strong> will automatically be added to <strong>Finished Goods Product Inventory</strong>.
                </p>
                {parseFloat(inspectForm.rework_quantity) > 0 && (
                  <p>
                    ↻ <strong>{inspectForm.rework_quantity} Rework units</strong> will enter the <strong>Rework Queue</strong> for repairs before re-inspection.
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowInspectModal(false)}
                  className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                >
                  <Check className="w-4 h-4" />
                  {submitting ? 'Recording...' : 'Confirm QC Result'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE REWORK MODAL */}
      {showReworkModal && selectedRework && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-amber-600">{selectedRework.batch_number}</span>
                <h2 className="text-sm font-bold text-gray-900">Complete Rework & Ingress to Finished Goods</h2>
              </div>
              <button onClick={() => setShowReworkModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRework} className="space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg text-xs">
                Total Rework Units: <strong>{parseFloat(selectedRework.quantity)}</strong>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 mb-1">Passed after Rework</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={reworkForm.passed_quantity}
                    onChange={(e) => setReworkForm({ ...reworkForm, passed_quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-emerald-300 bg-emerald-50/30 rounded-lg font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-red-600 mb-1">Scrapped / Rejected</label>
                  <input
                    type="number"
                    min="0"
                    value={reworkForm.rejected_quantity}
                    onChange={(e) => setReworkForm({ ...reworkForm, rejected_quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-red-300 bg-red-50/30 rounded-lg font-bold text-red-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700">Actual Rework Expenses (₹)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Material</span>
                    <input
                      type="number"
                      min="0"
                      value={reworkForm.additional_material_cost}
                      onChange={(e) => setReworkForm({ ...reworkForm, additional_material_cost: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Labor</span>
                    <input
                      type="number"
                      min="0"
                      value={reworkForm.additional_labor_cost}
                      onChange={(e) => setReworkForm({ ...reworkForm, additional_labor_cost: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Other</span>
                    <input
                      type="number"
                      min="0"
                      value={reworkForm.other_cost}
                      onChange={(e) => setReworkForm({ ...reworkForm, other_cost: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowReworkModal(false)}
                  className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                >
                  {submitting ? 'Ingesting...' : 'Ingress Passed Units to FG'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityCheckManagement;
