import React, { useState, useEffect, useMemo, useCallback } from "react";
import { masterService } from "../../../services/masterService";
import {
  Landmark,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Scale,
  ShieldCheck,
  Calendar,
  Building2,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useCompany } from "../../../context/CompanyContext";
import { cx, fmtMoney2 } from "../../../utils/format";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Button, IconButton } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Alert } from "../../../components/ui/Alert";
import { EmptyState } from "../../../components/ui/EmptyState";
import { Skeleton, StatCardSkeleton } from "../../../components/ui/Skeleton";

const getFirstDayOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const getToday = () => new Date().toISOString().slice(0, 10);

const getFiscalYearDates = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const isAfterMarch = now.getMonth() >= 3;
  const startYear = isAfterMarch ? currentYear : currentYear - 1;
  const endYear = startYear + 1;
  return {
    from: `${startYear}-04-01`,
    to: `${endYear}-03-31`,
  };
};

const getQuarterDates = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
  const from = new Date(currentYear, quarterStartMonth, 1).toISOString().slice(0, 10);
  const to = new Date(currentYear, quarterStartMonth + 3, 0).toISOString().slice(0, 10);
  return { from, to };
};

export function BalanceSheetPage() {
  const { activeCompany } = useCompany?.() || {};
  const companyName = activeCompany?.company_name || "Chandra Precision Engineering Pvt Ltd";

  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromDate, setFromDate] = useState(getFirstDayOfMonth);
  const [toDate, setToDate] = useState(getToday);
  const [datePreset, setDatePreset] = useState("month"); 
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grouped"); 
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [exportingXml, setExportingXml] = useState(false);

  
  const fetchBalanceSheet = useCallback(async () => {
    
    if (fromDate && toDate && fromDate > toDate) {
      toast.error("From Date cannot be later than To Date");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await masterService.getBalanceSheet({ fromDate, toDate });
      if (res?.data?.success) {
        setData(res.data.data);
      } else {
        throw new Error(res?.data?.message || "Failed to retrieve balance sheet records");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to load Balance Sheet statement";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    fetchBalanceSheet();
  }, [fetchBalanceSheet]);

  
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    if (preset === "month") {
      setFromDate(getFirstDayOfMonth());
      setToDate(getToday());
    } else if (preset === "quarter") {
      const q = getQuarterDates();
      setFromDate(q.from);
      setToDate(q.to);
    } else if (preset === "fy") {
      const fy = getFiscalYearDates();
      setFromDate(fy.from);
      setToDate(fy.to);
    }
  };

  const handleCustomDateChange = (type, val) => {
    setDatePreset("custom");
    if (type === "from") setFromDate(val);
    if (type === "to") setToDate(val);
  };

  
  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  
  const toggleAllGroups = (collapse) => {
    const newCollapsed = {};
    if (collapse) {
      allLiabGroups.forEach((g) => (newCollapsed[`L_${g.group_name}`] = true));
      allAssetGroups.forEach((g) => (newCollapsed[`A_${g.group_name}`] = true));
    }
    setCollapsedGroups(newCollapsed);
  };

  
  const handleExportTallyXml = async () => {
    setExportingXml(true);
    try {
      masterService.downloadTallyXml();
      toast.success("Tally Prime XML export initiated");
    } catch (err) {
      toast.error("Failed to export Tally XML: " + (err.message || "Unknown error"));
    } finally {
      setExportingXml(false);
    }
  };

  
  const handleExportCSV = () => {
    if (!data) return;
    try {
      const headers = ["Side", "Group Name", "Ledger Name", "Balance (INR)", "Dr/Cr"];
      const rows = [];

      (data.liabilities || []).forEach((l) => {
        rows.push([
          "Capital & Liabilities",
          `"${l.group_name || "General"}"`,
          `"${l.ledger_name}"`,
          Math.abs(parseFloat(l.current_balance) || 0).toFixed(2),
          l.dr_cr || "Cr",
        ]);
      });

      (data.assets || []).forEach((a) => {
        rows.push([
          "Property & Assets",
          `"${a.group_name || "General"}"`,
          `"${a.ledger_name}"`,
          Math.abs(parseFloat(a.current_balance) || 0).toFixed(2),
          a.dr_cr || "Dr",
        ]);
      });

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Balance_Sheet_${fromDate}_to_${toDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Balance Sheet exported to CSV");
    } catch {
      toast.error("Failed to export CSV");
    }
  };

  
  const handlePrint = () => {
    window.print();
  };

  
  const groupAccounts = useCallback((accountsList = [], query = "") => {
    const filtered = accountsList.filter((item) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const nameMatch = item.ledger_name?.toLowerCase().includes(q);
      const groupMatch = item.group_name?.toLowerCase().includes(q);
      return nameMatch || groupMatch;
    });

    const groupsMap = new Map();

    filtered.forEach((item) => {
      const groupName = item.group_name || "General Accounts";
      if (!groupsMap.has(groupName)) {
        groupsMap.set(groupName, {
          group_name: groupName,
          items: [],
          subtotal: 0,
        });
      }
      const g = groupsMap.get(groupName);
      const val = Math.abs(parseFloat(item.current_balance) || 0);
      g.items.push(item);
      g.subtotal += val;
    });

    return Array.from(groupsMap.values());
  }, []);

  const allLiabGroups = useMemo(() => groupAccounts(data?.liabilities || [], ""), [data?.liabilities, groupAccounts]);
  const allAssetGroups = useMemo(() => groupAccounts(data?.assets || [], ""), [data?.assets, groupAccounts]);

  const filteredLiabGroups = useMemo(() => groupAccounts(data?.liabilities || [], searchQuery), [data?.liabilities, searchQuery, groupAccounts]);
  const filteredAssetGroups = useMemo(() => groupAccounts(data?.assets || [], searchQuery), [data?.assets, searchQuery, groupAccounts]);

  
  const totalLiabilities = useMemo(() => {
    if (typeof data?.totalLiabilities === "number") return data.totalLiabilities;
    return (data?.liabilities || []).reduce((sum, item) => sum + Math.abs(parseFloat(item.current_balance) || 0), 0);
  }, [data]);

  const totalAssets = useMemo(() => {
    if (typeof data?.totalAssets === "number") return data.totalAssets;
    return (data?.assets || []).reduce((sum, item) => sum + Math.abs(parseFloat(item.current_balance) || 0), 0);
  }, [data]);

  const variance = Math.abs(totalLiabilities - totalAssets);
  const isBalanced = data?.isBalanced !== undefined ? data.isBalanced : variance < 0.01;

  const totalLiabCount = (data?.liabilities || []).length;
  const totalAssetCount = (data?.assets || []).length;
  const hasNoData = !loading && totalLiabCount === 0 && totalAssetCount === 0;

  return (
    <main className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2" aria-label="Balance Sheet Module">
      
      <header className="print:hidden">
        <PageHeader
          icon={Landmark}
          title="Balance Sheet Summary"
          subtitle="Tally Prime 9 Financial Statements"
          meta={`Statement of Financial Position: Capital & Liabilities vs Property & Assets • ${companyName}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Printer}
                onClick={handlePrint}
                disabled={loading || hasNoData}
                aria-label="Print Balance Sheet"
              >
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={Download}
                onClick={handleExportCSV}
                disabled={loading || hasNoData}
                aria-label="Export to CSV"
              >
                <span className="hidden sm:inline">Export</span> CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={FileSpreadsheet}
                onClick={handleExportTallyXml}
                disabled={loading || exportingXml}
                aria-label="Export Tally XML"
              >
                {exportingXml ? "Exporting..." : "Export Tally XML"}
              </Button>
            </div>
          }
        />
      </header>

      
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{companyName}</h1>
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider mt-0.5">
              Balance Sheet as on {toDate} (Period: {fromDate} to {toDate})
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Tally Prime 9 Formatted Report</p>
            <p className="text-xs font-mono text-slate-700">Currency: INR (₹)</p>
          </div>
        </div>
      </div>

      
      <section
        className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 sm:p-5 space-y-4 print:hidden"
        aria-label="Date Range and Search Filters"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Period:</span>
            <button
              type="button"
              onClick={() => handlePresetChange("month")}
              className={cx(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]",
                datePreset === "month"
                  ? "bg-[#0D9488] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("quarter")}
              className={cx(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]",
                datePreset === "quarter"
                  ? "bg-[#0D9488] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              This Quarter
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange("fy")}
              className={cx(
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]",
                datePreset === "fy"
                  ? "bg-[#0D9488] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Current FY
            </button>
          </div>

          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs focus-within:ring-2 focus-within:ring-[#0D9488] focus-within:border-transparent">
              <label htmlFor="bs-from-date" className="text-slate-500 font-bold flex items-center gap-1 cursor-pointer">
                <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span>From:</span>
              </label>
              <input
                id="bs-from-date"
                type="date"
                value={fromDate}
                onChange={(e) => handleCustomDateChange("from", e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
                aria-label="From Date"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs shadow-xs focus-within:ring-2 focus-within:ring-[#0D9488] focus-within:border-transparent">
              <label htmlFor="bs-to-date" className="text-slate-500 font-bold flex items-center gap-1 cursor-pointer">
                <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                <span>To:</span>
              </label>
              <input
                id="bs-to-date"
                type="date"
                value={toDate}
                onChange={(e) => handleCustomDateChange("to", e.target.value)}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
                aria-label="To Date"
              />
            </div>

            <IconButton
              icon={RefreshCw}
              label="Refresh Balance Sheet"
              variant="secondary"
              size="md"
              onClick={fetchBalanceSheet}
              disabled={loading}
              className={loading ? "animate-spin text-[#0D9488]" : ""}
            />
          </div>
        </div>

        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="relative w-full sm:w-80">
            <label htmlFor="bs-search-input" className="sr-only">
              Search ledgers or groups
            </label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              id="bs-search-input"
              type="text"
              placeholder="Search ledgers or groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus-visible:outline-none"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 font-medium">View:</span>
              <button
                type="button"
                onClick={() => setViewMode("grouped")}
                className={cx(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                  viewMode === "grouped" ? "bg-slate-200 text-slate-800 font-bold" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                Grouped
              </button>
              <button
                type="button"
                onClick={() => setViewMode("detailed")}
                className={cx(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                  viewMode === "detailed" ? "bg-slate-200 text-slate-800 font-bold" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                Flat List
              </button>
            </div>

            {viewMode === "grouped" && (
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <button
                  type="button"
                  onClick={() => toggleAllGroups(false)}
                  className="text-[11px] font-semibold text-[#0D9488] hover:underline cursor-pointer"
                >
                  Expand All
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => toggleAllGroups(true)}
                  className="text-[11px] font-semibold text-slate-500 hover:underline cursor-pointer"
                >
                  Collapse All
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      
      {error && !loading && (
        <Alert variant="error" action={<Button variant="secondary" size="sm" onClick={fetchBalanceSheet}>Retry</Button>}>
          {error}
        </Alert>
      )}

      
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Financial Summary Cards">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex flex-col justify-between gap-3 text-slate-900 transition-all hover:shadow-card-hover">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Total Liabilities & Equity
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    {totalLiabCount} Account Heads Registered
                  </span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0 shadow-xs">
                  <ArrowDownRight className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {fmtMoney2(totalLiabilities)}
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" /> Capital, Loans & Current Liabilities
                </p>
              </div>
            </div>

            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex flex-col justify-between gap-3 text-slate-900 transition-all hover:shadow-card-hover">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Total Property & Assets
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    {totalAssetCount} Account Heads Registered
                  </span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
                  <ArrowUpRight className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-[#0F766E] font-mono tracking-tight">
                  {fmtMoney2(totalAssets)}
                </p>
                <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal-600" /> Fixed Assets, Receivables & Bank
                </p>
              </div>
            </div>

            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex flex-col justify-between gap-3 text-slate-900 transition-all hover:shadow-card-hover">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Reconciliation Status
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    Double-Entry Integrity Audit
                  </span>
                </div>
                <div
                  className={cx(
                    "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs border",
                    isBalanced
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-rose-50 border-rose-200 text-rose-700"
                  )}
                >
                  <Scale className="h-5 w-5" strokeWidth={2} />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900">
                    {isBalanced ? "Balanced" : "Variance"}
                  </span>
                  {isBalanced ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Reconciled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                      <AlertCircle className="h-3.5 w-3.5" /> Unbalanced
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  {isBalanced
                    ? "Liabilities and Assets balance exactly at zero variance."
                    : `Difference: ${fmtMoney2(variance)} (Check suspense or closing entries)`}
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-card">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-card">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      ) : hasNoData ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
          <EmptyState
            icon={Landmark}
            title="No Balance Sheet Accounts Found"
            message={`There are no ledger balances recorded for company ${companyName} in the period ${fromDate} to ${toDate}.`}
            actionLabel="Refresh Data"
            onAction={fetchBalanceSheet}
          />
        </div>
      ) : (
        <section
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          aria-label="T-Format Balance Sheet Dual Columns"
        >
          
          
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 sm:p-6 flex flex-col justify-between gap-5 transition-all">
            <div className="space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" aria-hidden="true" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wider">
                    Capital & Liabilities
                  </h2>
                </div>
                <Badge tone="neutral">
                  {filteredLiabGroups.reduce((acc, g) => acc + g.items.length, 0)} Accounts
                </Badge>
              </div>

              
              {filteredLiabGroups.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No liabilities match &ldquo;{searchQuery}&rdquo;
                </p>
              ) : viewMode === "grouped" ? (
                
                <div className="space-y-4">
                  {filteredLiabGroups.map((grp) => {
                    const isCollapsed = !!collapsedGroups[`L_${grp.group_name}`];
                    return (
                      <div
                        key={grp.group_name}
                        className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50"
                      >
                        
                        <button
                          type="button"
                          onClick={() => toggleGroupCollapse(`L_${grp.group_name}`)}
                          className="w-full px-3.5 py-2.5 bg-slate-100/80 hover:bg-slate-200/80 text-left flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                          aria-expanded={!isCollapsed}
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            )}
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                              {grp.group_name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              ({grp.items.length})
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-900">
                            {fmtMoney2(grp.subtotal)}
                          </span>
                        </button>

                        
                        {!isCollapsed && (
                          <div className="divide-y divide-slate-100 bg-white">
                            {grp.items.map((ledger, idx) => (
                              <div
                                key={idx}
                                className="px-4 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                              >
                                <div className="min-w-0 pr-2">
                                  <span className="font-semibold text-slate-800 block truncate">
                                    {ledger.ledger_name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {grp.group_name} • {ledger.dr_cr || "Cr"}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-slate-900 flex-shrink-0">
                                  {fmtMoney2(Math.abs(parseFloat(ledger.current_balance) || 0))}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                
                <div className="divide-y divide-slate-100">
                  {filteredLiabGroups.flatMap((grp) =>
                    grp.items.map((ledger, idx) => (
                      <div
                        key={`${grp.group_name}-${idx}`}
                        className="py-2 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-lg transition-colors"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 block">{ledger.ledger_name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {grp.group_name} • {ledger.dr_cr || "Cr"}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          {fmtMoney2(Math.abs(parseFloat(ledger.current_balance) || 0))}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            
            <div className="border-t-2 border-slate-200 pt-3">
              <div className="flex items-center justify-between font-mono bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-600 block">
                    Total Liabilities & Equity
                  </span>
                  <span className="text-[10px] text-slate-400 font-sans">
                    Closing Cr/Dr Balance Sum
                  </span>
                </div>
                <span className="text-base sm:text-lg font-black text-slate-900">
                  {fmtMoney2(totalLiabilities)}
                </span>
              </div>
            </div>
          </div>

          
          
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 sm:p-6 flex flex-col justify-between gap-5 transition-all">
            <div className="space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#0D9488]" aria-hidden="true" />
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wider">
                    Property & Assets
                  </h2>
                </div>
                <Badge tone="neutral">
                  {filteredAssetGroups.reduce((acc, g) => acc + g.items.length, 0)} Accounts
                </Badge>
              </div>

              
              {filteredAssetGroups.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">
                  No assets match &ldquo;{searchQuery}&rdquo;
                </p>
              ) : viewMode === "grouped" ? (
                
                <div className="space-y-4">
                  {filteredAssetGroups.map((grp) => {
                    const isCollapsed = !!collapsedGroups[`A_${grp.group_name}`];
                    return (
                      <div
                        key={grp.group_name}
                        className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50"
                      >
                        
                        <button
                          type="button"
                          onClick={() => toggleGroupCollapse(`A_${grp.group_name}`)}
                          className="w-full px-3.5 py-2.5 bg-slate-100/80 hover:bg-slate-200/80 text-left flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
                          aria-expanded={!isCollapsed}
                        >
                          <div className="flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            )}
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                              {grp.group_name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              ({grp.items.length})
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-[#0F766E]">
                            {fmtMoney2(grp.subtotal)}
                          </span>
                        </button>

                        
                        {!isCollapsed && (
                          <div className="divide-y divide-slate-100 bg-white">
                            {grp.items.map((ledger, idx) => (
                              <div
                                key={idx}
                                className="px-4 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors"
                              >
                                <div className="min-w-0 pr-2">
                                  <span className="font-semibold text-slate-800 block truncate">
                                    {ledger.ledger_name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    {grp.group_name} • {ledger.dr_cr || "Dr"}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-slate-900 flex-shrink-0">
                                  {fmtMoney2(Math.abs(parseFloat(ledger.current_balance) || 0))}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                
                <div className="divide-y divide-slate-100">
                  {filteredAssetGroups.flatMap((grp) =>
                    grp.items.map((ledger, idx) => (
                      <div
                        key={`${grp.group_name}-${idx}`}
                        className="py-2 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-lg transition-colors"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 block">{ledger.ledger_name}</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {grp.group_name} • {ledger.dr_cr || "Dr"}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">
                          {fmtMoney2(Math.abs(parseFloat(ledger.current_balance) || 0))}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            
            <div className="border-t-2 border-slate-200 pt-3">
              <div className="flex items-center justify-between font-mono bg-teal-50/70 border border-teal-200/80 p-3.5 rounded-xl">
                <div>
                  <span className="text-xs font-bold uppercase text-[#0F766E] block">
                    Total Property & Assets
                  </span>
                  <span className="text-[10px] text-slate-500 font-sans">
                    Closing Dr/Cr Balance Sum
                  </span>
                </div>
                <span className="text-base sm:text-lg font-black text-[#0F766E]">
                  {fmtMoney2(totalAssets)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      
      <footer className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <Scale className="h-4 w-4 text-[#0D9488] flex-shrink-0" />
          <span>
            Compliant with Indian Accounting Standard (Ind AS) & Tally Prime 9 XML Specifications.
          </span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          Generated: {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      </footer>
    </main>
  );
}

export default BalanceSheetPage;
