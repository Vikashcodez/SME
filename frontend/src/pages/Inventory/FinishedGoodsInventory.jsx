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
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

const FinishedGoodsInventory = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  const [inventoryList, setInventoryList] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('all');

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
      const res = await fgApi.getAll(params);
      setInventoryList(res.data?.data || []);
    } catch (e) {
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

  const filteredInventory = useMemo(() => {
    return inventoryList.filter(item => {
      return (
        item.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [inventoryList, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <PackageCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Product Inventory (Finished Goods)</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Live Finished Goods Batches • Passed QC Inventory • Batch Tracking • Sales Valuation
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-[11px] text-gray-400 font-medium block">Total Batches in Store</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-gray-900">{summaryStats?.total_batches_count || 0}</span>
            <Boxes className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-[11px] text-gray-400 font-medium block">Available for Dispatch</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-emerald-600">
              {parseFloat(summaryStats?.total_available_units || 0).toLocaleString()}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-[11px] text-gray-400 font-medium block">Inventory Valuation (Cost)</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-gray-900">
              ₹{parseFloat(summaryStats?.total_inventory_valuation || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-[11px] text-gray-400 font-medium block">Estimated Market Value</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-indigo-700">
              ₹{parseFloat(summaryStats?.total_market_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search finished product or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
          >
            <option value="all">All Products</option>
            {productsList.map(p => (
              <option key={p.product_id} value={p.product_id}>{p.product_name} ({p.product_code})</option>
            ))}
          </select>
        </div>

        {(isSuperAdmin || isCompanyAdmin) && (
          <div>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            >
              <option value="all">All Branches</option>
              {branchesList.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Finished Goods Batches Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
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
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-10 text-gray-400">Loading finished goods inventory...</td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-gray-400">
                    <PackageCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    No Finished Goods found in product inventory. Pass batches from Quality Check to populate store.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">{item.batch_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">{item.product_name}</div>
                      <div className="text-[11px] text-gray-400">{item.product_code} • {item.product_category}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(item.manufacturing_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-700">
                      {parseFloat(item.available_quantity)} {item.product_unit}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      ₹{parseFloat(item.unit_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      ₹{parseFloat(item.selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      ₹{parseFloat(item.total_batch_cost_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-gray-500">{item.warehouse_location || 'Finished Goods Store'}</td>
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
    </div>
  );
};

export default FinishedGoodsInventory;
