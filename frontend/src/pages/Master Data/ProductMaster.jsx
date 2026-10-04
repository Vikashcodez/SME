import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  products as productsApi, 
  rawMaterials as rawMaterialsApi, 
  branches as branchesApi, 
  companies as companiesApi 
} from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Package, 
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
  DollarSign, 
  FileSpreadsheet, 
  Layers, 
  ChevronRight,
  RefreshCw,
  Image as ImageIcon,
  UploadCloud,
  FileText,
  Boxes,
  Sparkles,
  Calculator,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  Factory,
  ArrowRight,
  HelpCircle,
  TrendingUp,
  Info
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const PRODUCT_CATEGORIES = [
  'Finished Goods',
  'Assembly & Sub-Assembly',
  'Fabricated Metal Parts',
  'Electronic Appliances',
  'Industrial Tools & Dies',
  'Consumer Packaged Goods',
  'Precision Components',
  'Custom OEM Products'
];

const STANDARD_UOM = ['PCS', 'NOS', 'SET', 'BOX', 'UNIT', 'KG', 'MTR', 'PKT'];

const ProductMaster = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();
  const navigate = useNavigate();

  // Selected Scope
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  // Scope lists
  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);

  // Data
  const [productsList, setProductsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Views
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);

  // Photo uploads state for 3 images
  const [photoFiles, setPhotoFiles] = useState({ photo_1: null, photo_2: null, photo_3: null });
  const [photoPreviews, setPhotoPreviews] = useState({ photo_1: '', photo_2: '', photo_3: '' });

  // Initial Form State
  const initialProductForm = {
    product_code: '',
    product_name: '',
    category: 'Finished Goods',
    unit_of_measure: 'PCS',
    selling_price: '',
    cost_price: '',
    hsn_code: '',
    gst_rate: '18',
    product_specification: '',
    min_stock_level: '0',
    status: 'Active',
    raw_materials: [] // Array of { material_id, quantity_required, notes }
  };

  const [formData, setFormData] = useState(initialProductForm);
  const [editFormData, setEditFormData] = useState(initialProductForm);

  // Sync with Auth Context
  useEffect(() => {
    if (user?.branch_id) setSelectedBranchId(user.branch_id);
    if (user?.company_id) setSelectedCompanyId(user.company_id);
  }, [user]);

  useEffect(() => {
    if (isSuperAdmin) fetchCompanies();
  }, [isSuperAdmin]);

  useEffect(() => {
    const effectiveCompanyId = selectedCompanyId || user?.company_id;
    if (effectiveCompanyId) {
      fetchBranchesForCompany(effectiveCompanyId);
      fetchRawMaterials(effectiveCompanyId);
    }
  }, [selectedCompanyId, user?.company_id]);

  useEffect(() => {
    fetchProducts();
  }, [selectedCompanyId, selectedBranchId]);

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

  const fetchRawMaterials = async (compVal) => {
    try {
      const res = await rawMaterialsApi.getAll({ company_id: compVal });
      setMaterialsList(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      const res = await productsApi.getAll(params);
      setProductsList(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Image upload handling
  const handlePhotoSelect = (slotKey, e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Photo size exceeds 10MB limit.');
        return;
      }
      setPhotoFiles(prev => ({ ...prev, [slotKey]: file }));
      setPhotoPreviews(prev => ({ ...prev, [slotKey]: URL.createObjectURL(file) }));
    }
  };

  const handleRemovePhoto = (slotKey, isEdit = false) => {
    setPhotoFiles(prev => ({ ...prev, [slotKey]: null }));
    setPhotoPreviews(prev => ({ ...prev, [slotKey]: '' }));
    if (isEdit) {
      setEditFormData(prev => ({ ...prev, [slotKey]: null }));
    }
  };

  // BOM Row Operations
  const handleAddBomRow = (isEdit = false) => {
    if (materialsList.length === 0) {
      toast.error('No raw materials found. Please register raw materials first.');
      return;
    }
    const newRow = {
      material_id: materialsList[0].material_id,
      quantity_required: '1',
      notes: ''
    };

    if (isEdit) {
      setEditFormData(prev => ({
        ...prev,
        raw_materials: [...(prev.raw_materials || []), newRow]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        raw_materials: [...prev.raw_materials, newRow]
      }));
    }
  };

  const handleUpdateBomRow = (index, field, value, isEdit = false) => {
    if (isEdit) {
      const updated = [...(editFormData.raw_materials || [])];
      updated[index][field] = value;
      setEditFormData(prev => ({ ...prev, raw_materials: updated }));
    } else {
      const updated = [...formData.raw_materials];
      updated[index][field] = value;
      setFormData(prev => ({ ...prev, raw_materials: updated }));
    }
  };

  const handleRemoveBomRow = (index, isEdit = false) => {
    if (isEdit) {
      const updated = [...(editFormData.raw_materials || [])];
      updated.splice(index, 1);
      setEditFormData(prev => ({ ...prev, raw_materials: updated }));
    } else {
      const updated = [...formData.raw_materials];
      updated.splice(index, 1);
      setFormData(prev => ({ ...prev, raw_materials: updated }));
    }
  };

  // Calculate estimated total BOM material cost
  const calculateBomTotal = (bomArray) => {
    if (!bomArray || bomArray.length === 0) return 0;
    return bomArray.reduce((sum, item) => {
      const mat = materialsList.find(m => m.material_id.toString() === item.material_id?.toString());
      const cost = parseFloat(mat?.unit_price || item.material_unit_price || 0);
      const qty = parseFloat(item.quantity_required || item.unit_quantity_required || 0);
      return sum + (cost * qty);
    }, 0);
  };

  // Open Create Modal
  const handleOpenAddModal = () => {
    setFormData({
      ...initialProductForm,
      product_code: `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
      raw_materials: materialsList.length > 0 ? [{ material_id: materialsList[0].material_id, quantity_required: '1', notes: '' }] : []
    });
    setPhotoFiles({ photo_1: null, photo_2: null, photo_3: null });
    setPhotoPreviews({ photo_1: '', photo_2: '', photo_3: '' });
    setShowAddModal(true);
  };

  // Submit Create Product
  const handleCreateProduct = async () => {
    if (!formData.product_name.trim()) {
      toast.error('Product Name is required.');
      return;
    }
    if (!formData.selling_price || parseFloat(formData.selling_price) < 0) {
      toast.error('Please enter a valid Selling Price.');
      return;
    }

    setSubmitting(true);
    try {
      const effectiveCompany = selectedCompanyId || user?.company_id;
      const effectiveBranch = selectedBranchId !== 'all' ? selectedBranchId : (user?.branch_id || branchesList[0]?.branch_id || null);

      const fData = new FormData();
      fData.append('company_id', effectiveCompany);
      if (effectiveBranch) fData.append('branch_id', effectiveBranch);
      fData.append('product_code', formData.product_code);
      fData.append('product_name', formData.product_name);
      fData.append('category', formData.category);
      fData.append('unit_of_measure', formData.unit_of_measure);
      fData.append('selling_price', formData.selling_price);
      fData.append('cost_price', calculateBomTotal(formData.raw_materials));
      fData.append('hsn_code', formData.hsn_code || '');
      fData.append('gst_rate', formData.gst_rate || '18');
      fData.append('product_specification', formData.product_specification || '');
      fData.append('min_stock_level', formData.min_stock_level || '0');
      fData.append('status', formData.status || 'Active');
      fData.append('raw_materials', JSON.stringify(formData.raw_materials));

      if (photoFiles.photo_1) fData.append('photo_1', photoFiles.photo_1);
      if (photoFiles.photo_2) fData.append('photo_2', photoFiles.photo_2);
      if (photoFiles.photo_3) fData.append('photo_3', photoFiles.photo_3);

      await productsApi.create(fData);
      toast.success('Product Master and BOM recipe created successfully');
      setShowAddModal(false);
      fetchProducts();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (product) => {
    setActiveProduct(product);
    setEditFormData({
      ...product,
      raw_materials: product.bom_items ? product.bom_items.map(b => ({
        material_id: b.material_id,
        quantity_required: b.quantity_required,
        notes: b.notes || ''
      })) : []
    });
    setPhotoFiles({ photo_1: null, photo_2: null, photo_3: null });
    setPhotoPreviews({
      photo_1: product.photo_1 ? `${API_BASE_URL}${product.photo_1}` : '',
      photo_2: product.photo_2 ? `${API_BASE_URL}${product.photo_2}` : '',
      photo_3: product.photo_3 ? `${API_BASE_URL}${product.photo_3}` : ''
    });
    setShowEditModal(true);
  };

  // Submit Edit Product
  const handleUpdateProduct = async () => {
    if (!editFormData.product_name.trim()) {
      toast.error('Product Name is required.');
      return;
    }
    if (!editFormData.selling_price || parseFloat(editFormData.selling_price) < 0) {
      toast.error('Valid Selling Price is required.');
      return;
    }

    setSubmitting(true);
    try {
      const fData = new FormData();
      fData.append('product_code', editFormData.product_code);
      fData.append('product_name', editFormData.product_name);
      fData.append('category', editFormData.category);
      fData.append('unit_of_measure', editFormData.unit_of_measure);
      fData.append('selling_price', editFormData.selling_price);
      fData.append('cost_price', calculateBomTotal(editFormData.raw_materials));
      fData.append('hsn_code', editFormData.hsn_code || '');
      fData.append('gst_rate', editFormData.gst_rate || '18');
      fData.append('product_specification', editFormData.product_specification || '');
      fData.append('min_stock_level', editFormData.min_stock_level || '0');
      fData.append('status', editFormData.status || 'Active');
      fData.append('raw_materials', JSON.stringify(editFormData.raw_materials));

      if (photoFiles.photo_1) fData.append('photo_1', photoFiles.photo_1);
      if (photoFiles.photo_2) fData.append('photo_2', photoFiles.photo_2);
      if (photoFiles.photo_3) fData.append('photo_3', photoFiles.photo_3);

      await productsApi.update(activeProduct.product_id, fData);
      toast.success('Product Master updated successfully');
      setShowEditModal(false);
      fetchProducts();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Details Modal
  const handleOpenDetails = (product) => {
    setActiveProduct(product);
    setShowDetailsModal(true);
  };

  // Deactivate
  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Deactivate product "${product.product_name}"?`)) return;
    try {
      await productsApi.delete(product.product_id);
      toast.success('Product deactivated');
      fetchProducts();
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || 'Failed to deactivate product');
    }
  };

  // Navigate to Production page with pre-selected product
  const handleStartProduction = (product) => {
    navigate('/production', { state: { preSelectedProductId: product.product_id } });
  };

  // Export CSV
  const handleExportCSV = () => {
    if (productsList.length === 0) {
      toast.error('No products to export');
      return;
    }
    const headers = ['Product Code', 'Product Name', 'Category', 'UOM', 'Selling Price', 'Est. BOM Cost', 'HSN Code', 'GST Rate', 'BOM Raw Materials Count', 'Status'];
    const rows = productsList.map(p => [
      `"${p.product_code}"`,
      `"${p.product_name}"`,
      `"${p.category}"`,
      `"${p.unit_of_measure}"`,
      p.selling_price,
      p.estimated_bom_cost || 0,
      `"${p.hsn_code || ''}"`,
      p.gst_rate,
      p.total_bom_materials || 0,
      `"${p.status}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Product_Master_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Product catalog exported');
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return productsList.filter(p => {
      const matchSearch = !searchTerm ||
        p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_specification?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;

      return matchSearch && matchCat && matchStatus;
    });
  }, [productsList, searchTerm, categoryFilter, statusFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Master Data</span>
            <ChevronRight size={12} />
            <span className="text-blue-600">Finished Goods Catalog & BOM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="text-blue-600" size={28} />
            PRODUCT MASTER & BOM RECIPES
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage finished products, technical specifications, photo galleries, and Bill of Materials (BOM) raw material recipes for automated production deduction.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchProducts}
            className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus size={15} />
            <span>+ Add New Product</span>
          </button>
        </div>
      </div>

      {/* Scope Selectors */}
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
              <option value="all">All Branches</option>
              {branchesList.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.branch_name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="text-xs text-slate-500 font-medium ml-auto flex items-center gap-1.5">
          <Boxes size={14} className="text-blue-600" />
          <span>Total Catalog Products: <strong className="text-slate-900">{productsList.length}</strong></span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search by product name, code, category, specs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          >
            <option value="all">All Categories</option>
            {PRODUCT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-400'}`}
              title="Grid View"
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-400'}`}
              title="Table View"
            >
              <TableIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid or Table Listing */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 italic bg-white rounded-xl border border-slate-200">
              No products found matching your search and filter criteria.
            </div>
          ) : filteredProducts.map((p) => {
            const bomCost = parseFloat(p.estimated_bom_cost || 0);
            const sellingPrice = parseFloat(p.selling_price || 0);
            const grossMargin = sellingPrice > 0 ? (((sellingPrice - bomCost) / sellingPrice) * 100).toFixed(1) : 0;
            const primaryPhoto = p.photo_1 ? `${API_BASE_URL}${p.photo_1}` : null;

            return (
              <div key={p.product_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group">
                <div>
                  {/* Photo Header */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden flex items-center justify-center">
                    {primaryPhoto ? (
                      <img
                        src={primaryPhoto}
                        alt={p.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <ImageIcon size={36} className="opacity-40" />
                        <span className="text-[10px] mt-1">No Photo Uploaded</span>
                      </div>
                    )}

                    {/* Badge Category */}
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/90 backdrop-blur-sm text-slate-700 border border-slate-200 shadow-xs">
                      {p.category || 'Finished Goods'}
                    </span>

                    {/* Status Badge */}
                    <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-xs ${
                      p.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {p.status}
                    </span>

                    {/* Multi-Photo indicators if slot 2/3 exist */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                      {p.photo_1 && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs"></span>}
                      {p.photo_2 && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs"></span>}
                      {p.photo_3 && <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs"></span>}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-1.5 mb-1">
                      <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors" title={p.product_name}>
                        {p.product_name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 mb-3">
                      <span className="font-mono text-[10.5px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        {p.product_code}
                      </span>
                      <span className="text-[10.5px] text-slate-400">[{p.unit_of_measure}]</span>
                    </div>

                    {/* Price & BOM Cost Row */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs mb-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-[11px]">Selling Price:</span>
                        <strong className="text-slate-900 font-bold text-sm">
                          ₹ {sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Est. BOM Cost:</span>
                        <span className="font-semibold text-slate-700">₹ {bomCost.toFixed(2)}</span>
                      </div>
                      {sellingPrice > 0 && (
                        <div className="flex justify-between items-center text-[10.5px] border-t border-slate-200/60 pt-1">
                          <span className="text-slate-400">Gross Margin:</span>
                          <span className={`font-bold ${parseFloat(grossMargin) >= 30 ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {grossMargin}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* BOM Raw Materials summary */}
                    <div className="text-[11px] text-slate-600 mb-2">
                      <span className="text-slate-400 block mb-0.5">BOM Recipe Materials:</span>
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <Boxes size={13} className="text-blue-600" />
                        <span>{p.total_bom_materials || p.bom_items?.length || 0} Raw Materials configured</span>
                      </div>
                    </div>

                    {p.product_specification && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 italic bg-slate-50/50 p-1.5 rounded border border-slate-100">
                        {p.product_specification}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleStartProduction(p)}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 shadow-xs transition-colors"
                    title="Start Manufacturing Batch"
                  >
                    <Factory size={13} />
                    <span>Manufacture</span>
                  </button>

                  <button
                    onClick={() => handleOpenDetails(p)}
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg border border-slate-200"
                    title="View BOM & Specs"
                  >
                    <Eye size={14} />
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(p)}
                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-slate-200"
                    title="Edit Product"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(p)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-slate-200"
                    title="Deactivate"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Product Name & Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">UOM</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Est. BOM Cost</th>
                  <th className="py-3 px-4 text-center">BOM Ingredients</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No products found.
                    </td>
                  </tr>
                ) : filteredProducts.map((p) => (
                  <tr key={p.product_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.photo_1 ? (
                            <img src={`${API_BASE_URL}${p.photo_1}`} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={18} className="text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{p.product_name}</div>
                          <span className="font-mono text-[10.5px] text-blue-600">{p.product_code}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-medium">{p.category}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{p.unit_of_measure}</td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      ₹ {parseFloat(p.selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 text-right font-medium text-slate-600">
                      ₹ {parseFloat(p.estimated_bom_cost || 0).toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {p.total_bom_materials || p.bom_items?.length || 0} Materials
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                        p.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleStartProduction(p)}
                          className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded text-[11px] flex items-center gap-1"
                          title="Manufacture"
                        >
                          <Factory size={11} />
                          <span>Produce</span>
                        </button>
                        <button onClick={() => handleOpenDetails(p)} className="p-1 text-slate-500 hover:text-blue-600">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => handleOpenEditModal(p)} className="p-1 text-slate-500 hover:text-indigo-600">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => handleDeleteProduct(p)} className="p-1 text-slate-400 hover:text-rose-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ADD NEW PRODUCT MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Package size={22} className="text-blue-200" />
                <div>
                  <h3 className="text-base font-bold">Create Product Master & BOM Recipe</h3>
                  <p className="text-xs text-blue-100">Define finished product specifications, upload photos, and configure Bill of Materials ingredients</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Core Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Industrial Control Panel 24V, High-Speed Gearbox Assy"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Code / SKU</label>
                  <input
                    type="text"
                    placeholder="e.g. PRD-001"
                    value={formData.product_code}
                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    {PRODUCT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measure (UOM)</label>
                  <select
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {STANDARD_UOM.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 8479.89"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <select
                    value={formData.gst_rate}
                    onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18% Standard</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Stock Safety Level</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Product Specifications & Technical Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Enter dimensions, power input, technical tolerances, operational parameters..."
                    value={formData.product_specification}
                    onChange={(e) => setFormData({ ...formData, product_specification: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* ============================================================== */}
              {/* 2-3 PRODUCT PHOTO UPLOAD SECTION */}
              {/* ============================================================== */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ImageIcon size={15} className="text-blue-600" />
                    Product Photo Gallery (Upload 2-3 Photos)
                  </span>
                  <span className="text-[11px] text-slate-500">JPG, PNG, WEBP (Max 10MB each)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {['photo_1', 'photo_2', 'photo_3'].map((slotKey, idx) => {
                    const preview = photoPreviews[slotKey];
                    return (
                      <div key={slotKey} className="flex flex-col items-center">
                        <span className="text-[11px] font-semibold text-slate-600 mb-1">Photo #{idx + 1} ({idx === 0 ? 'Main View' : idx === 1 ? 'Angle / Side' : 'Specs'})</span>
                        
                        {preview ? (
                          <div className="relative w-full h-28 rounded-xl border border-slate-200 overflow-hidden group shadow-xs">
                            <img src={preview} alt="Product" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(slotKey, false)}
                              className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-full shadow-md opacity-90 hover:opacity-100"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <label className="w-full h-28 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-white transition-all text-center p-2 group">
                            <UploadCloud size={20} className="text-slate-400 group-hover:text-blue-600 mb-1" />
                            <span className="text-[10.5px] font-bold text-slate-600 group-hover:text-blue-600">Select Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoSelect(slotKey, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ============================================================== */}
              {/* BILL OF MATERIALS (BOM) RECIPE BUILDER */}
              {/* ============================================================== */}
              <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-2">
                  <div>
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Boxes size={15} className="text-blue-600" />
                      Bill of Materials (BOM) — Raw Materials Required for 1 Finished Product
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Define the exact quantity of each raw material consumed to manufacture 1 {formData.unit_of_measure || 'unit'} of this product.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddBomRow(false)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs self-start sm:self-auto"
                  >
                    <Plus size={13} />
                    <span>Add Raw Material</span>
                  </button>
                </div>

                {formData.raw_materials.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 bg-white rounded-xl border border-dashed border-blue-200">
                    <Boxes size={28} className="mx-auto text-blue-300 mb-1" />
                    <p className="font-semibold text-xs text-slate-700">No Raw Materials Added Yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "Add Raw Material" above to define the manufacturing formula.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formData.raw_materials.map((row, index) => {
                      const selectedMat = materialsList.find(m => m.material_id.toString() === row.material_id?.toString());
                      const unitCost = parseFloat(selectedMat?.unit_price || 0);
                      const qtyReq = parseFloat(row.quantity_required || 0);
                      const lineCost = unitCost * qtyReq;

                      return (
                        <div key={index} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-3">
                          <div className="flex-1 w-full sm:w-auto">
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Raw Material Item</label>
                            <select
                              value={row.material_id}
                              onChange={(e) => handleUpdateBomRow(index, 'material_id', e.target.value, false)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              {materialsList.map(m => (
                                <option key={m.material_id} value={m.material_id}>
                                  {m.material_name} ({m.material_code}) — [{m.unit_of_measure}] (₹ {parseFloat(m.unit_price || 0).toFixed(2)})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-full sm:w-32">
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">
                              Required Qty ({selectedMat?.unit_of_measure || 'Units'})
                            </label>
                            <input
                              type="number"
                              step="0.0001"
                              placeholder="1.0"
                              value={row.quantity_required}
                              onChange={(e) => handleUpdateBomRow(index, 'quantity_required', e.target.value, false)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>

                          <div className="w-full sm:w-28 text-right shrink-0">
                            <label className="text-[10px] text-slate-400 font-semibold block mb-0.5">Line Material Cost</label>
                            <div className="text-xs font-bold text-slate-900 py-1.5">
                              ₹ {lineCost.toFixed(2)}
                            </div>
                          </div>

                          <div className="flex items-center self-end sm:self-center mt-2 sm:mt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveBomRow(index, false)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                              title="Remove Ingredient"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* BOM Cost Summary Box */}
                    <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between mt-3">
                      <div>
                        <span className="text-slate-300 text-xs block">Estimated Total BOM Material Cost per 1 {formData.unit_of_measure || 'Unit'}:</span>
                        <span className="text-[10.5px] text-slate-400">Sum of raw material recipe lines</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-emerald-400">
                          ₹ {calculateBomTotal(formData.raw_materials).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProduct}
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md"
              >
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={15} />}
                <span>Save Product Master</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EDIT PRODUCT MODAL */}
      {/* ========================================================================= */}
      {showEditModal && activeProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl my-8 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit3 size={20} className="text-blue-400" />
                <div>
                  <h3 className="text-base font-bold">Edit Product & BOM: {activeProduct.product_name}</h3>
                  <p className="text-xs text-slate-400 font-mono">Code #{activeProduct.product_code}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={editFormData.product_name}
                    onChange={(e) => setEditFormData({ ...editFormData, product_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Code</label>
                  <input
                    type="text"
                    value={editFormData.product_code}
                    onChange={(e) => setEditFormData({ ...editFormData, product_code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    {PRODUCT_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">UOM</label>
                  <select
                    value={editFormData.unit_of_measure}
                    onChange={(e) => setEditFormData({ ...editFormData, unit_of_measure: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {STANDARD_UOM.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.selling_price}
                    onChange={(e) => setEditFormData({ ...editFormData, selling_price: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={editFormData.hsn_code || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, hsn_code: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <select
                    value={editFormData.gst_rate}
                    onChange={(e) => setEditFormData({ ...editFormData, gst_rate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 mb-1">Product Specifications</label>
                  <textarea
                    rows={2}
                    value={editFormData.product_specification || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, product_specification: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Photos in Edit */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-900 block border-b border-slate-200 pb-2">
                  Product Photos (Replace or Upload)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {['photo_1', 'photo_2', 'photo_3'].map((slotKey, idx) => {
                    const preview = photoPreviews[slotKey];
                    return (
                      <div key={slotKey} className="flex flex-col items-center">
                        <span className="text-[11px] font-semibold text-slate-600 mb-1">Photo #{idx + 1}</span>
                        {preview ? (
                          <div className="relative w-full h-28 rounded-xl border border-slate-200 overflow-hidden group shadow-xs">
                            <img src={preview} alt="Product" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(slotKey, true)}
                              className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-full shadow-md"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <label className="w-full h-28 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-white transition-all text-center p-2 group">
                            <UploadCloud size={20} className="text-slate-400 group-hover:text-blue-600 mb-1" />
                            <span className="text-[10.5px] font-bold text-slate-600 group-hover:text-blue-600">Upload Image</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoSelect(slotKey, e)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BOM in Edit */}
              <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <span className="font-bold text-blue-900">BOM Raw Material Recipe</span>
                  <button
                    type="button"
                    onClick={() => handleAddBomRow(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs"
                  >
                    <Plus size={13} />
                    <span>Add Material</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {(editFormData.raw_materials || []).map((row, index) => {
                    const selectedMat = materialsList.find(m => m.material_id.toString() === row.material_id?.toString());
                    const unitCost = parseFloat(selectedMat?.unit_price || 0);
                    const qtyReq = parseFloat(row.quantity_required || 0);
                    const lineCost = unitCost * qtyReq;

                    return (
                      <div key={index} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="flex-1 w-full sm:w-auto">
                          <select
                            value={row.material_id}
                            onChange={(e) => handleUpdateBomRow(index, 'material_id', e.target.value, true)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            {materialsList.map(m => (
                              <option key={m.material_id} value={m.material_id}>
                                {m.material_name} ({m.material_code}) — [{m.unit_of_measure}] (₹ {parseFloat(m.unit_price || 0).toFixed(2)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="w-full sm:w-32">
                          <input
                            type="number"
                            step="0.0001"
                            value={row.quantity_required}
                            onChange={(e) => handleUpdateBomRow(index, 'quantity_required', e.target.value, true)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>

                        <div className="w-full sm:w-28 text-right shrink-0">
                          <div className="text-xs font-bold text-slate-900 py-1.5">
                            ₹ {lineCost.toFixed(2)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveBomRow(index, true)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}

                  <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                    <span className="text-slate-300 text-xs">Total BOM Material Cost:</span>
                    <span className="text-base font-bold text-emerald-400">
                      ₹ {calculateBomTotal(editFormData.raw_materials).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
              <button
                onClick={handleUpdateProduct}
                disabled={submitting}
                className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md"
              >
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={15} />}
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PRODUCT DETAILS & BOM MODAL */}
      {/* ========================================================================= */}
      {showDetailsModal && activeProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Package size={22} className="text-blue-400" />
                <div>
                  <h3 className="text-base font-bold">{activeProduct.product_name}</h3>
                  <p className="text-xs text-slate-400 font-mono">Product Code #{activeProduct.product_code}</p>
                </div>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Photo Strip */}
              {(activeProduct.photo_1 || activeProduct.photo_2 || activeProduct.photo_3) && (
                <div className="grid grid-cols-3 gap-3">
                  {[activeProduct.photo_1, activeProduct.photo_2, activeProduct.photo_3].filter(Boolean).map((photo, i) => (
                    <div key={i} className="h-32 rounded-xl overflow-hidden border border-slate-200">
                      <img src={`${API_BASE_URL}${photo}`} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {/* Price & Specs Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[11px] block">Selling Price</span>
                  <strong className="text-slate-900 font-bold text-sm">
                    ₹ {parseFloat(activeProduct.selling_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Est. BOM Cost</span>
                  <strong className="text-emerald-700 font-bold text-sm">
                    ₹ {parseFloat(activeProduct.estimated_bom_cost || activeProduct.total_bom_cost || 0).toFixed(2)}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Category</span>
                  <span className="font-semibold text-slate-800">{activeProduct.category}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Unit of Measure</span>
                  <span className="font-bold text-slate-800">{activeProduct.unit_of_measure}</span>
                </div>
              </div>

              {activeProduct.product_specification && (
                <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
                  <h4 className="font-bold text-slate-800 mb-1 uppercase tracking-wider text-[11px]">Technical Specifications</h4>
                  <p className="text-slate-600 text-xs whitespace-pre-wrap">{activeProduct.product_specification}</p>
                </div>
              )}

              {/* BOM Recipe Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-slate-800 text-xs flex items-center justify-between">
                  <span>Bill of Materials (BOM) — Raw Materials Required per 1 {activeProduct.unit_of_measure}</span>
                  <span className="text-blue-600">{activeProduct.bom_items?.length || 0} Materials</span>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 text-slate-500 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3">Material Name & SKU</th>
                      <th className="py-2 px-3 text-right">Required Qty</th>
                      <th className="py-2 px-3 text-right">Unit Price</th>
                      <th className="py-2 px-3 text-right">Total Line Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!activeProduct.bom_items || activeProduct.bom_items.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                          No BOM ingredients configured for this product.
                        </td>
                      </tr>
                    ) : activeProduct.bom_items.map((b) => (
                      <tr key={b.bom_id}>
                        <td className="py-2.5 px-3">
                          <strong className="text-slate-900 block">{b.material_name}</strong>
                          <span className="font-mono text-[10.5px] text-blue-600">{b.material_code}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                          {parseFloat(b.quantity_required).toFixed(4)} {b.unit_of_measure}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          ₹ {parseFloat(b.material_unit_price || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          ₹ {parseFloat(b.line_material_cost || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleStartProduction(activeProduct);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5"
              >
                <Factory size={14} />
                <span>Start Production Run with this BOM</span>
              </button>

              <button onClick={() => setShowDetailsModal(false)} className="px-5 py-2 bg-slate-800 text-white font-bold rounded-lg text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductMaster;
