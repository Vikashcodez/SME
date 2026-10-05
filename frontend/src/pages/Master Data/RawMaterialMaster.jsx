import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  rawMaterials as rawMaterialsApi, 
  vendors as vendorsApi,
  branches as branchesApi, 
  companies as companiesApi 
} from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Boxes, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  Eye, 
  X, 
  Check, 
  Building2, 
  Building, 
  Calendar, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Filter, 
  Layers, 
  ChevronRight,
  Sparkles,
  Info,
  DollarSign,
  Download,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Tag,
  Truck,
  ShieldCheck,
  Clock,
  Archive
} from 'lucide-react';

const COMMON_CATEGORIES = [
  'Metals & Alloys',
  'Polymers & Plastics',
  'Chemicals & Solvents',
  'Packaging Materials',
  'Hardware & Fasteners',
  'Electrical & Electronic Components',
  'Fabrics & Textiles',
  'Paints & Coatings',
  'Rubber & Elastomers',
  'General Supplies'
];

const COMMON_UOMS = [
  'Kilogram (Kg)',
  'Gram (g)',
  'Metric Ton (MT)',
  'Liter (L)',
  'Milliliter (ml)',
  'Meter (m)',
  'Centimeter (cm)',
  'Square Meter (sq m)',
  'Pieces (Pcs)',
  'Numbers (Nos)',
  'Boxes (Box)',
  'Rolls (Roll)',
  'Sheets (Sheet)'
];

const PRESET_MATERIALS = [
  { name: 'Cold Rolled Steel Sheet (1.2mm)', cat: 'Metals & Alloys', uom: 'Sheets (Sheet)', hsn: '7209', price: '1450.00', min: '50' },
  { name: 'HDPE Granules Grade B52', cat: 'Polymers & Plastics', uom: 'Kilogram (Kg)', hsn: '3901', price: '115.00', min: '500' },
  { name: 'Industrial Epoxy Primer Grey', cat: 'Paints & Coatings', uom: 'Liter (L)', hsn: '3208', price: '480.00', min: '60' },
  { name: 'Corrugated 5-Ply Shipping Boxes (12x12x12)', cat: 'Packaging Materials', uom: 'Pieces (Pcs)', hsn: '4819', price: '32.50', min: '200' },
  { name: 'M8 Stainless Steel Hex Bolts (SS304)', cat: 'Hardware & Fasteners', uom: 'Numbers (Nos)', hsn: '7318', price: '12.00', min: '1000' }
];

const RawMaterialMaster = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  // Selected scope state
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  // Data lists
  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [categoriesList, setCategoriesList] = useState(COMMON_CATEGORIES);

  // Loading states
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters & View
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState(null);

  // Forms
  const initialForm = {
    company_id: user?.company_id || '',
    branch_id: user?.branch_id || '',
    material_code: '',
    material_name: '',
    category: 'Metals & Alloys',
    unit_of_measure: 'Kilogram (Kg)',
    hsn_code: '',
    gst_rate: '18',
    unit_price: '',
    minimum_stock_level: '10',
    reorder_quantity: '50',
    lead_time_days: '7',
    description: '',
    initial_stock: '0',
    warehouse_location: 'Rack A1',
    status: 'Active',
    is_active: true
  };

  const [formData, setFormData] = useState(initialForm);
  const [editFormData, setEditFormData] = useState(initialForm);

  useEffect(() => {
    if (isSuperAdmin) fetchCompanies();
  }, [isSuperAdmin]);

  useEffect(() => {
    const effectiveCompanyId = selectedCompanyId || user?.company_id;
    if (effectiveCompanyId) {
      fetchBranchesForCompany(effectiveCompanyId);
      fetchVendorsList(effectiveCompanyId);
    }
  }, [selectedCompanyId, user?.company_id]);

  useEffect(() => {
    fetchMaterials();
  }, [selectedCompanyId, selectedBranchId]);

  // Sync Branch Admin
  useEffect(() => {
    if (user?.branch_id) setSelectedBranchId(user.branch_id);
    if (user?.company_id) setSelectedCompanyId(user.company_id);
  }, [user]);

  const fetchCompanies = async () => {
    try {
      const res = await companiesApi.getAll();
      const list = res.data.data || res.data || [];
      setCompaniesList(list);
      if (list.length > 0 && !selectedCompanyId) setSelectedCompanyId(list[0].company_id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBranchesForCompany = async (compVal) => {
    try {
      const res = await branchesApi.getByCompany(compVal);
      setBranchesList(res.data.data || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVendorsList = async (compVal) => {
    try {
      const res = await vendorsApi.getAll({ company_id: compVal });
      setVendorsList(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      const res = await rawMaterialsApi.getAll(params);
      setMaterialsList(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load raw materials');
    } finally {
      setLoadingMaterials(false);
    }
  };

  // Handle Create Material
  const handleCreateMaterial = async (andAddNew = false) => {
    if (!formData.material_name.trim()) {
      toast.error('Material Name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        company_id: selectedCompanyId || user?.company_id,
        branch_id: formData.branch_id || selectedBranchId || null
      };

      const res = await rawMaterialsApi.create(payload);
      toast.success(res.data.message || 'Raw Material created successfully');
      fetchMaterials();

      if (andAddNew) {
        setFormData({
          ...initialForm,
          company_id: selectedCompanyId || user?.company_id,
          branch_id: selectedBranchId || ''
        });
      } else {
        setShowCreateModal(false);
        setFormData(initialForm);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to create material');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Open
  const handleOpenEdit = (material) => {
    setActiveMaterial(material);
    setEditFormData({
      company_id: material.company_id || '',
      branch_id: material.branch_id || '',
      material_code: material.material_code || '',
      material_name: material.material_name || '',
      category: material.category || 'General Supplies',
      unit_of_measure: material.unit_of_measure || 'Kilogram (Kg)',
      hsn_code: material.hsn_code || '',
      gst_rate: material.gst_rate || '18',
      unit_price: material.unit_price || '0.00',
      minimum_stock_level: material.minimum_stock_level || '0.00',
      reorder_quantity: material.reorder_quantity || '0.00',
      lead_time_days: material.lead_time_days || '0',
      description: material.description || '',
      status: material.status || 'Active',
      is_active: material.is_active !== undefined ? material.is_active : true
    });
    setShowEditModal(true);
  };

  // Handle Update Material
  const handleUpdateMaterial = async () => {
    if (!editFormData.material_name.trim()) {
      toast.error('Material Name is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await rawMaterialsApi.update(activeMaterial.material_id, editFormData);
      toast.success(res.data.message || 'Raw Material updated successfully');
      setShowEditModal(false);
      setActiveMaterial(null);
      fetchMaterials();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to update material');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async (material) => {
    try {
      if (material.is_active && material.status === 'Active') {
        await rawMaterialsApi.delete(material.material_id);
        toast.success(`Material ${material.material_name} deactivated`);
      } else {
        await rawMaterialsApi.restore(material.material_id);
        toast.success(`Material ${material.material_name} activated`);
      }
      fetchMaterials();
    } catch (e) {
      toast.error('Failed to change status');
    }
  };

  // Apply Preset
  const handleApplyPreset = (preset) => {
    setFormData(prev => ({
      ...prev,
      material_name: preset.name,
      category: preset.cat,
      unit_of_measure: preset.uom,
      hsn_code: preset.hsn,
      unit_price: preset.price,
      minimum_stock_level: preset.min
    }));
  };

  // Export CSV
  const handleExportCSV = () => {
    if (materialsList.length === 0) {
      toast.error('No materials to export');
      return;
    }

    const headers = ['Code', 'Name', 'Category', 'UOM', 'HSN', 'Standard Price', 'Min Stock', 'Reorder Qty', 'Lead Time (Days)', 'Vendor', 'Status'];
    const rows = materialsList.map(m => [
      `"${m.material_code}"`,
      `"${m.material_name}"`,
      `"${m.category}"`,
      `"${m.unit_of_measure}"`,
      `"${m.hsn_code || ''}"`,
      m.unit_price,
      m.minimum_stock_level,
      m.reorder_quantity,
      m.lead_time_days,
      `"${m.preferred_vendor_name || 'N/A'}"`,
      `"${m.status}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Raw_Materials_Master_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Raw material catalog exported');
  };

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materialsList.filter(m => {
      const matchSearch = !searchTerm ||
        m.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.material_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.hsn_code?.includes(searchTerm);

      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;

      return matchSearch && matchCat && matchStatus;
    });
  }, [materialsList, searchTerm, selectedCategory, statusFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Master Data</span>
            <ChevronRight size={12} />
            <span className="text-blue-600">Raw Material Master</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="text-blue-600" size={28} />
            RAW MATERIAL MASTER
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Maintain authoritative catalog of raw materials, UOM specifications, HSN tax codes, and reorder levels.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchMaterials}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <RefreshCw size={14} className={loadingMaterials ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setFormData({
                ...initialForm,
                company_id: selectedCompanyId || user?.company_id,
                branch_id: selectedBranchId || ''
              });
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus size={15} />
            <span>Add Raw Material</span>
          </button>
        </div>
      </div>

      {/* Scope Selectors Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-4">
        {isSuperAdmin && (
          <div className="flex items-center gap-2 min-w-[220px]">
            <Building className="text-slate-400" size={16} />
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Company:</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              {companiesList.map(c => (
                <option key={c.company_id} value={c.company_id}>{c.company_name}</option>
              ))}
            </select>
          </div>
        )}

        {(isSuperAdmin || isCompanyAdmin) && (
          <div className="flex items-center gap-2 min-w-[220px]">
            <Building2 className="text-slate-400" size={16} />
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Branch Scope:</label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              <option value="all">All Branches (Global)</option>
              {branchesList.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="text-xs text-slate-500 font-medium ml-auto flex items-center gap-1.5">
          <Tag size={14} className="text-blue-600" />
          <span>Total Catalog Items: <strong className="text-slate-900">{materialsList.length}</strong></span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by material name, SKU code, category, HSN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categoriesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive</option>
            </select>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-semibold ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                <TableIcon size={14} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs font-semibold ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Materials List */}
      {loadingMaterials ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <RefreshCw className="animate-spin text-blue-600 mx-auto mb-3" size={28} />
          <p className="text-sm font-semibold text-slate-700">Loading raw materials...</p>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <Boxes className="text-slate-300 mx-auto mb-3" size={40} />
          <h3 className="text-base font-bold text-slate-800">No Raw Materials Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            No material master items match your current filter.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Add First Material</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Code / Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">UOM</th>
                  <th className="py-3 px-4">HSN / GST</th>
                  <th className="py-3 px-4 text-right">Standard Price</th>
                  <th className="py-3 px-4 text-right">Reorder Point</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map((mat) => (
                  <tr key={mat.material_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{mat.material_name}</div>
                      <span className="font-mono text-[10.5px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                        {mat.material_code}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">
                        {mat.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {mat.unit_of_measure}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] text-slate-800">{mat.hsn_code || '—'}</div>
                      <div className="text-[10px] text-slate-400">GST: {mat.gst_rate || 0}%</div>
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹ {parseFloat(mat.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-amber-600">{mat.minimum_stock_level} {mat.unit_of_measure?.split(' ')[0]}</div>
                      <div className="text-[10px] text-slate-400">Lead: {mat.lead_time_days || 0}d</div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        mat.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {mat.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setActiveMaterial(mat); setShowDetailsModal(true); }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(mat)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-all"
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(mat)}
                          className={`p-1.5 rounded-md transition-all ${
                            mat.is_active && mat.status === 'Active'
                              ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={mat.is_active && mat.status === 'Active' ? 'Deactivate' : 'Activate'}
                        >
                          {mat.is_active && mat.status === 'Active' ? <XCircle size={15} /> : <RotateCcw size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50/70 border-t border-slate-200 text-xs text-slate-500">
            Showing {filteredMaterials.length} of {materialsList.length} raw material items
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((mat) => (
            <div key={mat.material_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{mat.material_name}</h4>
                    <span className="font-mono text-[10.5px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 inline-block mt-0.5">
                      {mat.material_code}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border shrink-0 ${
                    mat.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {mat.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 mb-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Category:</span>
                    <span className="font-medium text-slate-800">{mat.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">UOM:</span>
                    <span className="font-semibold text-slate-800">{mat.unit_of_measure}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Standard Cost:</span>
                    <span className="font-bold text-slate-900">₹ {parseFloat(mat.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Reorder Level:</span>
                    <span className="font-bold text-amber-600">{mat.minimum_stock_level}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <button
                  onClick={() => { setActiveMaterial(mat); setShowDetailsModal(true); }}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <Eye size={13} />
                  <span>Details</span>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(mat)}
                    className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(mat)}
                    className={`p-1.5 rounded-lg ${
                      mat.is_active && mat.status === 'Active'
                        ? 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                        : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {mat.is_active && mat.status === 'Active' ? <XCircle size={14} /> : <RotateCcw size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE MODAL */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-8 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Boxes size={22} className="text-blue-200" />
                <div>
                  <h3 className="text-base font-bold">Add New Raw Material</h3>
                  <p className="text-xs text-blue-100">Define raw material item specifications, categories, and reorder levels</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Presets Bar */}
            <div className="bg-blue-50/70 p-3 px-6 border-b border-blue-100 flex items-center gap-2 overflow-x-auto text-xs">
              <Sparkles size={14} className="text-blue-600 shrink-0" />
              <span className="font-bold text-blue-900 shrink-0">Quick Presets:</span>
              {PRESET_MATERIALS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyPreset(p)}
                  className="bg-white hover:bg-blue-100 text-blue-800 border border-blue-200 px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition-all shadow-xs"
                >
                  {p.name.split(' ')[0]} {p.name.split(' ')[1]}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Material Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cold Rolled Steel Sheet 1.2mm"
                    value={formData.material_name}
                    onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Material / SKU Code <span className="text-slate-400 font-normal">(Auto if blank)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. RM-STL-001"
                    value={formData.material_code}
                    onChange={(e) => setFormData({ ...formData, material_code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    {COMMON_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unit of Measure (UOM) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    {COMMON_UOMS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    HSN / Tariff Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7209"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    GST Rate (%)
                  </label>
                  <select
                    value={formData.gst_rate}
                    onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Standard Cost / Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Min Stock (Reorder Point)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="10.00"
                    value={formData.minimum_stock_level}
                    onChange={(e) => setFormData({ ...formData, minimum_stock_level: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reorder Quantity (Batch Size)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="50.00"
                    value={formData.reorder_quantity}
                    onChange={(e) => setFormData({ ...formData, reorder_quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lead Time (Days)
                  </label>
                  <input
                    type="number"
                    placeholder="7"
                    value={formData.lead_time_days}
                    onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Description & Technical Specifications
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Material composition, grade, standard specs..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateMaterial(true)}
                disabled={submitting}
                className="px-4 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs"
              >
                Save & Add New
              </button>
              <button
                onClick={() => handleCreateMaterial(false)}
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
              >
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                <span>Save Material</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT MODAL */}
      {/* ========================================================================= */}
      {showEditModal && activeMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-8 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit3 size={20} className="text-amber-200" />
                <div>
                  <h3 className="text-base font-bold">Edit Raw Material</h3>
                  <p className="text-xs text-amber-100">{activeMaterial.material_name}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Material Name *</label>
                  <input
                    type="text"
                    value={editFormData.material_name}
                    onChange={(e) => setEditFormData({ ...editFormData, material_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Material Code</label>
                  <input
                    type="text"
                    value={editFormData.material_code}
                    onChange={(e) => setEditFormData({ ...editFormData, material_code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono uppercase focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {COMMON_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UOM</label>
                  <select
                    value={editFormData.unit_of_measure}
                    onChange={(e) => setEditFormData({ ...editFormData, unit_of_measure: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {COMMON_UOMS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={editFormData.hsn_code}
                    onChange={(e) => setEditFormData({ ...editFormData, hsn_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Standard Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.unit_price}
                    onChange={(e) => setEditFormData({ ...editFormData, unit_price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.minimum_stock_level}
                    onChange={(e) => setEditFormData({ ...editFormData, minimum_stock_level: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reorder Qty</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.reorder_quantity}
                    onChange={(e) => setEditFormData({ ...editFormData, reorder_quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    value={editFormData.lead_time_days}
                    onChange={(e) => setEditFormData({ ...editFormData, lead_time_days: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg">Cancel</button>
              <button onClick={handleUpdateMaterial} disabled={submitting} className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5">
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                <span>Update Material</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILS MODAL */}
      {/* ========================================================================= */}
      {showDetailsModal && activeMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Boxes size={22} className="text-blue-400" />
                <div>
                  <h3 className="text-base font-bold">{activeMaterial.material_name}</h3>
                  <p className="text-xs text-slate-400 font-mono">#{activeMaterial.material_code}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[11px] block">Category</span>
                  <strong className="text-slate-800">{activeMaterial.category}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Unit (UOM)</span>
                  <strong className="text-slate-800">{activeMaterial.unit_of_measure}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Standard Cost</span>
                  <strong className="text-slate-900 font-bold">₹ {parseFloat(activeMaterial.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Reorder Point</span>
                  <strong className="text-amber-600 font-bold">{activeMaterial.minimum_stock_level}</strong>
                </div>
              </div>

              {activeMaterial.preferred_vendor_name && (
                <div className="border border-slate-200 rounded-xl p-4 bg-blue-50/40">
                  <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Truck size={14} className="text-blue-600" />
                    Preferred Supplier / Vendor
                  </h4>
                  <p className="font-bold text-slate-900 text-sm">{activeMaterial.preferred_vendor_name}</p>
                  <span className="text-slate-500 font-mono text-[11px]">{activeMaterial.preferred_vendor_code}</span>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="font-bold text-slate-800 mb-2 uppercase tracking-wider text-[11px]">Reorder & Logistics</h4>
                <div className="grid grid-cols-3 gap-2 text-slate-700 bg-slate-50 p-3 rounded-lg">
                  <div><strong>HSN Code:</strong> {activeMaterial.hsn_code || 'N/A'}</div>
                  <div><strong>GST Tax Rate:</strong> {activeMaterial.gst_rate || 0}%</div>
                  <div><strong>Lead Time:</strong> {activeMaterial.lead_time_days || 0} Days</div>
                </div>
              </div>

              {activeMaterial.description && (
                <div className="border border-slate-200 rounded-xl p-4">
                  <h4 className="font-bold text-slate-800 mb-1 uppercase tracking-wider text-[11px]">Technical Notes / Description</h4>
                  <p className="text-slate-600 leading-relaxed">{activeMaterial.description}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => { setShowDetailsModal(false); handleOpenEdit(activeMaterial); }}
                className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-bold text-xs rounded-lg flex items-center gap-1.5"
              >
                <Edit3 size={13} />
                <span>Edit Material</span>
              </button>
              <button onClick={() => setShowDetailsModal(false)} className="px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RawMaterialMaster;
