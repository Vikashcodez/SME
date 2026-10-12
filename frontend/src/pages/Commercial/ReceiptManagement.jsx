import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  sales as salesApi,
  customers as customersApi,
  accounting as accountingApi
} from '../../services/api';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  FileText,
  Calendar,
  X,
  ArrowRight,
  ShieldCheck,
  Building2,
  Wallet
} from 'lucide-react';

const ReceiptManagement = () => {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [customersList, setCustomersList] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Settlement Form
  const [receiptAmount, setReceiptAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('BANK'); // 'BANK' or 'CASH'
  const [instrumentType, setInstrumentType] = useState('NEFT');
  const [refNumber, setRefNumber] = useState('');
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [allocations, setAllocations] = useState({}); // { [invoice_id]: allocatedAmount }
  const [submitting, setSubmitting] = useState(false);

  // Fetch Customers
  const fetchCustomers = async () => {
    if (!companyId) return;
    try {
      const res = await customersApi.getAll({ company_id: companyId });
      setCustomersList(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [companyId]);

  // Fetch Unpaid Invoices when Customer changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setUnpaidInvoices([]);
      setAllocations({});
      return;
    }

    const loadCustomerInvoices = async () => {
      try {
        setLoadingInvoices(true);
        const res = await salesApi.getInvoices({
          company_id: companyId,
          customer_id: selectedCustomerId
        });
        const due = (res.data.data || []).filter(inv => inv.payment_status !== 'PAID');
        setUnpaidInvoices(due);
        setAllocations({});
      } catch (err) {
        console.error(err);
        toast.error('Failed to load pending bills');
      } finally {
        setLoadingInvoices(false);
      }
    };

    loadCustomerInvoices();
  }, [selectedCustomerId, companyId]);

  const selectedCustomer = useMemo(() => {
    return customersList.find(c => String(c.customer_id) === String(selectedCustomerId));
  }, [selectedCustomerId, customersList]);

  // Auto Allocate FIFO (oldest bills first)
  const handleAutoAllocate = () => {
    let rem = parseFloat(receiptAmount) || 0;
    if (rem <= 0) {
      toast.error('Please enter a Receipt Amount first');
      return;
    }

    const newAlloc = {};
    for (const inv of unpaidInvoices) {
      const due = parseFloat(inv.outstanding_amount || inv.balance_due || inv.net_total_amount);
      if (rem <= 0) break;
      const alloc = Math.min(rem, due);
      newAlloc[inv.sales_invoice_id] = alloc;
      rem -= alloc;
    }
    setAllocations(newAlloc);
    toast.success('Auto-allocated against pending invoices via FIFO');
  };

  // Total Allocated
  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce((acc, v) => acc + (parseFloat(v) || 0), 0);
  }, [allocations]);

  const unallocatedBalance = useMemo(() => {
    const total = parseFloat(receiptAmount) || 0;
    return Math.max(0, +(total - totalAllocated).toFixed(2));
  }, [receiptAmount, totalAllocated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(receiptAmount);
    if (!selectedCustomerId || !amt || amt <= 0) {
      toast.error('Please select customer and enter valid receipt amount');
      return;
    }

    const allocList = Object.entries(allocations)
      .filter(([_, val]) => parseFloat(val) > 0)
      .map(([invId, val]) => ({
        invoice_id: parseInt(invId),
        allocated_amount: parseFloat(val)
      }));

    try {
      setSubmitting(true);
      await salesApi.recordReceipt({
        company_id: companyId,
        customer_id: parseInt(selectedCustomerId),
        amount: amt,
        payment_mode: paymentMode,
        payment_instrument_type: instrumentType,
        instrument_reference_number: refNumber,
        settlement_date: settlementDate,
        narration: narration || `Customer payment from ${selectedCustomer?.trade_name}`,
        allocations: allocList
      });

      toast.success('Receipt voucher posted & invoices settled successfully!');
      // Reset form
      setReceiptAmount('');
      setRefNumber('');
      setNarration('');
      setAllocations({});
      // Refresh customer invoices & data
      fetchCustomers();
      const res = await salesApi.getInvoices({ company_id: companyId, customer_id: selectedCustomerId });
      setUnpaidInvoices((res.data.data || []).filter(inv => inv.payment_status !== 'PAID'));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to record receipt settlement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Receipts & Bill Settlements</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Tally-style bill-wise customer collections with AGST_REF matching, bank reconciliation, and double-entry postings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settlement Form Panel */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-600" />
            Record Payment Receipt
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Customer *</label>
              <select
                required
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">Select Customer...</option>
                {customersList.map(c => (
                  <option key={c.customer_id} value={c.customer_id}>
                    {c.trade_name} (₹{parseFloat(c.current_balance || 0).toLocaleString()} {c.current_balance_type})
                  </option>
                ))}
              </select>
            </div>

            {selectedCustomer && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Ledger:</span>
                  <span className="font-semibold text-slate-800">{selectedCustomer.ledger_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Ledger Due:</span>
                  <span className="font-bold text-indigo-600">
                    ₹{parseFloat(selectedCustomer.current_balance || 0).toLocaleString()} {selectedCustomer.current_balance_type}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Amount (₹) *</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="0.00"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deposit To</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="BANK">Primary Bank Account</option>
                  <option value="CASH">Cash in Hand</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Instrument Type</label>
                <select
                  value={instrumentType}
                  onChange={(e) => setInstrumentType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="NEFT">NEFT / RTGS</option>
                  <option value="IMPS">IMPS</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">UTR / Cheque / Ref Number</label>
              <input
                type="text"
                placeholder="e.g. UTR1984729103"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Settlement Date</label>
              <input
                type="date"
                required
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Narration</label>
              <input
                type="text"
                placeholder="Optional settlement remark"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            {/* Posting Summary Box */}
            <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 text-xs space-y-1 font-mono">
              <div className="font-bold text-indigo-900 mb-1">Auto Double-Entry Posting:</div>
              <div className="text-slate-700">DR: {paymentMode === 'CASH' ? 'Cash in Hand' : 'Bank Account'} ₹{parseFloat(receiptAmount || 0).toFixed(2)}</div>
              <div className="text-slate-700">CR: Customer Ledger ₹{parseFloat(receiptAmount || 0).toFixed(2)}</div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Posting Settlement...' : 'Post Receipt & Settle Bills'}
            </button>
          </form>
        </div>

        {/* Bill Allocation Matching Panel */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Bill-Wise Allocation (AGST_REF)</h2>
              <p className="text-xs text-slate-500">Allocate payment against pending customer invoices.</p>
            </div>

            {unpaidInvoices.length > 0 && (
              <button
                type="button"
                onClick={handleAutoAllocate}
                className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold transition"
              >
                Auto-Allocate (FIFO)
              </button>
            )}
          </div>

          {!selectedCustomerId ? (
            <div className="py-20 text-center text-slate-400">
              Select a customer on the left to view pending tax invoices.
            </div>
          ) : loadingInvoices ? (
            <div className="py-20 text-center text-slate-400">
              Loading pending invoices...
            </div>
          ) : unpaidInvoices.length === 0 ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700">All Invoices Cleared!</p>
              <p className="text-xs text-slate-500 mt-0.5">This customer has zero outstanding unpaid invoices.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Date / Due</th>
                      <th className="p-3 text-right">Invoice Total</th>
                      <th className="p-3 text-right">Outstanding Due</th>
                      <th className="p-3 text-right w-36">Allocated (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unpaidInvoices.map((inv) => {
                      const due = parseFloat(inv.outstanding_amount || inv.balance_due || inv.net_total_amount);
                      const currentAlloc = allocations[inv.sales_invoice_id] || '';

                      return (
                        <tr key={inv.sales_invoice_id} className="hover:bg-slate-50/50">
                          <td className="p-3">
                            <span className="font-semibold text-slate-900 font-mono">{inv.invoice_number}</span>
                            <div className="text-[10px] text-slate-400">{inv.payment_status}</div>
                          </td>
                          <td className="p-3 text-slate-500">
                            <div>{new Date(inv.invoice_date).toLocaleDateString()}</div>
                            <div className="text-[10px] text-amber-600">Due: {new Date(inv.due_date).toLocaleDateString()}</div>
                          </td>
                          <td className="p-3 text-right font-medium text-slate-700">
                            ₹{parseFloat(inv.net_total_amount).toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-bold text-amber-600">
                            ₹{due.toFixed(2)}
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="0"
                              max={due}
                              step="0.01"
                              placeholder="0.00"
                              value={currentAlloc}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setAllocations({ ...allocations, [inv.sales_invoice_id]: val });
                              }}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Allocation Reconciliation */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Total Allocated:</span>
                  <span className="ml-1.5 font-bold text-slate-900">₹{totalAllocated.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Unallocated Advance:</span>
                  <span className="ml-1.5 font-bold text-indigo-600">₹{unallocatedBalance.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptManagement;
