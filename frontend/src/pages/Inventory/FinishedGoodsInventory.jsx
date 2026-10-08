import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { productInventory as fgApi, products as productsApi, branches as branchesApi, companies as companiesApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  PackageCheck,
  Search,
  Eye,
  CheckCircle2,
  DollarSign,
  Boxes,
  TrendingUp,
  MapPin,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  X,
  RefreshCw,
  LayoutList,
  Table,
  Building2,
  Tag,
  Sparkles,
  Archive,
  ArrowRight
} from 'lucide-react';

const FinishedGoodsInventory = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  // Grouped products list & summary stats
  const [groupedList, setGroupedList] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('all');

  // View mode: 'grouped' (default - 1 row per product with batch breakdown) or 'flat' (all individual batches)
  const [viewMode, setViewMode] = useState('grouped');

  // Accordion state: set of expanded product IDs
  const [expandedProductIds, setExpandedProductIds] = useState(new Set());

  // Modal state for viewing a specific product's batches
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);

  useEffect(() => {
    fetchProducts();
    if (isSuperAdmin) fetchCompanies();
    if (isSuperAdmin || isCompanyAdmin) fetchBranches();
  }, [selectedCompanyId, selectedBranchId]);

  useEffect(() => {
    fetchInventory();
    fetchSummary();
  }, [selectedCompanyId, selectedBranchId, productFilter]);

  const fetchCompanies = async () => {
    try {
      const res = await companiesApi.getAll();
      setCompaniesList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBranches = async () => {
    try {
      const res = await branchesApi.getAll({ company_id: selectedCompanyId || undefined });
      setBranchesList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await productsApi.getAll({ company_id: selectedCompanyId || undefined });
      setProductsList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const params = {
        company_id: selectedCompanyId || undefined,
        branch_id: selectedBranchId !== 'all' ? selectedBranchId : undefined,
        product_id: productFilter !== 'all' ? productFilter : undefined
      };
      const res = await fgApi.getGrouped(params);
      setGroupedList(res.data?.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load finished goods inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const params = {
        company_id: selectedCompanyId || undefined,
        branch_id: selectedBranchId !== 'all' ? selectedBranchId : undefined
      };
      const res = await fgApi.getSummary(params);
      setSummaryStats(res.data?.data || null);
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle expand for a product
  const toggleProductExpand = (productId) => {
    setExpandedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Expand / Collapse all
  const handleToggleExpandAll = () => {
    if (expandedProductIds.size === filteredGrouped.length) {
      setExpandedProductIds(new Set());
    } else {
      setExpandedProductIds(new Set(filteredGrouped.map(p => p.product_id)));
    }
  };

  // Filtered grouped products
  const filteredGrouped = useMemo(() => {
    return groupedList.filter(prod => {
      const search = searchTerm.toLowerCase();
      const matchProduct = 
        prod.product_name?.toLowerCase().includes(search) ||
        prod.product_code?.toLowerCase().includes(search) ||
        prod.product_category?.toLowerCase().includes(search);
      
      const matchBatch = prod.batches?.some(b => 
        b.batch_number?.toLowerCase().includes(search) ||
        b.warehouse_location?.toLowerCase().includes(search)
      );

      return matchProduct || matchBatch;
    });
  }, [groupedList, searchTerm]);

  // Flat list of all batches from filtered grouped products
  const flatBatchesList = useMemo(() => {
    const list = [];
    filteredGrouped.forEach(prod => {
      (prod.batches || []).forEach(b => {
        list.push({
          ...b,
          product_id: prod.product_id,
          product_name: prod.product_name,
          product_code: prod.product_code,
          product_category: prod.product_category,
          product_unit: prod.product_unit,
          selling_price: prod.selling_price
        });
      });
    });
    return list;
  }, [filteredGrouped]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 bg-slate-50/50 min-h-screen">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Product Stock Inventory (Finished Goods)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidated product stock with live batch breakdown • Quality approved inventory
            </p>
          </div>
        </div>

        {/* Scope Selectors & View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isSuperAdmin && companiesList.length > 0 && (
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
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
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Branches</option>
              {branchesList.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          )}

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition ${
                viewMode === 'grouped'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Consolidated view (each product shown once with total quantity & expandable batches)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>By Product</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition ${
                viewMode === 'flat'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Flat ledger view of all individual batches"
            >
              <Table className="w-3.5 h-3.5" />
              <span>All Batches</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Unique Products</span>
            <Tag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {summaryStats?.total_products_count || groupedList.length}
          </div>
          <span className="text-[10px] text-slate-400">Products in stock</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Batches</span>
            <Boxes className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {summaryStats?.total_batches_count || 0}
          </div>
          <span className="text-[10px] text-slate-400">Total lots in store</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs bg-gradient-to-br from-emerald-50/40 to-white">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Available Stock</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700">
            {parseFloat(summaryStats?.total_available_units || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-800">Units ready to dispatch</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stock Valuation</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900">
            ₹{parseFloat(summaryStats?.total_inventory_valuation || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-slate-400">Total at cost price</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-2xs bg-gradient-to-br from-indigo-50/40 to-white col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-indigo-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Market Value</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-indigo-700">
            ₹{parseFloat(summaryStats?.total_market_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-indigo-800">Estimated sales revenue</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name, SKU code, or batch number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          <button
            onClick={() => { fetchInventory(); fetchSummary(); }}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 border border-slate-200 rounded-xl"
            title="Refresh Inventory"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="all">All Products</option>
            {productsList.map(p => (
              <option key={p.product_id} value={p.product_id}>{p.product_name} ({p.product_code})</option>
            ))}
          </select>

          {viewMode === 'grouped' && filteredGrouped.length > 0 && (
            <button
              onClick={handleToggleExpandAll}
              className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl whitespace-nowrap transition"
            >
              {expandedProductIds.size === filteredGrouped.length ? 'Collapse All' : 'Expand All Batches'}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. VIEW MODE: GROUPED BY PRODUCT (EACH PRODUCT SHOWN ONCE WITH BATCHES) */}
      {/* ========================================================================= */}
      {viewMode === 'grouped' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 w-10"></th>
                  <th className="py-3.5 px-4">Finished Product</th>
                  <th className="py-3.5 px-4 text-center">Batches In Stock</th>
                  <th className="py-3.5 px-4 text-right">Available Qty</th>
                  <th className="py-3.5 px-4 text-right">Total Produced</th>
                  <th className="py-3.5 px-4 text-right">Avg Unit Cost</th>
                  <th className="py-3.5 px-4 text-right">Selling Price</th>
                  <th className="py-3.5 px-4 text-right">Total Inventory Value</th>
                  <th className="py-3.5 px-4 text-center">Stock Status</th>
                  <th className="py-3.5 px-4 text-center">Batch Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-12 text-slate-400">
                      <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-emerald-500" />
                      Loading product stock inventory...
                    </td>
                  </tr>
                ) : filteredGrouped.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-16 text-slate-400">
                      <PackageCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-slate-600">No Finished Goods in stock!</p>
                      <p className="text-xs text-slate-400 mt-0.5">Approved batches from Quality Check will automatically appear here.</p>
                    </td>
                  </tr>
                ) : (
                  filteredGrouped.map((prod) => {
                    const isExpanded = expandedProductIds.has(prod.product_id);
                    const totalAvail = parseFloat(prod.total_available_quantity || 0);
                    const totalQty = parseFloat(prod.total_quantity || 0);
                    const batches = prod.batches || [];

                    return (
                      <React.Fragment key={prod.product_id}>
                        {/* Parent Product Row */}
                        <tr
                          onClick={() => toggleProductExpand(prod.product_id)}
                          className={`hover:bg-slate-50/80 cursor-pointer transition select-none ${
                            isExpanded ? 'bg-emerald-50/30' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-4">
                            <strong className="text-slate-900 block font-bold text-sm">
                              {prod.product_name}
                            </strong>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <span className="font-mono text-blue-600 font-semibold">{prod.product_code}</span>
                              <span>•</span>
                              <span>{prod.product_category || 'General'}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Boxes className="w-3 h-3" />
                              <span>{prod.batches_count} {parseInt(prod.batches_count, 10) === 1 ? 'Batch' : 'Batches'}</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span className="font-extrabold text-emerald-700 text-sm">
                              {totalAvail.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-slate-500 font-semibold ml-1">
                              {prod.product_unit || 'Units'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                            {totalQty.toLocaleString()} {prod.product_unit || 'Units'}
                          </td>

                          <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                            ₹{parseFloat(prod.average_unit_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            ₹{parseFloat(prod.selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            ₹{parseFloat(prod.total_inventory_cost_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              totalAvail > 10
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : totalAvail > 0
                                ? 'bg-amber-50 text-amber-700 border-amber-300'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {totalAvail > 10 ? 'In Stock' : totalAvail > 0 ? 'Low Stock' : 'Out of Stock'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedProductForModal(prod)}
                              className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs border border-emerald-200 transition flex items-center gap-1 mx-auto"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Batches</span>
                            </button>
                          </td>
                        </tr>

                        {/* Inline Expandable Batches Sub-Table (Accordion) */}
                        {isExpanded && (
                          <tr className="bg-slate-50/90">
                            <td colSpan="10" className="p-4 sm:p-5">
                              <div className="bg-white rounded-xl border border-emerald-200/80 shadow-xs overflow-hidden">
                                <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Boxes className="w-4 h-4 text-emerald-600" />
                                    <span className="font-bold text-emerald-900 text-xs">
                                      Batch Breakdown for: {prod.product_name} ({batches.length} {batches.length === 1 ? 'Batch' : 'Batches'})
                                    </span>
                                  </div>
                                  <span className="text-[11px] text-emerald-700 font-semibold">
                                    Total Available: {totalAvail.toLocaleString()} {prod.product_unit}
                                  </span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/60 text-slate-500 font-semibold border-b border-slate-100">
                                      <tr>
                                        <th className="py-2.5 px-3">Batch Number</th>
                                        <th className="py-2.5 px-3">Manufacturing Date</th>
                                        <th className="py-2.5 px-3 text-right">Available Qty</th>
                                        <th className="py-2.5 px-3 text-right">Produced Qty</th>
                                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                                        <th className="py-2.5 px-3 text-right">Batch Value</th>
                                        <th className="py-2.5 px-3">Warehouse Location</th>
                                        <th className="py-2.5 px-3 text-center">Batch Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                      {batches.map((batch) => (
                                        <tr key={batch.id} className="hover:bg-slate-50/60 transition">
                                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                                            {batch.batch_number}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-500">
                                            {batch.manufacturing_date ? new Date(batch.manufacturing_date).toLocaleDateString() : 'N/A'}
                                          </td>
                                          <td className="py-2.5 px-3 text-right">
                                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                              {parseFloat(batch.available_quantity).toLocaleString()} {prod.product_unit}
                                            </span>
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                                            {parseFloat(batch.quantity).toLocaleString()} {prod.product_unit}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                                            ₹{parseFloat(batch.unit_cost || 0).toFixed(2)}
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                            ₹{parseFloat(batch.total_batch_cost_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-500">
                                            <div className="flex items-center gap-1">
                                              <MapPin className="w-3 h-3 text-slate-400" />
                                              <span>{batch.warehouse_location || 'Finished Goods Warehouse'}</span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              batch.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                            }`}>
                                              {batch.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. VIEW MODE: ALL BATCHES FLAT VIEW (OPTIONAL DETAILED LEDGER) */}
      {/* ========================================================================= */}
      {viewMode === 'flat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Finished Product</th>
                  <th className="py-3 px-4">Mfg. Date</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Unit Cost (₹)</th>
                  <th className="py-3 px-4 text-right">Selling Price (₹)</th>
                  <th className="py-3 px-4 text-right">Batch Cost Value</th>
                  <th className="py-3 px-4">Warehouse Location</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {flatBatchesList.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-slate-400">
                      No batches found matching filter.
                    </td>
                  </tr>
                ) : (
                  flatBatchesList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{item.batch_number}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{item.product_name}</div>
                        <div className="text-[11px] text-slate-400">{item.product_code} • {item.product_category}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.manufacturing_date ? new Date(item.manufacturing_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                        {parseFloat(item.available_quantity).toLocaleString()} {item.product_unit}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        ₹{parseFloat(item.unit_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        ₹{parseFloat(item.selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹{parseFloat(item.total_batch_cost_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{item.warehouse_location || 'Finished Goods Warehouse'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DEDICATED BATCH DETAILS MODAL FOR A PRODUCT */}
      {/* ========================================================================= */}
      {selectedProductForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Boxes className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="text-sm font-bold">Batches Breakdown & Tracking</h3>
                  <p className="text-xs text-emerald-100">{selectedProductForModal.product_name} ({selectedProductForModal.product_code})</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProductForModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              {/* Product Summary Header Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                <div>
                  <span className="text-slate-500 text-[11px] block">Total Available Stock</span>
                  <strong className="text-base font-extrabold text-emerald-700">
                    {parseFloat(selectedProductForModal.total_available_quantity || 0).toLocaleString()} {selectedProductForModal.product_unit}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px] block">Total Batches</span>
                  <strong className="text-base font-extrabold text-slate-900">
                    {selectedProductForModal.batches_count} Lots
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px] block">Selling Price</span>
                  <strong className="text-base font-extrabold text-slate-900">
                    ₹{parseFloat(selectedProductForModal.selling_price || 0).toFixed(2)}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-500 text-[11px] block">Total Cost Value</span>
                  <strong className="text-base font-extrabold text-blue-700">
                    ₹{parseFloat(selectedProductForModal.total_inventory_cost_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              {/* Batches Table in Modal */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                  <Archive className="w-3.5 h-3.5 text-emerald-600" />
                  <span>List of All Batches for this Product ({selectedProductForModal.batches?.length || 0})</span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Batch Number</th>
                        <th className="py-2.5 px-3">Mfg. Date</th>
                        <th className="py-2.5 px-3 text-right">Available Qty</th>
                        <th className="py-2.5 px-3 text-right">Produced Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 text-right">Batch Value</th>
                        <th className="py-2.5 px-3">Warehouse Location</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(selectedProductForModal.batches || []).map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                            {b.batch_number}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {b.manufacturing_date ? new Date(b.manufacturing_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {parseFloat(b.available_quantity).toLocaleString()} {selectedProductForModal.product_unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                            {parseFloat(b.quantity).toLocaleString()} {selectedProductForModal.product_unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                            ₹{parseFloat(b.unit_cost || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹{parseFloat(b.total_batch_cost_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{b.warehouse_location || 'Finished Goods Warehouse'}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              b.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedProductForModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinishedGoodsInventory;
