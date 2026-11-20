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

  // Bank & Cash accounts
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
  const [cashLedgers, setCashLedgers] = useState([]);
  const [selectedCashLedgerId, setSelectedCashLedgerId] = useState('');

  // Settlement Form
  const [receiptAmount, setReceiptAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('BANK'); // 'BANK' or 'CASH'
  const [instrumentType, setInstrumentType] = useState('NEFT');
  const [refNumber, setRefNumber] = useState('');
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState('');
  const [allocations, setAllocations] = useState({}); // { [invoice_id]: allocatedAmount }
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch Customers, Bank Accounts, and Cash Ledgers
  const fetchDropdowns = async () => {
    if (!companyId) return;
    try {
      const [cRes, bRes, cashRes, coaRes] = await Promise.allSettled([
        customersApi.getAll({ company_id: companyId }),
        accountingApi.getBankAccounts({ company_id: companyId }),
        accountingApi.getLedgers({ company_id: companyId, group_code: 'GRP-CASH,CASH_IN_HAND' }),
        accountingApi.getChartOfAccounts({ company_id: companyId })
      ]);

      if (cRes.status === 'fulfilled') setCustomersList(cRes.value.data?.data || []);

      // Extract bank accounts
      let banks = [];
      if (bRes.status === 'fulfilled' && bRes.value.data?.data?.length > 0) {
        banks = bRes.value.data.data;
      } else if (coaRes.status === 'fulfilled') {
        const groups = coaRes.value.data?.data || [];
        const bankGroup = groups.find(g => ['GRP-BANK', 'BANK_ACCOUNTS'].includes(g.group_code));
        const bankLedgers = bankGroup?.ledgers || [];
        banks = bankLedgers.map(l => ({
          bank_account_id: l.ledger_id,
          ledger_id: l.ledger_id,
          bank_name: l.ledger_name,
          account_number: l.ledger_code,
          current_balance: l.current_balance,
          current_balance_type: l.current_balance_type || 'DR'
        }));
      }
      setBankAccounts(banks);
      const fundedBank = banks.find(b => parseFloat(b.current_balance || 0) > 0) || banks[0];
      if (fundedBank) {
        setSelectedBankAccountId(prev => banks.some(b => String(b.bank_account_id) === String(prev)) && prev ? prev : String(fundedBank.bank_account_id));
      }

      // Extract cash ledgers
      let cashList = (cashRes.status === 'fulfilled' && cashRes.value.data?.data) || [];
      if (cashList.length === 0 && coaRes.status === 'fulfilled') {
        const groups = coaRes.value.data?.data || [];
        const cashGroup = groups.find(g => ['GRP-CASH', 'CASH_IN_HAND'].includes(g.group_code));
        cashList = cashGroup?.ledgers || [];
      }
      setCashLedgers(cashList);
      const fundedCash = cashList.find(c => parseFloat(c.current_balance || 0) > 0) || cashList[0];
      if (fundedCash) {
        setSelectedCashLedgerId(prev => cashList.some(c => String(c.ledger_id) === String(prev)) && prev ? prev : String(fundedCash.ledger_id));
      }
    } catch (err) {
      console.error('Error loading dropdowns:', err);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, [companyId]);

  // Fetch Unpaid Invoices when Customer changes
  useEffect(() => {
    if (!selectedCustomerId) {
      setUnpaidInvoices([]);
      setAllocations({});
      setSelectedInvoiceId('');
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
        setSelectedInvoiceId('');
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

  const handleInvoiceSelect = (invoice) => {
    const invoiceId = String(invoice.sales_invoice_id);
    const due = parseFloat(invoice.outstanding_amount || invoice.balance_due || invoice.net_total_amount) || 0;
    const amount = parseFloat(receiptAmount) || 0;
    setSelectedInvoiceId(invoiceId);
    setAllocations({ [invoiceId]: amount > 0 ? Math.min(amount, due) : '' });
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

    if (unpaidInvoices.length > 0 && !selectedInvoiceId) {
      toast.error('Select the invoice against which this receipt should be settled');
      return;
    }

    const allocList = Object.entries(allocations)
      .filter(([_, val]) => parseFloat(val) > 0)
      .map(([invId, val]) => ({
        invoice_id: parseInt(invId),
        allocated_amount: parseFloat(val)
      }));

    if (selectedInvoiceId && (allocList.length !== 1 || Math.abs(allocList[0].allocated_amount - amt) > 0.01)) {
      toast.error('The selected invoice allocation must equal the receipt amount');
      return;
    }

    try {
      setSubmitting(true);
      await salesApi.recordReceipt({
        company_id: companyId,
        customer_id: parseInt(selectedCustomerId),
        amount: amt,
        payment_mode: paymentMode,
        bank_account_id: paymentMode === 'BANK' ? selectedBankAccountId : null,
        payment_ledger_id: paymentMode === 'CASH' ? selectedCashLedgerId : null,
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
      setSelectedInvoiceId('');
      // Refresh customer invoices & data
      fetchDropdowns();
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
                onChange={(e) => {
                  const value = e.target.value;
                  setReceiptAmount(value);
                  if (selectedInvoiceId) {
                    const invoice = unpaidInvoices.find((item) => String(item.sales_invoice_id) === selectedInvoiceId);
                    const due = parseFloat(invoice?.outstanding_amount || invoice?.balance_due || invoice?.net_total_amount) || 0;
                    setAllocations({ [selectedInvoiceId]: Math.min(parseFloat(value) || 0, due) });
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Deposit To</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('BANK')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      paymentMode === 'BANK'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Bank Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                      paymentMode === 'CASH'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    Cash in Hand
                  </button>
                </div>
              </div>

              {paymentMode === 'BANK' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Bank Account *
                  </label>
                  {bankAccounts.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                      No registered bank accounts found. Please add a bank account in Ledger & Banking.
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedBankAccountId}
                        onChange={(e) => setSelectedBankAccountId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                        required
                      >
                        {bankAccounts.map((acc) => (
                          <option key={acc.bank_account_id} value={acc.bank_account_id}>
                            {acc.bank_name} - {acc.account_number} (Bal: ₹{parseFloat(acc.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {acc.current_balance_type || 'DR'})
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const selBank = bankAccounts.find(b => String(b.bank_account_id) === String(selectedBankAccountId)) || bankAccounts[0];
                        if (!selBank) return null;
                        const curBal = parseFloat(selBank.current_balance || 0);
                        const recAmt = parseFloat(receiptAmount || 0);
                        const newBal = curBal + (Number.isFinite(recAmt) ? recAmt : 0);
                        return (
                          <div className="mt-2 p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs flex justify-between items-center">
                            <div>
                              <span className="text-slate-500">Current Balance: </span>
                              <span className="font-semibold text-slate-800">₹{curBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-500">After Deposit: </span>
                              <span className="font-bold text-emerald-600">₹{newBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cash in Hand Account
                  </label>
                  {cashLedgers.length > 1 ? (
                    <select
                      value={selectedCashLedgerId}
                      onChange={(e) => setSelectedCashLedgerId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {cashLedgers.map((c) => (
                        <option key={c.ledger_id} value={c.ledger_id}>
                          {c.ledger_name} (Bal: ₹{parseFloat(c.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {c.current_balance_type || 'DR'})
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {(() => {
                    const selCash = cashLedgers.find(c => String(c.ledger_id) === String(selectedCashLedgerId)) || cashLedgers[0];
                    const curBal = parseFloat(selCash?.current_balance || 0);
                    const recAmt = parseFloat(receiptAmount || 0);
                    const newBal = curBal + (Number.isFinite(recAmt) ? recAmt : 0);
                    return (
                      <div className="mt-2 p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-xl text-xs flex justify-between items-center">
                        <div>
                          <span className="text-slate-500">Current Cash in Hand: </span>
                          <span className="font-semibold text-slate-800">₹{curBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500">After Deposit: </span>
                          <span className="font-bold text-emerald-600">₹{newBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

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
              <div className="text-slate-700">DR: {paymentMode === 'CASH' ? 'Cash in Hand' : 'Selected Bank Account'} ₹{parseFloat(receiptAmount || 0).toFixed(2)}</div>
              <div className="text-slate-700">CR: General Sales Account (Income) ₹{parseFloat(receiptAmount || 0).toFixed(2)}</div>
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
              <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-semibold">
                Select one invoice
              </span>
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
                      <th className="p-3 w-10">Pay</th>
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Date / Due</th>
                      <th className="p-3 text-right">Invoice Total</th>
                      <th className="p-3 text-right">Outstanding Due</th>
                      <th className="p-3 text-right w-36">Payment Applied (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unpaidInvoices.map((inv) => {
                      const due = parseFloat(inv.outstanding_amount || inv.balance_due || inv.net_total_amount);
                      const invoiceId = String(inv.sales_invoice_id);
                      const isSelected = selectedInvoiceId === invoiceId;
                      const currentAlloc = isSelected ? allocations[inv.sales_invoice_id] || '' : '';

                      return (
                        <tr key={inv.sales_invoice_id} className={`hover:bg-slate-50/50 ${isSelected ? 'bg-indigo-50/60' : ''}`}>
                          <td className="p-3">
                            <input
                              type="radio"
                              name="settlement-invoice"
                              checked={isSelected}
                              onChange={() => handleInvoiceSelect(inv)}
                              className="h-4 w-4 accent-indigo-600"
                              aria-label={`Select invoice ${inv.invoice_number}`}
                            />
                          </td>
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
                            {isSelected ? (
                              <span className="font-bold text-indigo-700">₹{parseFloat(currentAlloc || 0).toFixed(2)}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
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
