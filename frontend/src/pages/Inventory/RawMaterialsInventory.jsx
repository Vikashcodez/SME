import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  rawMaterialInventory as inventoryApi, 
  rawMaterials as rawMaterialsApi, 
  assets as assetsApi,
  vendors as vendorsApi,
  branches as branchesApi, 
  companies as companiesApi,
  departments as departmentsApi,
  employees as employeesApi
} from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Package, 
  Plus, 
  Search, 
  RotateCcw, 
  Eye, 
  X, 
  Check, 
  Building2, 
  Building, 
  Calendar, 
  AlertTriangle, 
  RefreshCw, 
  Filter, 
  Layers, 
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  DollarSign,
  Download,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Truck,
  ShieldAlert,
  ClipboardList,
  AlertOctagon,
  History,
  TrendingDown,
  Warehouse,
  Boxes,
  Shield,
  FileText,
  UploadCloud,
  ExternalLink,
  MapPin,
  Tag,
  Hash,
  Sparkles,
  Paperclip,
  CheckCircle,
  User,
  Cpu
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000';

const MOVEMENT_TYPE_CONFIG = {
  'Stock In / GRN': {
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: ArrowDownLeft,
    badge: 'Stock In (GRN)'
  },
  'Stock Out / Issue': {
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: ArrowUpRight,
    badge: 'Issue / Out'
  },
  'Stock Adjustment': {
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: SlidersHorizontal,
    badge: 'Adjustment'
  },
  'Return to Vendor': {
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: RotateCcw,
    badge: 'Return (RTV)'
  },
  'Damaged / Scrapped': {
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: AlertOctagon,
    badge: 'Scrapped'
  }
};

const ASSET_CATEGORIES = [
  'Heavy Machinery & Production Line',
  'IT Equipment & Computers',
  'Office Furniture & Fixtures',
  'Vehicles & Transport',
  'Tools & Precision Dies',
  'Electrical & Generators',
  'Safety & Security Equipment',
  'General Infrastructure'
];

const RETURN_TYPES = [
  'Damaged in Transit',
  'Defective / Quality Rejected',
  'Expired Stock',
  'Handling Damage',
  'Excess Return to Vendor'
];

const DISPOSITION_ACTIONS = [
  'Return to Vendor / RMA',
  'Scrapped / Written Off',
  'Credit Note Requested',
  'Replacement Received'
];

const RawMaterialsInventory = () => {
  const { user, isSuperAdmin, isCompanyAdmin, isBranchAdmin } = useAuth();

  // Selected Scope
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.company_id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branch_id || '');

  // Scope & Reference lists
  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [existingAssetsList, setExistingAssetsList] = useState([]);

  // Data lists
  const [inventoryList, setInventoryList] = useState([]);
  const [movementsList, setMovementsList] = useState([]);
  const [returnsList, setReturnsList] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    total_materials: 0,
    out_of_stock_count: 0,
    low_stock_count: 0,
    total_valuation: 0,
    total_damage_loss: 0
  });

  // Active Tab: 'stock' | 'movements' | 'returns'
  const [activeTab, setActiveTab] = useState('stock');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'In Stock', 'Low Stock', 'Out of Stock'
  const [movementFilter, setMovementFilter] = useState('all');
  const [itemTypeFilter, setItemTypeFilter] = useState('all'); // 'all', 'Raw Material', 'Asset'
  const [returnTypeFilter, setReturnTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');

  // Modals state
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState(null);
  const [itemHistoryList, setItemHistoryList] = useState([]);

  // File upload state for GRN Invoice
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceFileName, setInvoiceFileName] = useState('');
  const fileInputRef = useRef(null);

  // Form State: Stock Movement / GRN Inward
  const initialMovementState = {
    item_type: 'Raw Material', // 'Raw Material' | 'Asset'
    material_id: '',
    asset_id: '',
    create_asset_master: true, // If item_type === 'Asset', default to creating new asset master
    asset_name: '',
    asset_category: 'Heavy Machinery & Production Line',
    asset_tag: '',
    asset_location: 'Plant 1 - Shop Floor Bay 1',
    brand_model: '',
    serial_number: '',
    department_id: '',
    assigned_employee_id: '',
    condition: 'Excellent',
    movement_type: 'Stock In / GRN',
    quantity: '1',
    unit_cost: '',
    warehouse_location: 'Main Store - Rack A1',
    vendor_id: '',
    reference_no: '',
    batch_no: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    notes: ''
  };

  const [movementForm, setMovementForm] = useState(initialMovementState);

  // Form State: Return / Damage
  const [returnForm, setReturnForm] = useState({
    material_id: '',
    vendor_id: '',
    return_type: 'Defective / Quality Rejected',
    quantity: '',
    unit_cost: '',
    action_taken: 'Return to Vendor / RMA',
    reference_no: '',
    batch_no: '',
    reason_notes: '',
    deduct_from_stock: true
  });

  // Sync with user context
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
      fetchMaterialsAndVendors(effectiveCompanyId);
      fetchDepartmentsAndEmployees(effectiveCompanyId, selectedBranchId);
      fetchExistingAssets(effectiveCompanyId, selectedBranchId);
    }
  }, [selectedCompanyId, selectedBranchId, user?.company_id]);

  useEffect(() => {
    refreshAllData();
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

  const fetchMaterialsAndVendors = async (compVal) => {
    try {
      const [matRes, venRes] = await Promise.all([
        rawMaterialsApi.getAll({ company_id: compVal }),
        vendorsApi.getAll({ company_id: compVal })
      ]);
      setMaterialsList(matRes.data.data || []);
      setVendorsList(venRes.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDepartmentsAndEmployees = async (compVal, branchVal) => {
    try {
      const branchParam = branchVal && branchVal !== 'all' ? branchVal : undefined;
      const [deptRes, empRes] = await Promise.all([
        branchParam ? departmentsApi.getByBranch(branchParam) : Promise.resolve({ data: [] }),
        employeesApi.getAll({ company_id: compVal, branch_id: branchParam })
      ]);
      setDepartmentsList(deptRes.data?.data || deptRes.data || []);
      setEmployeesList(empRes.data?.data || empRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExistingAssets = async (compVal, branchVal) => {
    try {
      const params = { company_id: compVal };
      if (branchVal && branchVal !== 'all') params.branch_id = branchVal;
      const res = await assetsApi.getAll(params);
      setExistingAssetsList(res.data?.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshAllData = () => {
    fetchInventoryOverview();
    fetchStockMovements();
    fetchReturns();
    fetchStats();
  };

  const fetchInventoryOverview = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      const res = await inventoryApi.getOverview(params);
      setInventoryList(res.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load live inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchStockMovements = async () => {
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      const res = await inventoryApi.getMovements(params);
      setMovementsList(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReturns = async () => {
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      const res = await inventoryApi.getReturns(params);
      setReturnsList(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStats = async () => {
    try {
      const params = {};
      if (selectedCompanyId) params.company_id = selectedCompanyId;
      if (selectedBranchId && selectedBranchId !== 'all') params.branch_id = selectedBranchId;
      const res = await inventoryApi.getStats(params);
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Movement Modal
  const handleOpenMovementModal = (item = null, type = 'Raw Material') => {
    setInvoiceFile(null);
    setInvoiceFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (item) {
      setMovementForm({
        ...initialMovementState,
        item_type: 'Raw Material',
        material_id: item.material_id,
        movement_type: 'Stock In / GRN',
        quantity: '1',
        unit_cost: item.unit_price || item.average_unit_cost || '',
        warehouse_location: item.warehouse_location || 'Main Store - Rack A1',
        vendor_id: item.preferred_vendor_id || '',
        reference_no: '',
        batch_no: '',
        notes: ''
      });
    } else {
      setMovementForm({
        ...initialMovementState,
        item_type: type,
        material_id: materialsList.length > 0 ? materialsList[0].material_id : '',
        asset_category: 'Heavy Machinery & Production Line',
        asset_location: 'Plant 1 - Shop Floor Bay 1'
      });
    }
    setShowMovementModal(true);
  };

  // Handle invoice file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error('Invoice file size exceeds 15MB limit.');
        return;
      }
      setInvoiceFile(file);
      setInvoiceFileName(file.name);
    }
  };

  const handleRemoveInvoiceFile = () => {
    setInvoiceFile(null);
    setInvoiceFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit Stock Movement / GRN Inward
  const handleRecordMovement = async () => {
    const isAsset = movementForm.item_type === 'Asset';

    if (!isAsset && !movementForm.material_id) {
      toast.error('Please select a Raw Material');
      return;
    }

    if (isAsset) {
      if (movementForm.create_asset_master) {
        if (!movementForm.asset_name.trim()) {
          toast.error('Please enter Asset Name');
          return;
        }
        if (!movementForm.asset_category) {
          toast.error('Please select an Asset Category');
          return;
        }
        if (!movementForm.asset_location.trim()) {
          toast.error('Please specify the Asset Location (e.g. Bay, Floor, Room)');
          return;
        }
      } else if (!movementForm.asset_id) {
        toast.error('Please select an existing Asset');
        return;
      }
    }

    if (!movementForm.quantity || parseFloat(movementForm.quantity) <= 0) {
      toast.error('Please enter a valid positive quantity');
      return;
    }

    const effectiveBranch = selectedBranchId !== 'all' ? selectedBranchId : (user?.branch_id || (branchesList[0]?.branch_id || null));
    const effectiveCompany = selectedCompanyId || user?.company_id;

    if (!effectiveBranch) {
      toast.error('Please select a specific Branch for GRN / inventory movements');
      return;
    }

    setSubmitting(true);
    try {
      // Build FormData to handle file upload along with structured data
      const formData = new FormData();
      formData.append('company_id', effectiveCompany);
      formData.append('branch_id', effectiveBranch);
      formData.append('item_type', movementForm.item_type);
      formData.append('movement_type', movementForm.movement_type);
      formData.append('quantity', movementForm.quantity);
      formData.append('unit_cost', movementForm.unit_cost || '0');
      formData.append('reference_no', movementForm.reference_no || '');
      formData.append('batch_no', movementForm.batch_no || '');
      formData.append('invoice_number', movementForm.invoice_number || '');
      formData.append('invoice_date', movementForm.invoice_date || '');
      formData.append('notes', movementForm.notes || '');

      if (movementForm.vendor_id) formData.append('vendor_id', movementForm.vendor_id);

      if (isAsset) {
        formData.append('create_asset_master', movementForm.create_asset_master ? 'true' : 'false');
        if (movementForm.create_asset_master) {
          formData.append('asset_name', movementForm.asset_name);
          formData.append('asset_category', movementForm.asset_category);
          formData.append('asset_tag', movementForm.asset_tag || '');
          formData.append('asset_location', movementForm.asset_location || '');
          formData.append('brand_model', movementForm.brand_model || '');
          formData.append('serial_number', movementForm.serial_number || '');
          if (movementForm.department_id) formData.append('department_id', movementForm.department_id);
          if (movementForm.assigned_employee_id) formData.append('assigned_employee_id', movementForm.assigned_employee_id);
        } else {
          formData.append('asset_id', movementForm.asset_id);
        }
      } else {
        formData.append('material_id', movementForm.material_id);
        formData.append('warehouse_location', movementForm.warehouse_location || 'Main Store');
      }

      if (invoiceFile) {
        formData.append('invoice_file', invoiceFile);
      }

      const res = await inventoryApi.recordMovement(formData);
      toast.success(res.data.message || 'GRN / Stock transaction recorded successfully');
      setShowMovementModal(false);
      setMovementForm(initialMovementState);
      setInvoiceFile(null);
      setInvoiceFileName('');
      refreshAllData();
      fetchExistingAssets(effectiveCompany, effectiveBranch);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to record stock movement');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Return Modal
  const handleOpenReturnModal = (item = null) => {
    if (item) {
      setReturnForm({
        material_id: item.material_id,
        vendor_id: item.preferred_vendor_id || '',
        return_type: 'Defective / Quality Rejected',
        quantity: '',
        unit_cost: item.unit_price || item.average_unit_cost || '',
        action_taken: 'Return to Vendor / RMA',
        reference_no: '',
        batch_no: '',
        reason_notes: '',
        deduct_from_stock: true
      });
    } else {
      setReturnForm({
        material_id: materialsList.length > 0 ? materialsList[0].material_id : '',
        vendor_id: '',
        return_type: 'Defective / Quality Rejected',
        quantity: '',
        unit_cost: '',
        action_taken: 'Return to Vendor / RMA',
        reference_no: '',
        batch_no: '',
        reason_notes: '',
        deduct_from_stock: true
      });
    }
    setShowReturnModal(true);
  };

  // Submit Damage / Return
  const handleRecordReturn = async () => {
    if (!returnForm.material_id) {
      toast.error('Please select a Raw Material');
      return;
    }
    if (!returnForm.quantity || parseFloat(returnForm.quantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...returnForm,
        company_id: selectedCompanyId || user?.company_id,
        branch_id: selectedBranchId !== 'all' ? selectedBranchId : (user?.branch_id || (branchesList[0]?.branch_id || null))
      };

      if (!payload.branch_id) {
        toast.error('Please select a specific Branch');
        setSubmitting(false);
        return;
      }

      const res = await inventoryApi.recordReturn(payload);
      toast.success(res.data.message || 'Damage / Return recorded successfully');
      setShowReturnModal(false);
      refreshAllData();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to record return');
    } finally {
      setSubmitting(false);
    }
  };

  // View Material History Ledger
  const handleViewMaterialHistory = async (item) => {
    setActiveMaterial(item);
    try {
      const res = await inventoryApi.getMovements({
        material_id: item.material_id,
        branch_id: selectedBranchId !== 'all' ? selectedBranchId : undefined
      });
      setItemHistoryList(res.data.data || []);
      setShowHistoryModal(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load item movement history');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (activeTab === 'stock') {
      if (filteredInventory.length === 0) {
        toast.error('No inventory items to export');
        return;
      }
      const headers = ['SKU Code', 'Material Name', 'Category', 'UOM', 'Current Stock', 'Reorder Point', 'Unit Cost', 'Total Valuation', 'Location', 'Status'];
      const rows = filteredInventory.map(i => [
        `"${i.material_code}"`,
        `"${i.material_name}"`,
        `"${i.category}"`,
        `"${i.unit_of_measure}"`,
        i.current_stock,
        i.minimum_stock_level,
        i.average_unit_cost,
        i.total_value,
        `"${i.warehouse_location || ''}"`,
        `"${i.stock_status}"`
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csv, `Raw_Materials_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    } else if (activeTab === 'movements') {
      if (filteredMovements.length === 0) {
        toast.error('No movements to export');
        return;
      }
      const headers = ['Date', 'Type', 'Item Type', 'Item Code', 'Item Name', 'Quantity', 'Unit Cost', 'Total Amount', 'Invoice No', 'Invoice Date', 'Location', 'Ref No', 'Batch No', 'Performed By'];
      const rows = filteredMovements.map(m => [
        `"${new Date(m.created_at).toLocaleString()}"`,
        `"${m.movement_type}"`,
        `"${m.item_type || 'Raw Material'}"`,
        `"${m.item_code || ''}"`,
        `"${m.item_display_name || m.material_name || m.asset_name || ''}"`,
        m.quantity,
        m.unit_cost,
        m.total_cost,
        `"${m.invoice_number || ''}"`,
        `"${m.invoice_date || ''}"`,
        `"${m.asset_location || m.warehouse_location || ''}"`,
        `"${m.reference_no || ''}"`,
        `"${m.batch_no || ''}"`,
        `"${m.performed_by_name || ''}"`
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csv, `GRN_Stock_Movements_${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded successfully');
  };

  // Filtered Stock Overview
  const filteredInventory = useMemo(() => {
    return inventoryList.filter(item => {
      const matchesSearch = !searchTerm ||
        item.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.material_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.warehouse_location?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.stock_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inventoryList, searchTerm, statusFilter]);

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    return movementsList.filter(m => {
      const itemText = (m.item_display_name || m.material_name || m.asset_name || '') + ' ' + (m.item_code || m.material_code || m.asset_tag || '');
      const matchSearch = !searchTerm ||
        itemText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.reference_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.batch_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = movementFilter === 'all' || m.movement_type === movementFilter;
      const matchItemType = itemTypeFilter === 'all' || (m.item_type || 'Raw Material') === itemTypeFilter;

      return matchSearch && matchType && matchItemType;
    });
  }, [movementsList, searchTerm, movementFilter, itemTypeFilter]);

  // Filtered Returns
  const filteredReturns = useMemo(() => {
    return returnsList.filter(r => {
      const matchSearch = !searchTerm ||
        r.material_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.material_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.reference_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = returnTypeFilter === 'all' || r.return_type === returnTypeFilter;

      return matchSearch && matchType;
    });
  }, [returnsList, searchTerm, returnTypeFilter]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <span>Inventory Management</span>
            <ChevronRight size={12} />
            <span className="text-blue-600">Raw Materials & Inward GRN</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Warehouse className="text-blue-600" size={28} />
            RAW MATERIALS & GRN INWARD
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time warehouse stock tracking, GRN inward receipt (with Invoice & Asset Master creation), issues, and damage / return to vendor (RTV) logs.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={refreshAllData}
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
            onClick={() => handleOpenMovementModal(null, 'Raw Material')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
          >
            <Plus size={15} />
            <span>+ GRN / Stock Movement</span>
          </button>

          <button
            onClick={() => handleOpenReturnModal(null)}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <AlertOctagon size={14} />
            <span>Log Damage / Return</span>
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
          <span>Active Material SKUs: <strong className="text-slate-900">{stats.total_materials || 0}</strong></span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catalog Materials</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total_materials || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Active SKU Master items</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Live Inventory Value</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            ₹ {parseFloat(stats.total_valuation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Weighted avg. cost valuation</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Low Stock Warnings</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.low_stock_count || 0}</p>
          <span className="text-[11px] text-amber-500 mt-1 block">Below reorder point threshold</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Out of Stock</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{stats.out_of_stock_count || 0}</p>
          <span className="text-[11px] text-rose-500 mt-1 block">Requires immediate PO requisition</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Damaged / RTV Value</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">
            ₹ {parseFloat(stats.total_damage_loss || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Total returns & rejected loss</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('stock')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'stock'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Warehouse size={16} />
          <span>Warehouse Stock Overview ({inventoryList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'movements'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History size={16} />
          <span>GRN & Stock Movement Ledger ({movementsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('returns')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'returns'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertOctagon size={16} />
          <span>Damaged Stock & Returns (RTV) ({returnsList.length})</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Search material SKU, asset tag, invoice#, reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'stock' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              <option value="all">All Stock Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock Warnings</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          )}

          {activeTab === 'movements' && (
            <>
              <select
                value={itemTypeFilter}
                onChange={(e) => setItemTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              >
                <option value="all">All Item Categories</option>
                <option value="Raw Material">📦 Raw Materials</option>
                <option value="Asset">🛡️ Capital Assets</option>
              </select>

              <select
                value={movementFilter}
                onChange={(e) => setMovementFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              >
                <option value="all">All Movement Types</option>
                <option value="Stock In / GRN">Stock In / GRN</option>
                <option value="Stock Out / Issue">Stock Out / Production Issue</option>
                <option value="Stock Adjustment">Stock Physical Adjustment</option>
                <option value="Return to Vendor">Return to Vendor (RTV)</option>
              </select>
            </>
          )}

          {activeTab === 'returns' && (
            <select
              value={returnTypeFilter}
              onChange={(e) => setReturnTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              <option value="all">All Rejection Types</option>
              {RETURN_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}

          {activeTab === 'stock' && (
            <div className="flex border border-slate-200 rounded-lg p-0.5 bg-slate-50">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-400'}`}
                title="Table View"
              >
                <TableIcon size={14} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-xs text-blue-600 font-bold' : 'text-slate-400'}`}
                title="Grid Cards"
              >
                <LayoutGrid size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LIVE WAREHOUSE INVENTORY */}
      {/* ========================================================================= */}
      {activeTab === 'stock' && (
        viewMode === 'table' ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Material / SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Warehouse Bin</th>
                    <th className="py-3 px-4 text-right">Current Stock</th>
                    <th className="py-3 px-4 text-right">Reorder Threshold</th>
                    <th className="py-3 px-4 text-right">Avg Unit Cost</th>
                    <th className="py-3 px-4 text-right">Total Valuation</th>
                    <th className="py-3 px-4 text-center">Stock Status</th>
                    <th className="py-3 px-4 text-center">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                        No raw materials found for the selected scope.
                      </td>
                    </tr>
                  ) : filteredInventory.map((item) => (
                    <tr key={item.material_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.material_name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[10.5px] text-blue-600 bg-blue-50 px-1 rounded border border-blue-100">
                            {item.material_code}
                          </span>
                          <span className="text-slate-400 text-[10.5px]">[{item.unit_of_measure}]</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {item.category || 'General'}
                      </td>

                      <td className="py-3 px-4 text-slate-600 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        <span>{item.warehouse_location || 'Main Store'}</span>
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                        {parseFloat(item.current_stock || 0).toLocaleString()} {item.unit_of_measure}
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-slate-600">
                        {parseFloat(item.minimum_stock_level || 0).toLocaleString()} {item.unit_of_measure}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-600">
                        ₹ {parseFloat(item.average_unit_cost || 0).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        ₹ {parseFloat(item.total_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                          item.stock_status === 'In Stock' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          item.stock_status === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {item.stock_status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenMovementModal(item, 'Raw Material')}
                            className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded text-[11px] flex items-center gap-1"
                            title="Post Movement / GRN"
                          >
                            <ArrowDownLeft size={11} />
                            <span>GRN / Inward</span>
                          </button>

                          <button
                            onClick={() => handleOpenReturnModal(item)}
                            className="px-2 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold rounded text-[11px] flex items-center gap-1"
                            title="Log Damage / Return"
                          >
                            <AlertOctagon size={11} />
                            <span>Return</span>
                          </button>

                          <button
                            onClick={() => handleViewMaterialHistory(item)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                            title="View History Ledger"
                          >
                            <History size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInventory.map((item) => (
              <div key={item.material_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{item.material_name}</h4>
                      <span className="font-mono text-[10.5px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 inline-block mt-0.5">
                        {item.material_code}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border shrink-0 ${
                      item.stock_status === 'In Stock' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      item.stock_status === 'Low Stock' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {item.stock_status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 mb-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Stock:</span>
                      <span className="font-bold text-slate-900 text-sm">{parseFloat(item.current_stock || 0).toLocaleString()} {item.unit_of_measure}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Reorder Threshold:</span>
                      <span className="font-semibold text-amber-600">{item.minimum_stock_level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Valuation:</span>
                      <span className="font-bold text-emerald-700">₹ {parseFloat(item.total_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Storage Location:</span>
                      <span className="font-medium text-slate-800">{item.warehouse_location || 'Main Store'}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleOpenMovementModal(item, 'Raw Material')}
                    className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg text-center"
                  >
                    + GRN / Inward
                  </button>
                  <button
                    onClick={() => handleOpenReturnModal(item)}
                    className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-lg text-center"
                  >
                    ! Damage/Return
                  </button>
                  <button
                    onClick={() => handleViewMaterialHistory(item)}
                    className="p-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                    title="History"
                  >
                    <History size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GRN & STOCK MOVEMENT LEDGER */}
      {/* ========================================================================= */}
      {activeTab === 'movements' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Item SKU / Asset</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Location / Bay</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4">Invoice & Verification</th>
                  <th className="py-3 px-4">Reference / Batch</th>
                  <th className="py-3 px-4">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                      No stock movement or GRN inward transactions recorded yet.
                    </td>
                  </tr>
                ) : filteredMovements.map((mov) => {
                  const cfg = MOVEMENT_TYPE_CONFIG[mov.movement_type] || MOVEMENT_TYPE_CONFIG['Stock In / GRN'];
                  const isAssetItem = mov.item_type === 'Asset';

                  return (
                    <tr key={mov.movement_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {new Date(mov.created_at).toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase ${
                            isAssetItem 
                              ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {isAssetItem ? '🛡️ Asset' : '📦 Raw Material'}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900">
                          {mov.item_display_name || mov.material_name || mov.asset_name || 'Item'}
                        </div>
                        <span className="font-mono text-[10.5px] text-slate-500">
                          {mov.item_code || mov.material_code || mov.asset_tag || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${cfg.color}`}>
                          {mov.movement_type}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        <div className="flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span>{mov.asset_location || mov.warehouse_location || 'Main Floor'}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {parseFloat(mov.quantity).toLocaleString()} {mov.unit_of_measure || 'Units'}
                      </td>

                      <td className="py-3 px-4 text-right font-medium text-slate-600">
                        ₹ {parseFloat(mov.unit_cost || 0).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        ₹ {parseFloat(mov.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="py-3 px-4">
                        {mov.invoice_number ? (
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-slate-800 text-[11px] flex items-center gap-1">
                              <FileText size={12} className="text-blue-600" />
                              <span>{mov.invoice_number}</span>
                            </div>
                            {mov.invoice_date && (
                              <div className="text-[10px] text-slate-400">
                                Date: {new Date(mov.invoice_date).toLocaleDateString()}
                              </div>
                            )}
                            {mov.invoice_url && (
                              <a
                                href={`${API_BASE_URL}${mov.invoice_url}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10.5px] font-bold text-blue-600 hover:text-blue-800 hover:underline mt-0.5"
                              >
                                <ExternalLink size={10} />
                                <span>View Document</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No invoice</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                        <div>Ref: {mov.reference_no || '—'}</div>
                        {mov.batch_no && <div className="text-slate-400">Lot: {mov.batch_no}</div>}
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {mov.performed_by_name || 'System Admin'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DAMAGED STOCK & RETURNS */}
      {/* ========================================================================= */}
      {activeTab === 'returns' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Material / SKU</th>
                  <th className="py-3 px-4">Reason / Return Type</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Estimated Loss</th>
                  <th className="py-3 px-4">Action / Disposition</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      No damaged materials or vendor returns (RTV) logged yet.
                    </td>
                  </tr>
                ) : filteredReturns.map((ret) => (
                  <tr key={ret.return_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(ret.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{ret.material_name}</div>
                      <span className="font-mono text-[10.5px] text-blue-600">{ret.material_code}</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {ret.return_type}
                      </span>
                      {ret.reason_notes && (
                        <p className="text-[11px] text-slate-500 mt-1 max-w-xs truncate">{ret.reason_notes}</p>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-rose-700">
                      {parseFloat(ret.quantity).toLocaleString()} {ret.unit_of_measure}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹ {parseFloat(ret.total_loss_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {ret.action_taken}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      {ret.vendor_name || 'N/A'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {ret.status || 'Approved'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. STOCK MOVEMENT & GRN INWARD MODAL */}
      {/* ========================================================================= */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal size={22} className="text-blue-200" />
                <div>
                  <h3 className="text-base font-bold">Post GRN Inward / Stock Transaction</h3>
                  <p className="text-xs text-blue-100">Take raw materials or capital equipment assets into stock with verified invoice documents</p>
                </div>
              </div>
              <button onClick={() => setShowMovementModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Top Item Type Switcher: Raw Material vs Asset */}
              <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1.5 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setMovementForm({ ...movementForm, item_type: 'Raw Material' })}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    movementForm.item_type === 'Raw Material'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Package size={15} />
                  <span>📦 It's a Raw Material</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMovementForm({ ...movementForm, item_type: 'Asset' })}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    movementForm.item_type === 'Asset'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Shield size={15} />
                  <span>🛡️ It's a Capital Asset</span>
                </button>
              </div>

              {/* ============================================================== */}
              {/* SECTION A: RAW MATERIAL INWARD FIELDS */}
              {/* ============================================================== */}
              {movementForm.item_type === 'Raw Material' && (
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <Package size={14} className="text-blue-600" />
                      Raw Material Details
                    </span>
                    <span className="text-[11px] text-blue-600">Select material from master catalog</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Select Raw Material *</label>
                      <select
                        value={movementForm.material_id}
                        onChange={(e) => {
                          const mat = materialsList.find(m => m.material_id.toString() === e.target.value);
                          setMovementForm({
                            ...movementForm,
                            material_id: e.target.value,
                            unit_cost: mat?.unit_price || movementForm.unit_cost,
                            vendor_id: mat?.preferred_vendor_id || movementForm.vendor_id
                          });
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      >
                        <option value="">-- Choose Material from Catalog --</option>
                        {materialsList.map(m => (
                          <option key={m.material_id} value={m.material_id}>
                            {m.material_name} ({m.material_code}) — Category: {m.category || 'General'} [{m.unit_of_measure}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Movement Type *</label>
                      <select
                        value={movementForm.movement_type}
                        onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="Stock In / GRN">Stock In / GRN (Inward +)</option>
                        <option value="Stock Out / Issue">Stock Out / Production Issue (-)</option>
                        <option value="Stock Adjustment">Stock Physical Count Adjustment</option>
                        <option value="Return to Vendor">Return to Vendor (-)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Storage Rack / Warehouse Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Main Store, Rack A-12, Bin 3"
                        value={movementForm.warehouse_location}
                        onChange={(e) => setMovementForm({ ...movementForm, warehouse_location: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* SECTION B: ASSET INWARD & ASSET MASTER CREATION FIELDS */}
              {/* ============================================================== */}
              {movementForm.item_type === 'Asset' && (
                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <Shield size={14} className="text-indigo-600" />
                      Capital Asset Inward & Registry
                    </span>

                    {/* Mode selector for Asset */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700">
                        <input
                          type="radio"
                          name="asset_master_mode"
                          checked={movementForm.create_asset_master}
                          onChange={() => setMovementForm({ ...movementForm, create_asset_master: true })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>✨ Create New Asset Master</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700 ml-2">
                        <input
                          type="radio"
                          name="asset_master_mode"
                          checked={!movementForm.create_asset_master}
                          onChange={() => setMovementForm({ ...movementForm, create_asset_master: false })}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Select Existing Asset</span>
                      </label>
                    </div>
                  </div>

                  {movementForm.create_asset_master ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">Asset Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. 5-Axis CNC Milling Center, Hydraulic Press 100T"
                          value={movementForm.asset_name}
                          onChange={(e) => setMovementForm({ ...movementForm, asset_name: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Asset Tag (Auto if blank)</label>
                        <input
                          type="text"
                          placeholder="e.g. AST-MCH-904"
                          value={movementForm.asset_tag}
                          onChange={(e) => setMovementForm({ ...movementForm, asset_tag: e.target.value.toUpperCase() })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Asset Category *</label>
                        <select
                          value={movementForm.asset_category}
                          onChange={(e) => setMovementForm({ ...movementForm, asset_category: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                        >
                          {ASSET_CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        {/* ASSET LOCATION OPTION - User requirement */}
                        <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1">
                          <MapPin size={12} className="text-indigo-600" />
                          <span>Asset Location / Installation Bay *</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Plant 1 - Shop Floor Bay 4, Server Room Rack 2"
                          value={movementForm.asset_location}
                          onChange={(e) => setMovementForm({ ...movementForm, asset_location: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Brand & Model</label>
                        <input
                          type="text"
                          placeholder="e.g. Haas VF-2SS, Dell PowerEdge"
                          value={movementForm.brand_model}
                          onChange={(e) => setMovementForm({ ...movementForm, brand_model: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Serial Number / Machine ID</label>
                        <input
                          type="text"
                          placeholder="e.g. SN-884920194"
                          value={movementForm.serial_number}
                          onChange={(e) => setMovementForm({ ...movementForm, serial_number: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Assigned Department</label>
                        <select
                          value={movementForm.department_id}
                          onChange={(e) => setMovementForm({ ...movementForm, department_id: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="">-- Select Department --</option>
                          {departmentsList.map(d => (
                            <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Assigned Custodian (Staff)</label>
                        <select
                          value={movementForm.assigned_employee_id}
                          onChange={(e) => setMovementForm({ ...movementForm, assigned_employee_id: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="">-- Select Staff Custodian --</option>
                          {employeesList.map(emp => (
                            <option key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name || ''} ({emp.employee_code})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="sm:col-span-2">
                        <label className="block font-semibold text-slate-700 mb-1">Select Existing Asset Record *</label>
                        <select
                          value={movementForm.asset_id}
                          onChange={(e) => setMovementForm({ ...movementForm, asset_id: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        >
                          <option value="">-- Choose Existing Asset --</option>
                          {existingAssetsList.map(a => (
                            <option key={a.asset_id} value={a.asset_id}>
                              {a.asset_name} ({a.asset_tag}) — Loc: {a.location || 'N/A'} [{a.asset_status}]
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================== */}
              {/* SECTION C: QUANTITY, PRICING & VENDOR */}
              {/* ============================================================== */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity Received *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1.00"
                    value={movementForm.quantity}
                    onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={movementForm.unit_cost}
                    onChange={(e) => setMovementForm({ ...movementForm, unit_cost: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier / Vendor</label>
                  <select
                    value={movementForm.vendor_id}
                    onChange={(e) => setMovementForm({ ...movementForm, vendor_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    <option value="">-- Select Vendor --</option>
                    {vendorsList.map(v => (
                      <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name} ({v.city || 'Vendor'})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Total Calculation Strip */}
              {movementForm.quantity && movementForm.unit_cost && (
                <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                  <span className="text-xs text-slate-300">Total Transaction Inward Valuation:</span>
                  <span className="text-base font-bold text-emerald-400">
                    ₹ {(parseFloat(movementForm.quantity) * (parseFloat(movementForm.unit_cost) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* ============================================================== */}
              {/* SECTION D: INVOICE DETAILS & FILE UPLOAD (User Requirement) */}
              {/* ============================================================== */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText size={15} className="text-blue-600" />
                    Invoice & Tax Document Verification
                  </span>
                  <span className="text-[11px] text-slate-500">Attach physical/e-invoice for audit proof</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2026-8812, GST-99012"
                      value={movementForm.invoice_number}
                      onChange={(e) => setMovementForm({ ...movementForm, invoice_number: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Invoice Date</label>
                    <input
                      type="date"
                      value={movementForm.invoice_date}
                      onChange={(e) => setMovementForm({ ...movementForm, invoice_date: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Upload Invoice File Component */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Upload Invoice Document (PDF / Image)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                    id="invoice-upload-input"
                  />

                  {!invoiceFile ? (
                    <label
                      htmlFor="invoice-upload-input"
                      className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center group"
                    >
                      <UploadCloud size={24} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                      <div className="text-xs font-bold text-slate-700 group-hover:text-blue-600">
                        Click to upload invoice document
                      </div>
                      <p className="text-[10.5px] text-slate-400">PDF, JPG, PNG or WEBP up to 15MB</p>
                    </label>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <FileText size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-emerald-900 text-xs truncate max-w-xs">{invoiceFileName}</div>
                          <div className="text-[10.5px] text-emerald-600">File attached & ready to submit</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveInvoiceFile}
                        className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg border border-rose-200"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ============================================================== */}
              {/* SECTION E: REFERENCES & NOTES */}
              {/* ============================================================== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PO / GRN Reference No</label>
                  <input
                    type="text"
                    placeholder="e.g. PO-8842, GRN-109"
                    value={movementForm.reference_no}
                    onChange={(e) => setMovementForm({ ...movementForm, reference_no: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch / Lot Number</label>
                  <input
                    type="text"
                    placeholder="e.g. LOT-2026-X4"
                    value={movementForm.batch_no}
                    onChange={(e) => setMovementForm({ ...movementForm, batch_no: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Remarks & Inward Inspection Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Enter goods inward remarks, gate pass ref, quality inspection notes..."
                    value={movementForm.notes}
                    onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowMovementModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordMovement}
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md"
              >
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Check size={15} />}
                <span>Confirm & Post GRN Inward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DAMAGE & RETURN MODAL */}
      {/* ========================================================================= */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-rose-600 to-red-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertOctagon size={20} className="text-rose-200" />
                <div>
                  <h3 className="text-base font-bold">Log Damaged Stock / Vendor Return (RTV)</h3>
                  <p className="text-xs text-rose-100">Record quality rejection, transit damage, expired materials, or scrap write-off</p>
                </div>
              </div>
              <button onClick={() => setShowReturnModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Raw Material *</label>
                  <select
                    value={returnForm.material_id}
                    onChange={(e) => setReturnForm({ ...returnForm, material_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none font-bold"
                  >
                    <option value="">-- Select Material --</option>
                    {materialsList.map(m => (
                      <option key={m.material_id} value={m.material_id}>{m.material_name} ({m.material_code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Incident / Return Type *</label>
                  <select
                    value={returnForm.return_type}
                    onChange={(e) => setReturnForm({ ...returnForm, return_type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    {RETURN_TYPES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Action / Disposition *</label>
                  <select
                    value={returnForm.action_taken}
                    onChange={(e) => setReturnForm({ ...returnForm, action_taken: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    {DISPOSITION_ACTIONS.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Damaged / returned qty"
                    value={returnForm.quantity}
                    onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vendor (For RMA / Credit)</label>
                  <select
                    value={returnForm.vendor_id}
                    onChange={(e) => setReturnForm({ ...returnForm, vendor_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="">-- Select Vendor --</option>
                    {vendorsList.map(v => (
                      <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reference No (RMA / Debit Note#)</label>
                  <input
                    type="text"
                    placeholder="e.g. RMA-9901, DN-402"
                    value={returnForm.reference_no}
                    onChange={(e) => setReturnForm({ ...returnForm, reference_no: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch / Lot No</label>
                  <input
                    type="text"
                    placeholder="e.g. LOT-DEFECT-1"
                    value={returnForm.batch_no}
                    onChange={(e) => setReturnForm({ ...returnForm, batch_no: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Reason Description & Inspection Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Explain damage, quality inspection failure reason..."
                    value={returnForm.reason_notes}
                    onChange={(e) => setReturnForm({ ...returnForm, reason_notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button onClick={() => setShowReturnModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 rounded-lg">Cancel</button>
              <button onClick={handleRecordReturn} disabled={submitting} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5">
                {submitting ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                <span>Log Damage / Return</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MATERIAL HISTORY MODAL */}
      {/* ========================================================================= */}
      {showHistoryModal && activeMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <History size={20} className="text-blue-400" />
                <div>
                  <h3 className="text-base font-bold">{activeMaterial.material_name}</h3>
                  <p className="text-xs text-slate-400 font-mono">Ledger History #{activeMaterial.material_code}</p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
              {itemHistoryList.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No transaction movements recorded for this item yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {itemHistoryList.map((mov) => {
                    const cfg = MOVEMENT_TYPE_CONFIG[mov.movement_type] || MOVEMENT_TYPE_CONFIG['Stock In / GRN'];
                    return (
                      <div key={mov.movement_id} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${cfg.color}`}>
                            {mov.movement_type}
                          </span>
                          <div>
                            <span className="font-mono text-slate-500">{new Date(mov.created_at).toLocaleString()}</span>
                            {mov.reference_no && <div className="text-[11px] text-slate-700">Ref: {mov.reference_no}</div>}
                            {mov.invoice_number && (
                              <div className="text-[10.5px] text-blue-600 font-mono">Inv: {mov.invoice_number}</div>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-slate-900">{parseFloat(mov.quantity).toLocaleString()} {mov.unit_of_measure}</div>
                          <div className="text-slate-500 font-medium">₹ {parseFloat(mov.total_cost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setShowHistoryModal(false)} className="px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RawMaterialsInventory;
