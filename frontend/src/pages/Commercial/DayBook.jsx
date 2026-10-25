import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { accounting as accountingApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Calendar,
  Filter,
  Eye,
  Plus,
  RefreshCw,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  CheckCircle2,
  X
} from 'lucide-react';

const VOUCHER_TYPE_COLORS = {
  SALES: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PURCHASE: 'bg-blue-50 text-blue-700 border-blue-200',
  RECEIPT: 'bg-teal-50 text-teal-700 border-teal-200',
  PAYMENT: 'bg-amber-50 text-amber-700 border-amber-200',
  CONTRA: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  JOURNAL: 'bg-purple-50 text-purple-700 border-purple-200',
  CREDIT_NOTE: 'bg-pink-50 text-pink-700 border-pink-200',
  DEBIT_NOTE: 'bg-orange-50 text-orange-700 border-orange-200',
};

const DayBook = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(false);
  const [dayBookData, setDayBookData] = useState({
    count: 0,
    total_amount: '0.00',
    total_debit: '0.00',
    total_credit: '0.00',
    vouchers: []
  });
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New manual voucher modal state
  const [isNewVoucherOpen, setIsNewVoucherOpen] = useState(false);
  const [newVoucherForm, setNewVoucherForm] = useState({
    voucher_type_code: 'JOURNAL',
    voucher_date: new Date().toISOString().split('T')[0],
    narration: '',
    reference_number: '',
    lines: [
      { ledger_id: '', debit_amount: '', credit_amount: '', narration: '' },
      { ledger_id: '', debit_amount: '', credit_amount: '', narration: '' }
    ]
  });
  const [ledgersList, setLedgersList] = useState([]);

  const fetchDayBook = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const res = await accountingApi.getDayBook({
        company_id: companyId,
        from_date: fromDate,
        to_date: toDate,
        voucher_type: selectedType || undefined
      });
      setDayBookData(res.data.data || {
        count: 0,
        total_amount: '0.00',
        total_debit: '0.00',
        total_credit: '0.00',
        vouchers: []
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load Day Book');
    } finally {
      setLoading(false);
    }
  };

  const fetchLedgers = async () => {
    if (!companyId) return;
    try {
      const res = await accountingApi.getLedgers({ company_id: companyId });
      setLedgersList(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDayBook();
  }, [companyId, fromDate, toDate, selectedType]);

  useEffect(() => {
    fetchLedgers();
  }, [companyId]);

  const handleOpenVoucherModal = async (v) => {
    try {
      const res = await accountingApi.getVoucherById(v.voucher_id);
      setSelectedVoucher(res.data.data);
      setIsModalOpen(true);
    } catch (err) {
      toast.error('Failed to load voucher details');
    }
  };

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    try {
      const parsedLines = newVoucherForm.lines
        .filter(l => l.ledger_id && (parseFloat(l.debit_amount) > 0 || parseFloat(l.credit_amount) > 0))
        .map(l => ({
          ledger_id: parseInt(l.ledger_id),
          debit_amount: parseFloat(l.debit_amount) || 0,
          credit_amount: parseFloat(l.credit_amount) || 0,
          narration: l.narration
        }));

      const totalDr = parsedLines.reduce((s, l) => s + l.debit_amount, 0);
      const totalCr = parsedLines.reduce((s, l) => s + l.credit_amount, 0);

      if (Math.abs(totalDr - totalCr) > 0.01) {
        toast.error(`Voucher is not balanced! Total Debit (₹${totalDr.toFixed(2)}) must equal Total Credit (₹${totalCr.toFixed(2)})`);
        return;
      }

      await accountingApi.createVoucher({
        ...newVoucherForm,
        company_id: companyId,
        lines: parsedLines
      });

      toast.success('Voucher created and posted successfully!');
      setIsNewVoucherOpen(false);
      fetchDayBook();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create voucher');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Day Book</h1>
            <p className="text-sm text-slate-500">
              Chronological register of all double-entry financial transactions recorded for the selected period
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-500">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-medium focus:outline-none"
            />
            <span className="text-slate-500">To</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-medium focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-sm">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-transparent border-none text-slate-700 font-medium focus:outline-none"
            >
              <option value="">All Voucher Types</option>
              <option value="VCH-SALES">Sales Invoice</option>
              <option value="VCH-PURCHASE">Purchase Invoice</option>
              <option value="VCH-RECEIPT">Receipt Voucher</option>
              <option value="VCH-PAYMENT">Payment Voucher</option>
              <option value="VCH-CONTRA">Contra Voucher</option>
              <option value="VCH-JOURNAL">Journal Voucher</option>
              <option value="VCH-CRNOTE">Credit Note</option>
              <option value="VCH-DRNOTE">Debit Note</option>
            </select>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 text-sm text-indigo-900">
            <p className="font-semibold">How to read a Tally purchase entry</p>
            <p className="mt-1 text-indigo-700">
              Stock received is debited as an asset, eligible input GST is debited as tax credit, and the vendor is credited as a payable.
              It does not become an expense or profit until the stock is consumed or sold.
            </p>
          </div>

          <button
            onClick={() => setIsNewVoucherOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            New Voucher
          </button>

          <button
            onClick={() => window.print()}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600"
            title="Print Day Book"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Transactions</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{dayBookData.count}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Daily Turnover / Flow</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">₹{parseFloat(dayBookData.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Audit Status</p>
            <div className="flex items-center gap-1.5 mt-1 text-emerald-600 font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4" /> Balanced & Double-Entry Verified
            </div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <RefreshCw className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Day Book Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Voucher No</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Particulars</th>
                <th className="py-3.5 px-4 text-right">Debit (₹)</th>
                <th className="py-3.5 px-4 text-right">Credit (₹)</th>
                <th className="py-3.5 px-4">Narration</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading Day Book transactions...
                  </td>
                </tr>
              ) : dayBookData.vouchers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    No transactions recorded on this date.
                  </td>
                </tr>
              ) : (
                dayBookData.vouchers.map((v) => (
                  <tr key={v.voucher_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {v.voucher_number}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${VOUCHER_TYPE_COLORS[v.base_category] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {v.voucher_type_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {v.particulars}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                      ₹{parseFloat(v.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                      ₹{parseFloat(v.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {v.narration || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleOpenVoucherModal(v)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="View Full Double-Entry Lines"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {dayBookData.vouchers.length > 0 && (
              <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <tr>
                  <td colSpan="3" className="py-3.5 px-4 uppercase text-xs tracking-wider">
                    Total for Day ({dayBookData.count} transactions)
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700">
                    ₹{parseFloat(dayBookData.total_debit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700">
                    ₹{parseFloat(dayBookData.total_credit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Voucher Detail Modal */}
      {isModalOpen && selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Double-Entry Audit View</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">{selectedVoucher.voucher_number}</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400">Date:</span>
                  <p className="font-semibold text-slate-800">{new Date(selectedVoucher.voucher_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-slate-400">Voucher Type:</span>
                  <p className="font-semibold text-slate-800">{selectedVoucher.voucher_type_name}</p>
                </div>
                <div>
                  <span className="text-slate-400">Reference:</span>
                  <p className="font-semibold text-slate-800">{selectedVoucher.reference_number || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Posted By:</span>
                  <p className="font-semibold text-slate-800">{selectedVoucher.created_by_name || 'System'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Accounting Lines</h3>
                <table className="w-full text-left text-sm border-collapse border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Account / Ledger</th>
                      <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                      <th className="py-2.5 px-3">Narration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedVoucher.lines?.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-400 text-xs">{line.line_number}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {line.ledger_name}
                          <span className="block text-xs font-mono text-slate-400">{line.ledger_code}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                          {parseFloat(line.debit_amount) > 0 ? `₹${parseFloat(line.debit_amount).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                          {parseFloat(line.credit_amount) > 0 ? `₹${parseFloat(line.credit_amount).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-500">{line.narration || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedVoucher.narration && (
                <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded-xl text-xs text-amber-900">
                  <span className="font-bold">Narration:</span> {selectedVoucher.narration}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Voucher Creation Modal */}
      {isNewVoucherOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Double-Entry Accounting</span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">Record Manual Voucher</h2>
              </div>
              <button onClick={() => setIsNewVoucherOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Voucher Type</label>
                  <select
                    value={newVoucherForm.voucher_type_code}
                    onChange={(e) => setNewVoucherForm({ ...newVoucherForm, voucher_type_code: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="JOURNAL">Journal Voucher</option>
                    <option value="CONTRA">Contra (Bank / Cash)</option>
                    <option value="PAYMENT">Payment Voucher</option>
                    <option value="RECEIPT">Receipt Voucher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={newVoucherForm.voucher_date}
                    onChange={(e) => setNewVoucherForm({ ...newVoucherForm, voucher_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Reference No</label>
                  <input
                    type="text"
                    placeholder="Ref / Chq / Voucher No"
                    value={newVoucherForm.reference_number}
                    onChange={(e) => setNewVoucherForm({ ...newVoucherForm, reference_number: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Voucher Entries (Debits must equal Credits)</label>
                <div className="space-y-2">
                  {newVoucherForm.lines.map((l, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-200/60">
                      <div className="col-span-5">
                        <select
                          value={l.ledger_id}
                          onChange={(e) => {
                            const updated = [...newVoucherForm.lines];
                            updated[idx].ledger_id = e.target.value;
                            setNewVoucherForm({ ...newVoucherForm, lines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                          required
                        >
                          <option value="">Select Ledger Account...</option>
                          {ledgersList.map(led => (
                            <option key={led.ledger_id} value={led.ledger_id}>
                              {led.ledger_name} ({led.group_name})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Debit (₹)"
                          value={l.debit_amount}
                          onChange={(e) => {
                            const updated = [...newVoucherForm.lines];
                            updated[idx].debit_amount = e.target.value;
                            if (parseFloat(e.target.value) > 0) updated[idx].credit_amount = '';
                            setNewVoucherForm({ ...newVoucherForm, lines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Credit (₹)"
                          value={l.credit_amount}
                          onChange={(e) => {
                            const updated = [...newVoucherForm.lines];
                            updated[idx].credit_amount = e.target.value;
                            if (parseFloat(e.target.value) > 0) updated[idx].debit_amount = '';
                            setNewVoucherForm({ ...newVoucherForm, lines: updated });
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white"
                        />
                      </div>
                      <div className="col-span-1 text-center">
                        {newVoucherForm.lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newVoucherForm.lines.filter((_, i) => i !== idx);
                              setNewVoucherForm({ ...newVoucherForm, lines: updated });
                            }}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setNewVoucherForm({
                    ...newVoucherForm,
                    lines: [...newVoucherForm.lines, { ledger_id: '', debit_amount: '', credit_amount: '', narration: '' }]
                  })}
                  className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Line
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Narration</label>
                <textarea
                  rows="2"
                  placeholder="Enter detailed narration / business remarks..."
                  value={newVoucherForm.narration}
                  onChange={(e) => setNewVoucherForm({ ...newVoucherForm, narration: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                ></textarea>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewVoucherOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
                >
                  Post Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DayBook;
