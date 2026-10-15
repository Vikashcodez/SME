import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { manufacturingAccounting as mfgApi, rawMaterials as rawMaterialApi, products as productApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Layers,
  Cpu,
  RefreshCw,
  Plus,
  AlertTriangle,
  RotateCcw,
  Percent,
  TrendingDown,
  CheckCircle2,
  Calendar,
  X,
  FileText
} from 'lucide-react';

const ManufacturingJournal = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [loading, setLoading] = useState(false);
  const [costSummary, setCostSummary] = useState(null);
  const [vouchers, setVouchers] = useState([]);

  // Modals
  const [isStockJournalOpen, setIsStockJournalOpen] = useState(false);
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);

  // Master lists for selections
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [productsList, setProductsList] = useState([]);

  // Form States
  const [journalForm, setJournalForm] = useState({
    voucher_date: new Date().toISOString().split('T')[0],
    source_items: [{ raw_material_id: '', quantity: 1, unit_cost: 0 }],
    destination_items: [{ product_id: '', quantity: 1, unit_cost: 0 }],
    narration: ''
  });

  const [scrapForm, setScrapForm] = useState({
    voucher_date: new Date().toISOString().split('T')[0],
    rejected_quantity: 1,
    unit_cost: 0,
    scrap_reason: 'Defective units rejected by Quality Control'
  });

  const [reworkForm, setReworkForm] = useState({
    voucher_date: new Date().toISOString().split('T')[0],
    rework_quantity: 1,
    additional_material_cost: 0,
    additional_labor_cost: 0,
    other_cost: 0,
    rework_reason: 'Defect rectification'
  });

  const fetchData = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const [sumRes, vRes, rmRes, prodRes] = await Promise.all([
        mfgApi.getCostSummary({ company_id: companyId }),
        mfgApi.getVouchers({ company_id: companyId }),
        rawMaterialApi.getAll({ company_id: companyId }),
        productApi.getAll({ company_id: companyId })
      ]);
      setCostSummary(sumRes.data.data);
      setVouchers(vRes.data.data || []);
      setRawMaterialsList(rmRes.data.data || rmRes.data || []);
      setProductsList(prodRes.data.data || prodRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load manufacturing accounting data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  // Handle Material in Source Item
  const handleSourceMaterialChange = (idx, materialId) => {
    const mat = rawMaterialsList.find(m => m.material_id === parseInt(materialId));
    const updated = [...journalForm.source_items];
    updated[idx] = {
      ...updated[idx],
      raw_material_id: materialId,
      unit_cost: parseFloat(mat?.unit_price || mat?.standard_cost || 0)
    };
    setJournalForm({ ...journalForm, source_items: updated });
  };

  // Handle Product in Destination Item
  const handleDestinationProductChange = (idx, productId) => {
    const prod = productsList.find(p => p.product_id === parseInt(productId));
    const updated = [...journalForm.destination_items];
    updated[idx] = {
      ...updated[idx],
      product_id: productId,
      unit_cost: parseFloat(prod?.cost_price || prod?.standard_cost || 0)
    };
    setJournalForm({ ...journalForm, destination_items: updated });
  };

  // Submit Stock Journal
  const handleRecordStockJournal = async (e) => {
    e.preventDefault();
    try {
      await mfgApi.recordStockJournal({ ...journalForm, company_id: companyId });
      toast.success('Manufacturing Stock Journal voucher posted!');
      setIsStockJournalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post stock journal');
    }
  };

  // Submit Scrap Loss
  const handleRecordScrap = async (e) => {
    e.preventDefault();
    try {
      await mfgApi.recordScrap({ ...scrapForm, company_id: companyId });
      toast.success('Production Rejection & Scrap Loss voucher posted!');
      setIsScrapModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post scrap voucher');
    }
  };

  // Submit Rework
  const handleRecordRework = async (e) => {
    e.preventDefault();
    try {
      await mfgApi.recordRework({ ...reworkForm, company_id: companyId });
      toast.success('Rework & Rectification Cost voucher posted!');
      setIsReworkModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post rework voucher');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manufacturing & Cost Journal</h1>
            <p className="text-sm text-slate-500">
              Tally Stock Journal, Raw Material Consumptions, Rework Rectification, and Scrap Abnormal Loss Accounting
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsStockJournalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Layers className="w-4 h-4" /> Stock Journal
          </button>
          <button
            onClick={() => setIsScrapModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <AlertTriangle className="w-4 h-4" /> Record Scrap Loss
          </button>
          <button
            onClick={() => setIsReworkModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <RotateCcw className="w-4 h-4" /> Record Rework Cost
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Raw Material Consumed</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹{parseFloat(costSummary?.raw_material_consumption?.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">
            Qty: {parseFloat(costSummary?.raw_material_consumption?.total_quantity || 0).toFixed(2)} units
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Finished Goods Produced</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {parseFloat(costSummary?.finished_goods_production?.total_quantity || 0).toFixed(2)} units
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Production Inward</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scrap & Rejection Loss</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            {parseFloat(costSummary?.quality_and_rejection?.rejected_quantity || 0).toFixed(2)} units
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Abnormal Loss written off</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">QC Production Yield</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-indigo-600">
              {costSummary?.quality_and_rejection?.yield_percentage || 100}%
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Passed vs Inspected Ratio</span>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-base font-bold text-slate-900">Manufacturing Vouchers & Stock Journals</h2>
          <button onClick={fetchData} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Voucher No</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Narration / Description</th>
                <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading manufacturing vouchers...
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No manufacturing stock journals or scrap vouchers recorded yet.
                  </td>
                </tr>
              ) : (
                vouchers.map(v => (
                  <tr key={v.voucher_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{v.voucher_number}</td>
                    <td className="py-3.5 px-4 text-slate-600">{new Date(v.voucher_date).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${v.voucher_number.startsWith('STK') ? 'bg-purple-50 text-purple-700 border-purple-200' : v.voucher_number.startsWith('SCRAP') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {v.voucher_number.startsWith('STK') ? 'Stock Journal' : v.voucher_number.startsWith('SCRAP') ? 'Scrap Loss' : 'Rework Cost'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 text-xs max-w-md truncate">{v.narration || '-'}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      ₹{parseFloat(v.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        POSTED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: STOCK JOURNAL (Source Consumption & Destination Production) */}
      {isStockJournalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Tally Stock Journal</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">Manufacturing Transfer Voucher</h2>
              </div>
              <button onClick={() => setIsStockJournalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordStockJournal} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Voucher Date</label>
                <input
                  type="date"
                  value={journalForm.voucher_date}
                  onChange={(e) => setJournalForm({ ...journalForm, voucher_date: e.target.value })}
                  className="w-full md:w-64 px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  required
                />
              </div>

              {/* Source (Consumption) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-rose-600 uppercase tracking-wider">Source (Raw Materials Consumed)</h3>
                  <button
                    type="button"
                    onClick={() => setJournalForm({
                      ...journalForm,
                      source_items: [...journalForm.source_items, { raw_material_id: '', quantity: 1, unit_cost: 0 }]
                    })}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Material
                  </button>
                </div>
                {journalForm.source_items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <select
                        value={it.raw_material_id}
                        onChange={(e) => handleSourceMaterialChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        required
                      >
                        <option value="">Select Raw Material...</option>
                        {rawMaterialsList.map(rm => (
                          <option key={rm.material_id} value={rm.material_id}>{rm.material_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => {
                          const updated = [...journalForm.source_items];
                          updated[idx].quantity = e.target.value;
                          setJournalForm({ ...journalForm, source_items: updated });
                        }}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Cost"
                        value={it.unit_cost}
                        onChange={(e) => {
                          const updated = [...journalForm.source_items];
                          updated[idx].unit_cost = e.target.value;
                          setJournalForm({ ...journalForm, source_items: updated });
                        }}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Destination (Finished Goods Produced) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Destination (Finished Goods Produced)</h3>
                  <button
                    type="button"
                    onClick={() => setJournalForm({
                      ...journalForm,
                      destination_items: [...journalForm.destination_items, { product_id: '', quantity: 1, unit_cost: 0 }]
                    })}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Product
                  </button>
                </div>
                {journalForm.destination_items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <select
                        value={it.product_id}
                        onChange={(e) => handleDestinationProductChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        required
                      >
                        <option value="">Select Produced Product...</option>
                        {productsList.map(p => (
                          <option key={p.product_id} value={p.product_id}>{p.product_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => {
                          const updated = [...journalForm.destination_items];
                          updated[idx].quantity = e.target.value;
                          setJournalForm({ ...journalForm, destination_items: updated });
                        }}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Cost"
                        value={it.unit_cost}
                        onChange={(e) => {
                          const updated = [...journalForm.destination_items];
                          updated[idx].unit_cost = e.target.value;
                          setJournalForm({ ...journalForm, destination_items: updated });
                        }}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Narration</label>
                <input
                  type="text"
                  placeholder="Manufacturing batch or production order remarks"
                  value={journalForm.narration}
                  onChange={(e) => setJournalForm({ ...journalForm, narration: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStockJournalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  Post Stock Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SCRAP & REJECTION LOSS */}
      {isScrapModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-rose-50/50">
              <div>
                <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Abnormal Loss Accounting</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">Record Rejection Scrap</h2>
              </div>
              <button onClick={() => setIsScrapModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordScrap} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Rejected Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={scrapForm.rejected_quantity}
                    onChange={(e) => setScrapForm({ ...scrapForm, rejected_quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={scrapForm.unit_cost}
                    onChange={(e) => setScrapForm({ ...scrapForm, unit_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reason for Rejection / Scrap</label>
                <textarea
                  rows="2"
                  value={scrapForm.scrap_reason}
                  onChange={(e) => setScrapForm({ ...scrapForm, scrap_reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  required
                ></textarea>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <span className="font-bold">Accounting Entry:</span> Dr. Production Rejection & Scrap Loss (P&L Indirect Expense) ₹{((parseFloat(scrapForm.rejected_quantity) || 0) * (parseFloat(scrapForm.unit_cost) || 0)).toFixed(2)} | Cr. Work in Progress Clearing.
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScrapModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  Post Scrap Loss
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REWORK COST */}
      {isReworkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-amber-50/50">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Rectification Accounting</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">Record Rework Expense</h2>
              </div>
              <button onClick={() => setIsReworkModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordRework} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Rework Units Count</label>
                <input
                  type="number"
                  value={reworkForm.rework_quantity}
                  onChange={(e) => setReworkForm({ ...reworkForm, rework_quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Additional Material Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={reworkForm.additional_material_cost}
                    onChange={(e) => setReworkForm({ ...reworkForm, additional_material_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Additional Labor Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={reworkForm.additional_labor_cost}
                    onChange={(e) => setReworkForm({ ...reworkForm, additional_labor_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Rework Reason</label>
                <input
                  type="text"
                  value={reworkForm.rework_reason}
                  onChange={(e) => setReworkForm({ ...reworkForm, rework_reason: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <span className="font-bold">Total Rework Cost:</span> ₹{((parseFloat(reworkForm.additional_material_cost) || 0) + (parseFloat(reworkForm.additional_labor_cost) || 0)).toFixed(2)} (Posted to Direct Rework Expense A/c).
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReworkModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  Post Rework Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManufacturingJournal;
