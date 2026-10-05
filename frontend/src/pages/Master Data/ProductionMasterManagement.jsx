import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { productionMasters as bomApi, products as productsApi, rawMaterials as materialsApi, branches as branchesApi, companies as companiesApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Layers,
  Plus,
  Search,
  Eye,
  X,
  Check,
  Package,
  Boxes,
  Users,
  Clock,
  DollarSign,
  Trash2,
  Cpu,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

const ProductionMasterManagement = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  const [bomsList, setBomsList] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('all');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBom, setSelectedBom] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    product_id: '',
    version: 1,
    name: '',
    output_quantity: 1,
    output_unit: 'PCS',
    workforce_count: 1,
    production_time_minutes: 45,
    overhead_cost: 0,
    other_expense: 0,
    status: 'ACTIVE',
    materials: [
      { raw_material_id: '', quantity: '', unit: 'KG', wastage_percentage: 0, sequence: 1 }
    ],
    workforce: [
      { role: 'Assembly Worker', workers_required: 2, hours_required: 0.75, cost_per_hour: 100 }
    ]
  });

  useEffect(() => {
    fetchProducts();
    fetchMaterials();
    if (isSuperAdmin) fetchCompanies();
    if (isSuperAdmin || isCompanyAdmin) fetchBranches();
  }, [selectedCompanyId, selectedBranchId]);

  useEffect(() => {
    fetchBoms();
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

  const fetchMaterials = async () => {
    try {
      const res = await materialsApi.getAll({ company_id: selectedCompanyId || undefined });
      setMaterialsList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBoms = async () => {
    setLoading(true);
    try {
      const params = {
        company_id: selectedCompanyId || undefined,
        branch_id: selectedBranchId !== 'all' ? selectedBranchId : undefined,
        product_id: productFilter !== 'all' ? productFilter : undefined
      };
      const res = await bomApi.getAll(params);
      setBomsList(res.data?.data || []);
    } catch (e) {
      toast.error('Failed to load BOM / Production Masters');
    } finally {
      setLoading(false);
    }
  };

  // Material Row Actions
  const handleAddMaterialRow = () => {
    setFormData(prev => ({
      ...prev,
      materials: [
        ...prev.materials,
        {
          raw_material_id: '',
          quantity: '',
          unit: 'KG',
          wastage_percentage: 0,
          sequence: prev.materials.length + 1
        }
      ]
    }));
  };

  const handleRemoveMaterialRow = (idx) => {
    if (formData.materials.length <= 1) {
      toast.error('At least one raw material is required for BOM');
      return;
    }
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter((_, i) => i !== idx)
    }));
  };

  const handleMaterialChange = (idx, field, value) => {
    setFormData(prev => {
      const mats = [...prev.materials];
      mats[idx] = { ...mats[idx], [field]: value };
      if (field === 'raw_material_id') {
        const mat = materialsList.find(m => String(m.material_id) === String(value));
        if (mat) mats[idx].unit = mat.unit_of_measure || 'KG';
      }
      return { ...prev, materials: mats };
    });
  };

  // Workforce Row Actions
  const handleAddWorkforceRow = () => {
    setFormData(prev => ({
      ...prev,
      workforce: [
        ...prev.workforce,
        { role: 'Worker', workers_required: 1, hours_required: 1, cost_per_hour: 100 }
      ]
    }));
  };

  const handleRemoveWorkforceRow = (idx) => {
    setFormData(prev => ({
      ...prev,
      workforce: prev.workforce.filter((_, i) => i !== idx)
    }));
  };

  const handleWorkforceChange = (idx, field, value) => {
    setFormData(prev => {
      const wf = [...prev.workforce];
      wf[idx] = { ...wf[idx], [field]: value };
      return { ...prev, workforce: wf };
    });
  };

  // Dynamic Cost Computations
  const computedCosts = useMemo(() => {
    let materialCost = 0;
    formData.materials.forEach(m => {
      const mat = materialsList.find(item => String(item.material_id) === String(m.raw_material_id));
      const price = mat ? parseFloat(mat.unit_price || 0) : 0;
      const qty = parseFloat(m.quantity) || 0;
      const wastage = 1 + (parseFloat(m.wastage_percentage) || 0) / 100;
      materialCost += qty * price * wastage;
    });

    let laborCost = 0;
    let totalWorkers = 0;
    formData.workforce.forEach(w => {
      const workers = parseFloat(w.workers_required) || 0;
      const hours = parseFloat(w.hours_required) || 0;
      const rate = parseFloat(w.cost_per_hour) || 0;
      laborCost += workers * hours * rate;
      totalWorkers += workers;
    });

    const overhead = parseFloat(formData.overhead_cost) || 0;
    const other = parseFloat(formData.other_expense) || 0;
    const totalUnitCost = materialCost + laborCost + overhead + other;

    return {
      materialCost,
      laborCost,
      overhead,
      other,
      totalUnitCost,
      totalWorkers: totalWorkers || 1
    };
  }, [formData, materialsList]);

  // Submit BOM
  const handleCreateBom = async (e) => {
    e.preventDefault();
    if (!formData.product_id) {
      toast.error('Please select a finished Product');
      return;
    }

    for (let i = 0; i < formData.materials.length; i++) {
      const m = formData.materials[i];
      if (!m.raw_material_id) {
        toast.error(`Please select Raw Material for line #${i + 1}`);
        return;
      }
      if (!m.quantity || parseFloat(m.quantity) <= 0) {
        toast.error(`Please enter valid required quantity for line #${i + 1}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        company_id: selectedCompanyId || user?.company_id || '',
        branch_id: selectedBranchId || user?.branch_id || '',
        product_id: formData.product_id,
        version: formData.version,
        name: formData.name || `BOM - Version ${formData.version}`,
        output_quantity: formData.output_quantity,
        output_unit: formData.output_unit,
        workforce_count: computedCosts.totalWorkers,
        production_time_minutes: formData.production_time_minutes,
        labor_cost: computedCosts.laborCost,
        overhead_cost: formData.overhead_cost,
        other_expense: formData.other_expense,
        status: formData.status,
        materials: formData.materials,
        workforce: formData.workforce
      };

      const res = await bomApi.create(payload);
      if (res.data?.success) {
        toast.success('Production Master / BOM created successfully!');
        setShowCreateModal(false);
        fetchBoms();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create BOM');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewBom = async (bom) => {
    try {
      const res = await bomApi.getById(bom.id);
      setSelectedBom(res.data?.data);
      setShowDetailModal(true);
    } catch (err) {
      toast.error('Failed to load BOM details');
    }
  };

  const filteredBoms = useMemo(() => {
    return bomsList.filter(b => {
      return (
        b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [bomsList, searchTerm]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Production Master / BOM</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Bill of Materials (BOM) • Material Recipes • Workforce Hours • Standard Production Costing
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          Create Production Master
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search BOM by product or recipe name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Finished Products</option>
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
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
            >
              <option value="all">All Branches</option>
              {branchesList.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* BOM Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-gray-400 text-xs">Loading Production Masters...</div>
        ) : filteredBoms.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-xl border border-gray-100 p-8">
            <Cpu className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">No Production Masters / BOMs Found</p>
            <p className="text-xs text-gray-400 mt-1">
              Create a BOM to define how much raw material, workforce, and time is required to produce each product.
            </p>
          </div>
        ) : (
          filteredBoms.map((bom) => (
            <div
              key={bom.id}
              className="bg-white rounded-xl border border-gray-100 hover:border-indigo-200 shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5 space-y-4">
                {/* Title & Version */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-md uppercase tracking-wider mb-1">
                      Version {bom.version}
                    </span>
                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition">
                      {bom.name}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      {bom.product_name} ({bom.product_code})
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    bom.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {bom.status}
                  </span>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50/80 rounded-lg text-center text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Output</span>
                    <span className="font-bold text-gray-800">{parseFloat(bom.output_quantity)} {bom.output_unit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Workforce</span>
                    <span className="font-bold text-gray-800">{parseFloat(bom.workforce_count)} Workers</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Cycle Time</span>
                    <span className="font-bold text-gray-800">{parseFloat(bom.production_time_minutes)} mins</span>
                  </div>
                </div>

                {/* Recipe Summary */}
                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Raw Materials:</span>
                    <span className="font-semibold text-gray-800">{bom.material_items_count} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Est. Material Cost:</span>
                    <span className="font-medium text-gray-700">₹{parseFloat(bom.estimated_material_cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Labor Cost:</span>
                    <span className="font-medium text-gray-700">₹{parseFloat(bom.labor_cost || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 pt-1.5 font-bold text-indigo-700 text-sm">
                    <span>Unit Standard Cost:</span>
                    <span>₹{parseFloat(bom.total_estimated_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-400 text-[11px]">Effective: {new Date(bom.effective_from).toLocaleDateString()}</span>
                <button
                  onClick={() => handleViewBom(bom)}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                  View Full BOM
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE BOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-gray-900">Create Production Master / Bill of Materials (BOM)</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBom} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Product & Master Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Finished Product <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.product_id}
                    onChange={(e) => {
                      const prod = productsList.find(p => String(p.product_id) === String(e.target.value));
                      setFormData({
                        ...formData,
                        product_id: e.target.value,
                        name: prod ? `Production Master - ${prod.product_name}` : '',
                        output_unit: prod?.unit_of_measure || 'PCS'
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select Finished Product...</option>
                    {productsList.map(p => (
                      <option key={p.product_id} value={p.product_id}>
                        {p.product_name} ({p.product_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">BOM Version</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.version}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Recipe / BOM Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Office Chair Standard Production Version 1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Output Batch Size</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0.0001"
                      step="any"
                      required
                      value={formData.output_quantity}
                      onChange={(e) => setFormData({ ...formData, output_quantity: e.target.value })}
                      className="w-2/3 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="text"
                      value={formData.output_unit}
                      onChange={(e) => setFormData({ ...formData, output_unit: e.target.value })}
                      className="w-1/3 px-2 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cycle Time (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.production_time_minutes}
                    onChange={(e) => setFormData({ ...formData, production_time_minutes: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Overhead Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.overhead_cost}
                    onChange={(e) => setFormData({ ...formData, overhead_cost: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Other Expense (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formData.other_expense}
                    onChange={(e) => setFormData({ ...formData, other_expense: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* RAW MATERIALS RECIPE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-indigo-500" />
                    Required Raw Materials per Output Unit
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddMaterialRow}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-medium transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Material
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="py-2 px-3 min-w-[200px]">Raw Material *</th>
                        <th className="py-2 px-3 w-28">Quantity *</th>
                        <th className="py-2 px-3 w-24">Unit</th>
                        <th className="py-2 px-3 w-24">Wastage %</th>
                        <th className="py-2 px-3 text-right">Standard Price</th>
                        <th className="py-2 px-3 text-right">Line Est. Cost</th>
                        <th className="py-2 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.materials.map((m, index) => {
                        const mat = materialsList.find(item => String(item.material_id) === String(m.raw_material_id));
                        const price = mat ? parseFloat(mat.unit_price || 0) : 0;
                        const lineEst = (parseFloat(m.quantity) || 0) * price * (1 + (parseFloat(m.wastage_percentage) || 0) / 100);
                        return (
                          <tr key={index} className="hover:bg-gray-50/50">
                            <td className="p-2">
                              <select
                                required
                                value={m.raw_material_id}
                                onChange={(e) => handleMaterialChange(index, 'raw_material_id', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
                              >
                                <option value="">Select Raw Material...</option>
                                {materialsList.map(item => (
                                  <option key={item.material_id} value={item.material_id}>
                                    {item.material_name} ({item.material_code})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0.0001"
                                step="any"
                                required
                                placeholder="Qty"
                                value={m.quantity}
                                onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={m.unit}
                                onChange={(e) => handleMaterialChange(index, 'unit', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0%"
                                value={m.wastage_percentage}
                                onChange={(e) => handleMaterialChange(index, 'wastage_percentage', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="p-2 text-right font-medium text-gray-500">
                              ₹{price.toFixed(2)}
                            </td>
                            <td className="p-2 text-right font-semibold text-gray-800">
                              ₹{lineEst.toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveMaterialRow(index)}
                                className="text-gray-400 hover:text-red-500 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* WORKFORCE SPECIFICATION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Production Workforce & Labor Breakdown
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddWorkforceRow}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-medium transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Workforce Role
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="py-2 px-3 min-w-[180px]">Role / Skill</th>
                        <th className="py-2 px-3 w-28">Workers Req.</th>
                        <th className="py-2 px-3 w-28">Hours Req.</th>
                        <th className="py-2 px-3 w-28">Cost / Hour (₹)</th>
                        <th className="py-2 px-3 text-right">Labor Cost (₹)</th>
                        <th className="py-2 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {formData.workforce.map((w, index) => {
                        const lineLabor = (parseFloat(w.workers_required) || 0) * (parseFloat(w.hours_required) || 0) * (parseFloat(w.cost_per_hour) || 0);
                        return (
                          <tr key={index} className="hover:bg-gray-50/50">
                            <td className="p-2">
                              <input
                                type="text"
                                placeholder="e.g. Assembler, Supervisor"
                                value={w.role}
                                onChange={(e) => handleWorkforceChange(index, 'role', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={w.workers_required}
                                onChange={(e) => handleWorkforceChange(index, 'workers_required', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={w.hours_required}
                                onChange={(e) => handleWorkforceChange(index, 'hours_required', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={w.cost_per_hour}
                                onChange={(e) => handleWorkforceChange(index, 'cost_per_hour', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="p-2 text-right font-semibold text-gray-800">
                              ₹{lineLabor.toFixed(2)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveWorkforceRow(index)}
                                className="text-gray-400 hover:text-red-500 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Summary Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs">
                <div>
                  <span className="text-gray-500 block text-[11px]">Material Subtotal</span>
                  <span className="font-bold text-gray-800">₹{computedCosts.materialCost.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Labor Subtotal</span>
                  <span className="font-bold text-gray-800">₹{computedCosts.laborCost.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Overhead + Other</span>
                  <span className="font-bold text-gray-800">₹{(computedCosts.overhead + computedCosts.other).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-indigo-600 block text-[11px] font-bold">Total Unit Cost</span>
                  <span className="text-base font-extrabold text-indigo-900">
                    ₹{computedCosts.totalUnitCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {submitting ? 'Saving BOM...' : 'Save Production Master'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW BOM DETAIL MODAL */}
      {showDetailModal && selectedBom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div>
                <span className="text-xs font-bold text-indigo-600">BOM Version {selectedBom.version}</span>
                <h2 className="text-sm font-bold text-gray-900">{selectedBom.name}</h2>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg text-xs">
                <div>
                  <span className="text-gray-400 text-[11px] block">Product</span>
                  <span className="font-bold text-gray-800">{selectedBom.product_name}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Output Size</span>
                  <span className="font-bold text-gray-800">{parseFloat(selectedBom.output_quantity)} {selectedBom.output_unit}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Time</span>
                  <span className="font-bold text-gray-800">{parseFloat(selectedBom.production_time_minutes)} mins</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[11px] block">Workforce</span>
                  <span className="font-bold text-gray-800">{parseFloat(selectedBom.workforce_count)} workers</span>
                </div>
              </div>

              {/* Materials */}
              <div>
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Raw Material Recipe</h3>
                <div className="border border-gray-100 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="py-2 px-3">Material</th>
                        <th className="py-2 px-3 text-right">Qty</th>
                        <th className="py-2 px-3">Unit</th>
                        <th className="py-2 px-3 text-right">Wastage %</th>
                        <th className="py-2 px-3 text-right">Std Price</th>
                        <th className="py-2 px-3 text-right">Line Est.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {selectedBom.materials?.map(m => (
                        <tr key={m.id} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3 font-medium text-gray-900">{m.material_name}</td>
                          <td className="py-2 px-3 text-right">{parseFloat(m.quantity)}</td>
                          <td className="py-2 px-3">{m.unit}</td>
                          <td className="py-2 px-3 text-right">{parseFloat(m.wastage_percentage)}%</td>
                          <td className="py-2 px-3 text-right">₹{parseFloat(m.standard_price || 0).toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-800">
                            ₹{parseFloat(m.estimated_line_cost || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Workforce */}
              {selectedBom.workforce?.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">Workforce Breakdown</h3>
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                        <tr>
                          <th className="py-2 px-3">Role</th>
                          <th className="py-2 px-3 text-right">Workers</th>
                          <th className="py-2 px-3 text-right">Hours</th>
                          <th className="py-2 px-3 text-right">Cost / Hour</th>
                          <th className="py-2 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedBom.workforce?.map(w => (
                          <tr key={w.id} className="hover:bg-gray-50/50">
                            <td className="py-2 px-3 font-medium text-gray-900">{w.role}</td>
                            <td className="py-2 px-3 text-right">{parseFloat(w.workers_required)}</td>
                            <td className="py-2 px-3 text-right">{parseFloat(w.hours_required)} hrs</td>
                            <td className="py-2 px-3 text-right">₹{parseFloat(w.cost_per_hour).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-semibold text-gray-800">
                              ₹{parseFloat(w.line_labor_cost || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end p-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionMasterManagement;
