import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { masterService } from "../../../services/masterService";
import { companies as companyApi } from "../../../services/api";
import { useCompany } from "../../../context/CompanyContext";
import {
  Building2, Hash, Plus, Edit2, RefreshCw, X,
  MapPin, CheckCircle2, Boxes, Scale, Users
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cx } from "../../../utils/format";
import { Button, IconButton } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { CompanyModal } from "../../../components/CompanyModal";
import { COUNTRIES_CATALOG } from "../../../utils/countriesCatalog";

export function MasterHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "company";
  const { switchCompany, activeCompanyCode, refreshCompanies } = useCompany();

  
  const [companySubTab, setCompanySubTab] = useState("companies");

  
  const [companiesList, setCompaniesList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [numberSeries, setNumberSeries] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [uomList, setUomList] = useState([]);
  const [partnersList, setPartnersList] = useState([]);
  const [dynamicCountries, setDynamicCountries] = useState(COUNTRIES_CATALOG);
  const [branchStatesList, setBranchStatesList] = useState([]);

  const [loading, setLoading] = useState(false);

  
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [branchFormData, setBranchFormData] = useState({
    branch_code: "",
    branch_name: "",
    company_code: "",
    branch_type: "Manufacturing Plant",
    country_name: "India",
    gstin: "",
    city: "",
    state: "",
    manager: "",
    phone: "",
  });

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productFormData, setProductFormData] = useState({
    product_code: "",
    product_name: "",
    category: "Finished Goods",
    hsn_code: "8483",
    unit_price: "",
    uom: "EA",
    reorder_level: "50",
    current_stock: "100",
  });

  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [partnerFormData, setPartnerFormData] = useState({
    partner_type: "customer",
    partner_code: "",
    partner_name: "",
    email: "",
    phone: "+91 ",
    tax_number: "",
    city: "Pune",
    credit_limit: "5000000",
  });

  const [isUomModalOpen, setIsUomModalOpen] = useState(false);
  const [uomFormData, setUomFormData] = useState({
    uom_code: "",
    uom_name: "",
    symbol: "",
    category: "Standard",
  });

  
  const fetchAllMasters = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, branchRes, numRes, prodRes, uomRes, countryRes, custRes, venRes] = await Promise.allSettled([
        companyApi.getAll(),
        masterService.getBranches(),
        masterService.getNumberSeriesList(),
        masterService.getProducts(),
        masterService.getUoms(),
        masterService.getCountries(),
        masterService.getCustomers(),
        masterService.getVendors(),
      ]);

      if (compRes.status === "fulfilled" && compRes.value.data?.success) {
        setCompaniesList(compRes.value.data.data || []);
      }
      if (branchRes.status === "fulfilled" && branchRes.value.data?.success) {
        setBranchesList(branchRes.value.data.data || []);
      }
      if (numRes.status === "fulfilled" && numRes.value.data?.success) {
        setNumberSeries(numRes.value.data.data || []);
      }
      if (prodRes.status === "fulfilled" && prodRes.value.data?.success) {
        setProductsList(prodRes.value.data.data || []);
      }
      if (uomRes.status === "fulfilled" && uomRes.value.data?.success) {
        setUomList(uomRes.value.data.data || []);
      }
      if (countryRes.status === "fulfilled" && countryRes.value.data?.success) {
        setDynamicCountries(countryRes.value.data.data || COUNTRIES_CATALOG);
      }

      const allPartners = [];
      if (custRes.status === "fulfilled" && custRes.value.data?.success) {
        (custRes.value.data.data || []).forEach((c) => {
          allPartners.push({
            type: "Customer",
            code: c.customer_code || c.id,
            name: c.customer_name || c.name,
            email: c.email || "—",
            phone: c.phone || "—",
            tax: c.tax_number || c.gstin || "—",
            status: "Active Customer",
          });
        });
      }
      if (venRes.status === "fulfilled" && venRes.value.data?.success) {
        (venRes.value.data.data || []).forEach((v) => {
          allPartners.push({
            type: "Supplier / Vendor",
            code: v.vendor_code || v.id,
            name: v.vendor_name || v.name,
            email: v.email || "—",
            phone: v.phone || "—",
            tax: v.tax_number || "—",
            status: "Approved Supplier",
          });
        });
      }
      setPartnersList(allPartners);
    } catch {
      
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMasters();
  }, [fetchAllMasters]);

  
  useEffect(() => {
    let isMounted = true;
    const loadBranchStates = async () => {
      const cName = branchFormData.country_name || "India";
      try {
        const res = await masterService.lookupCountry(cName);
        if (res.data?.success && isMounted) {
          const fetchedStates = res.data.data.states || [];
          setBranchStatesList(fetchedStates);
          if (fetchedStates.length > 0 && !branchFormData.state) {
            setBranchFormData((prev) => ({ ...prev, state: fetchedStates[0].state_name }));
          }
        }
      } catch {
        
      }
    };
    if (isBranchModalOpen && branchFormData.country_name) {
      loadBranchStates();
    }
    return () => { isMounted = false; };
  }, [branchFormData.country_name, isBranchModalOpen]);

  
  const handleSaveCompany = async (data) => {
    try {
      if (editingCompany) {
        const companyId = editingCompany?.company_id || editingCompany?.id || editingCompany?.company_code;
        await companyApi.update(companyId, data);
        toast.success("Company profile updated successfully");
      } else {
        await companyApi.create(data);
        toast.success("Company created successfully");
      }
      setIsCompanyModalOpen(false);
      setEditingCompany(null);
      fetchAllMasters();
      refreshCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save company");
    }
  };

  
  const handleSaveBranch = async (e) => {
    e.preventDefault();
    if (!branchFormData.branch_code || !branchFormData.branch_name) {
      toast.error("Branch Code and Branch Name are required");
      return;
    }
    try {
      if (editingBranch) {
        await masterService.updateBranch(editingBranch.branch_id || editingBranch.id, branchFormData);
        toast.success("Branch updated successfully");
      } else {
        await masterService.createBranch(branchFormData);
        toast.success("Branch created successfully");
      }
      setIsBranchModalOpen(false);
      setEditingBranch(null);
      fetchAllMasters();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save branch");
    }
  };

  
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productFormData.product_name || !productFormData.unit_price) {
      toast.error("Product Name and Unit Price are required");
      return;
    }
    try {
      await masterService.createProduct({
        product_code: productFormData.product_code || `SKU-${Date.now().toString().slice(-4)}`,
        product_name: productFormData.product_name,
        category: productFormData.category,
        hsn_code: productFormData.hsn_code,
        unit_price: Number(productFormData.unit_price),
        uom: productFormData.uom,
        reorder_level: Number(productFormData.reorder_level || 10),
        current_stock: Number(productFormData.current_stock || 0),
      });
      toast.success("Product saved successfully");
      setIsProductModalOpen(false);
      fetchAllMasters();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save product");
    }
  };

  
  const handleSavePartner = async (e) => {
    e.preventDefault();
    if (!partnerFormData.partner_name) {
      toast.error("Partner Name is required");
      return;
    }
    try {
      if (partnerFormData.partner_type === "customer") {
        await masterService.createCustomer({
          customer_code: partnerFormData.partner_code || `CUST-${Date.now().toString().slice(-4)}`,
          customer_name: partnerFormData.partner_name,
          email: partnerFormData.email,
          phone: partnerFormData.phone,
          credit_limit: Number(partnerFormData.credit_limit || 0),
          tax_number: partnerFormData.tax_number,
          city: partnerFormData.city,
        });
      } else {
        await masterService.createVendor({
          vendor_code: partnerFormData.partner_code || `VEN-${Date.now().toString().slice(-4)}`,
          vendor_name: partnerFormData.partner_name,
          email: partnerFormData.email,
          phone: partnerFormData.phone,
          tax_number: partnerFormData.tax_number,
          city: partnerFormData.city,
        });
      }
      toast.success("Business Partner saved successfully");
      setIsPartnerModalOpen(false);
      fetchAllMasters();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save partner");
    }
  };

  
  const handleSaveUom = async (e) => {
    e.preventDefault();
    if (!uomFormData.uom_code || !uomFormData.uom_name) {
      toast.error("UOM Code and Name are required");
      return;
    }
    try {
      await masterService.createUom(uomFormData);
      toast.success("UOM Standard created successfully");
      setIsUomModalOpen(false);
      fetchAllMasters();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save UOM");
    }
  };

  const headersMap = {
    company: {
      tag: "Enterprise Structure & Plants",
      title: "Company Profile, Plants & Branches",
      sub: "Manage legal entities, multi-tenant corporate accounts, branches, manufacturing plants, and organizational hierarchy.",
    },
    partners: {
      tag: "Master Data Management",
      title: "Business Partner Golden Records",
      sub: "Single unified record spanning Customers, Suppliers, OEM Contractors, and Transporters.",
    },
    products: {
      tag: "Catalog Governance",
      title: "Product & Item Catalog",
      sub: "Finished Goods, Sub-assemblies, Raw Materials, Consumables, and standard rates.",
    },
    pricelists: {
      tag: "Commercial Terms",
      title: "Price Lists & UOM Rate Cards",
      sub: "Customer-specific discount structures, currencies, and effective validity periods.",
    },
    series: {
      tag: "Numbering Sequences",
      title: "Document Number Series",
      sub: "Automated numbering rules for Invoices, Purchase Orders, GRNs, and Vouchers.",
    },
    coarules: {
      tag: "GL Architecture",
      title: "Chart of Accounts Templates (by Industry/Country)",
      sub: "Pre-configured General Ledger hierarchies tailored for Manufacturing, Services, Construction, and multi-country GAAP/IFRS standards.",
    },
    localization: {
      tag: "Global Localization",
      title: "Multi-Language & Localization Framework",
      sub: "Multi-lingual translation packs, locale date/currency formats, number-to-words currency spellout rules, and regional timezones.",
    },
    statutorytemplates: {
      tag: "Statutory Formats",
      title: "Country-Specific Statutory Templates",
      sub: "Localized tax code structures, statutory invoice print layouts, and regulatory tax return templates per regional jurisdiction.",
    },
  };

  const currentHeader = headersMap[activeTab] || headersMap.company;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2">
      
      <div className="bg-white rounded-2xl p-5 sm:p-6 text-slate-900 shadow-card border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center flex-shrink-0 shadow-xs">
              <Building2 className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-xs text-[#0D9488] font-bold uppercase tracking-[0.14em]">
                {currentHeader.tag}
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
                {currentHeader.title}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {currentHeader.sub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={fetchAllMasters}
              disabled={loading}
            >
              Refresh
            </Button>

            {activeTab === "company" && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  if (companySubTab === "branches") {
                    setEditingBranch(null);
                    setBranchFormData({
                      branch_code: "",
                      branch_name: "",
                      company_code: activeCompanyCode || (companiesList[0]?.company_code || "CO-0001"),
                      branch_type: "Manufacturing Plant",
                      country_name: "India",
                      gstin: "",
                      city: "",
                      state: "",
                      manager: "",
                      phone: "",
                    });
                    setIsBranchModalOpen(true);
                  } else {
                    setEditingCompany(null);
                    setIsCompanyModalOpen(true);
                  }
                }}
              >
                {companySubTab === "branches" ? "Add Branch" : "Create Organization"}
              </Button>
            )}

            {activeTab === "products" && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setProductFormData({
                    product_code: `SKU-00${productsList.length + 1}`,
                    product_name: "",
                    category: "Finished Goods",
                    hsn_code: "8483",
                    unit_price: "",
                    uom: "EA",
                    reorder_level: "50",
                    current_stock: "100",
                  });
                  setIsProductModalOpen(true);
                }}
              >
                Add Product
              </Button>
            )}

            {activeTab === "partners" && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setPartnerFormData({
                    partner_type: "customer",
                    partner_code: `BP-00${partnersList.length + 1}`,
                    partner_name: "",
                    email: "",
                    phone: "+91 ",
                    tax_number: "",
                    city: "Pune",
                    credit_limit: "5000000",
                  });
                  setIsPartnerModalOpen(true);
                }}
              >
                Add Business Partner
              </Button>
            )}

            {(activeTab === "pricelists" || activeTab === "uom") && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => {
                  setUomFormData({
                    uom_code: "",
                    uom_name: "",
                    symbol: "",
                    category: "Standard",
                  });
                  setIsUomModalOpen(true);
                }}
              >
                Add Unit of Measure
              </Button>
            )}
          </div>
        </div>
      </div>

      
      {activeTab === "company" && (
        <div className="space-y-4">
          
          <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-card flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setCompanySubTab("companies")}
              className={cx(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                companySubTab === "companies"
                  ? "bg-[#0D9488] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              <Building2 className="h-4 w-4" />
              <span>Legal Companies ({companiesList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCompanySubTab("branches")}
              className={cx(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
                companySubTab === "branches"
                  ? "bg-[#0D9488] text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              <MapPin className="h-4 w-4" />
              <span>Plants & Branches ({branchesList.length})</span>
            </button>
          </div>

          
          {companySubTab === "companies" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Registered Legal Entities (Tenants)
                </h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">
                  Live dynamic multi-tenant accounts loaded from PostgreSQL database
                </p>
              </div>

              {companiesList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No companies found</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Create Organization" to add your first legal entity.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Company Legal Name</th>
                        <th className="py-3 px-4">Type / Model</th>
                        <th className="py-3 px-4">Tax / GSTIN</th>
                        <th className="py-3 px-4">Jurisdiction</th>
                        <th className="py-3 px-4">Currency</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {companiesList.map((co) => (
                        <tr key={co.company_code} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#0D9488]">
                            {co.company_code}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-900">{co.company_name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{co.email_id || co.email || ""}</p>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <span className="font-medium block">{co.company_type || "Private Limited"}</span>
                            <span className="text-[10px] text-slate-400 capitalize">{co.business_type || "hybrid"}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">
                            <div>{co.gst_no || co.gstin || "—"}</div>
                            {co.pan && <div className="text-[10px] text-slate-400">PAN: {co.pan}</div>}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            <div>{co.city || "—"}, {co.state_name || co.state || "—"}</div>
                            <div className="text-[10px] text-[#0D9488] font-semibold">{co.country_name || "India"}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {co.currency_code || "INR"} ({co.currency_symbol || "₹"})
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {activeCompanyCode === co.company_code ? (
                              <Badge variant="success" size="sm">Active Tenant</Badge>
                            ) : (
                              <button
                                type="button"
                                onClick={() => switchCompany(co.company_code)}
                                className="text-[10px] font-bold text-[#0D9488] bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors cursor-pointer"
                              >
                                Switch To
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <IconButton
                              icon={Edit2}
                              label="Edit Company"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingCompany(co);
                                setIsCompanyModalOpen(true);
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          
          {companySubTab === "branches" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Plants, Warehouse Facilities &amp; Branch Offices
                </h2>
                <p className="text-xs text-[#0D9488] font-semibold mt-0.5">
                  Live operational locations linked to legal entities
                </p>
              </div>

              {branchesList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                  <MapPin className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No branches registered</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Add Branch" to set up your manufacturing plant.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Branch Code</th>
                        <th className="py-3 px-4">Plant / Facility Name</th>
                        <th className="py-3 px-4">Parent Entity</th>
                        <th className="py-3 px-4">Facility Type</th>
                        <th className="py-3 px-4">GSTIN / Tax ID</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Head / Contact</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {branchesList.map((b) => (
                        <tr key={b.branch_code} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-[#0D9488]">{b.branch_code}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{b.branch_name}</td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono text-[11px] font-bold text-slate-700 block">{b.company_code}</span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[160px] block">{b.company_name}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {b.branch_type || "Branch"}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">{b.gst_no || b.gstin || "—"}</td>
                          <td className="py-3.5 px-4 text-slate-600">{b.city || "—"}, {b.state_name || b.state || "—"}</td>
                          <td className="py-3.5 px-4 text-slate-700">
                            <div className="font-semibold">{b.manager || "—"}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{b.phone_number || b.phone || ""}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <IconButton
                              icon={Edit2}
                              label="Edit Branch"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingBranch(b);
                                setBranchFormData({
                                  branch_code: b.branch_code,
                                  branch_name: b.branch_name,
                                  company_code: b.company_code,
                                  branch_type: b.branch_type || "Manufacturing Plant",
                                  country_name: b.country_name || "India",
                                  gstin: b.gst_no || b.gstin || "",
                                  city: b.city || "",
                                  state: b.state_name || b.state || "",
                                  manager: b.manager || "",
                                  phone: b.phone_number || b.phone || "",
                                });
                                setIsBranchModalOpen(true);
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      
      {activeTab === "partners" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Business Partner Golden Records (Customers & Suppliers)
            </h2>
            <p className="text-xs text-[#0D9488] font-semibold mt-0.5">
              Unified master repository for commercial counterparties and statutory tax IDs
            </p>
          </div>

          {partnersList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No business partners found</p>
              <p className="text-xs text-slate-400 mt-1">Use the "Add Business Partner" button in the top banner to register a customer or vendor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Partner Code</th>
                    <th className="py-3 px-4">Business Name</th>
                    <th className="py-3 px-4">Partner Type</th>
                    <th className="py-3 px-4">Tax ID / GSTIN</th>
                    <th className="py-3 px-4">Contact Info</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partnersList.map((bp) => (
                    <tr key={bp.code} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">{bp.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{bp.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={cx(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                            bp.type === "Customer"
                              ? "bg-teal-50 text-teal-800 border-teal-200"
                              : "bg-blue-50 text-blue-800 border-blue-200"
                          )}
                        >
                          {bp.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{bp.tax}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <p>{bp.email}</p>
                        <p className="text-[10px] font-mono text-slate-400">{bp.phone}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {bp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      
      {activeTab === "products" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Item / Product Master Catalog
            </h2>
            <p className="text-xs text-[#0D9488] font-semibold mt-0.5">
              Live products and items loaded from PostgreSQL master catalog
            </p>
          </div>

          {productsList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <Boxes className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No products registered</p>
              <p className="text-xs text-slate-400 mt-1">Use the "Add Product" button in the top banner to register your first SKU.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Item Code</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 font-mono">HSN</th>
                    <th className="py-3 px-4 font-mono text-right">Standard Rate (₹)</th>
                    <th className="py-3 px-4 font-mono text-right">Min Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productsList.map((p) => (
                    <tr key={p.product_code || p.code} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-[#0D9488]">{p.product_code || p.code}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.product_name || p.name}</td>
                      <td className="py-3 px-4 text-slate-600">{p.category}</td>
                      <td className="py-3 px-4 font-mono text-slate-500">{p.hsn_code || p.hsn}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{Number(p.unit_price || p.stdRate || 0).toLocaleString()} / {p.uom || "EA"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {p.reorder_level || p.minStock || 0} {p.uom || "EA"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      
      {(activeTab === "pricelists" || activeTab === "uom") && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Units of Measure (UOM) Standards & Rate Cards
            </h2>
            <p className="text-xs text-[#0D9488] font-semibold mt-0.5">
              Live measurement units and decimal precision from database
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {uomList.map((uom) => (
              <div
                key={uom.uom_code || uom.code}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <span className="font-mono font-bold text-sm text-[#0D9488]">{uom.uom_code || uom.code}</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{uom.uom_name || uom.name}</p>
                  <span className="text-[10px] text-slate-500">{uom.category || "Standard"}</span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-white text-slate-700 border border-slate-200">
                  {uom.symbol || uom.uom_code}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      
      {activeTab === "series" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Document Number Sequences
              </h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">
                Automatic Voucher &amp; Invoice Serial Prefix Formatter
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Document Type</th>
                  <th className="py-3 px-4 font-mono">Prefix String</th>
                  <th className="py-3 px-4 font-mono text-right">Current Serial</th>
                  <th className="py-3 px-4">Reset Period</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {numberSeries.map((s) => (
                  <tr key={s.series_id || s.id || s.document_type} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.document_type || s.docType}</td>
                    <td className="py-3 px-4 font-mono text-[#0D9488] font-bold">{s.prefix}</td>
                    <td className="py-3 px-4 font-mono text-right font-bold text-slate-900">{s.current_number || s.nextNum || 1}</td>
                    <td className="py-3 px-4 text-slate-600">{s.reset_period || s.resetPeriod || "Fiscal Year"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => {
          setIsCompanyModalOpen(false);
          setEditingCompany(null);
        }}
        onSubmit={handleSaveCompany}
        company={editingCompany}
        title={editingCompany ? "Edit Company Profile" : "Create New Organization"}
      />

      
      {isBranchModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl border border-slate-200 shadow-modal max-w-2xl w-full overflow-hidden animate-modalIn flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center shadow-xs">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingBranch ? "Edit Plant / Branch" : "Add New Plant or Branch"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Define manufacturing location, warehouse facility, or regional office.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Branch Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={branchFormData.branch_code}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, branch_code: e.target.value })
                    }
                    placeholder="e.g. BRA-PUN-02"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Branch / Facility Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={branchFormData.branch_name}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, branch_name: e.target.value })
                    }
                    placeholder="e.g. Chakan Precision Machining Plant #02"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assigned Legal Company</label>
                  <select
                    value={branchFormData.company_code}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, company_code: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs cursor-pointer"
                  >
                    {companiesList.map((c) => (
                      <option key={c.company_code} value={c.company_code}>
                        {c.company_code} - {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Facility Type</label>
                  <select
                    value={branchFormData.branch_type}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, branch_type: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs cursor-pointer"
                  >
                    <option value="Manufacturing Plant">Manufacturing Plant</option>
                    <option value="Heavy Machining Unit">Heavy Machining Unit</option>
                    <option value="Central Warehouse">Central Warehouse</option>
                    <option value="R&D & Engineering">R&D &amp; Engineering</option>
                    <option value="Sales & Regional Office">Sales &amp; Regional Office</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={branchFormData.country_name}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, country_name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs cursor-pointer"
                  >
                    {dynamicCountries.map((c) => (
                      <option key={c.country_code || c.country_name} value={c.country_name}>
                        {c.country_name} ({c.country_code || c.iso_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">State / Province</label>
                  {branchStatesList && branchStatesList.length > 0 ? (
                    <select
                      value={branchFormData.state}
                      onChange={(e) =>
                        setBranchFormData({ ...branchFormData, state: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs cursor-pointer"
                    >
                      {branchStatesList.map((s) => (
                        <option key={s.state_code || s.state_name} value={s.state_name}>
                          {s.state_name} {s.state_code ? `(${s.state_code})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={branchFormData.state}
                      onChange={(e) =>
                        setBranchFormData({ ...branchFormData, state: e.target.value })
                      }
                      placeholder="e.g. Maharashtra"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">City / Municipality</label>
                  <input
                    type="text"
                    value={branchFormData.city}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, city: e.target.value })
                    }
                    placeholder="e.g. Pune"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Plant Head / Manager</label>
                  <input
                    type="text"
                    value={branchFormData.manager}
                    onChange={(e) =>
                      setBranchFormData({ ...branchFormData, manager: e.target.value })
                    }
                    placeholder="e.g. Sunil Deshmukh"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsBranchModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  {editingBranch ? "Update Branch" : "Save Branch"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Boxes className="h-5 w-5 text-[#0D9488]" /> Add Product / Item SKU
              </h2>
              <button type="button" onClick={() => setIsProductModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Item SKU / Code</label>
                  <input
                    type="text"
                    value={productFormData.product_code}
                    onChange={(e) => setProductFormData({ ...productFormData, product_code: e.target.value })}
                    placeholder="e.g. SKU-SHAFT-45"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Classification</label>
                  <select
                    value={productFormData.category}
                    onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-[#0D9488]"
                  >
                    <option value="Finished Goods">Finished Goods</option>
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Semi-Finished">Semi-Finished</option>
                    <option value="Standard Parts">Standard Parts</option>
                    <option value="Consumables">Consumables</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Product Description / Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={productFormData.product_name}
                  onChange={(e) => setProductFormData({ ...productFormData, product_name: e.target.value })}
                  placeholder="e.g. SS316 Precision CNC Turned Shaft 45mm"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={productFormData.hsn_code}
                    onChange={(e) => setProductFormData({ ...productFormData, hsn_code: e.target.value })}
                    placeholder="8483"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Standard Rate (₹) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    step="0.01"
                    value={productFormData.unit_price}
                    onChange={(e) => setProductFormData({ ...productFormData, unit_price: e.target.value })}
                    placeholder="450.00"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold text-right focus:ring-2 focus:ring-[#0D9488]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Unit (UOM)</label>
                  <select
                    value={productFormData.uom}
                    onChange={(e) => setProductFormData({ ...productFormData, uom: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  >
                    <option value="EA">EA (Each)</option>
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="KGS">KGS (Kilograms)</option>
                    <option value="MTR">MTR (Meters)</option>
                    <option value="BOX">BOX (Boxes)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsProductModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-[#0D9488]" /> Add Business Partner Golden Record
              </h2>
              <button type="button" onClick={() => setIsPartnerModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Partner Type</label>
                  <select
                    value={partnerFormData.partner_type}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, partner_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  >
                    <option value="customer">Customer Account</option>
                    <option value="vendor">Supplier / Vendor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Partner Code</label>
                  <input
                    type="text"
                    value={partnerFormData.partner_code}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, partner_code: e.target.value })}
                    placeholder="e.g. BP-005"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company / Entity Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={partnerFormData.partner_name}
                  onChange={(e) => setPartnerFormData({ ...partnerFormData, partner_name: e.target.value })}
                  placeholder="e.g. Bharat Forge Precision Div"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={partnerFormData.email}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, email: e.target.value })}
                    placeholder="contact@bharatforge.com"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={partnerFormData.phone}
                    onChange={(e) => setPartnerFormData({ ...partnerFormData, phone: e.target.value })}
                    placeholder="+91 20 2712 3456"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsPartnerModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save Business Partner
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {isUomModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-modal max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="h-5 w-5 text-[#0D9488]" /> Add Unit of Measure (UOM) Standard
              </h2>
              <button type="button" onClick={() => setIsUomModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUom} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">UOM Code (e.g. PCS, KGS) <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={uomFormData.uom_code}
                    onChange={(e) => setUomFormData({ ...uomFormData, uom_code: e.target.value })}
                    placeholder="e.g. SET"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold uppercase focus:ring-2 focus:ring-[#0D9488]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Display Symbol</label>
                  <input
                    type="text"
                    value={uomFormData.symbol}
                    onChange={(e) => setUomFormData({ ...uomFormData, symbol: e.target.value })}
                    placeholder="e.g. Set"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-[#0D9488]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Unit Description / Title <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={uomFormData.uom_name}
                  onChange={(e) => setUomFormData({ ...uomFormData, uom_name: e.target.value })}
                  placeholder="e.g. Complete Machine Set"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-bold focus:ring-2 focus:ring-[#0D9488]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" size="md" type="button" onClick={() => setIsUomModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Save UOM Standard
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {activeTab === "coarules" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Pre-Packaged Chart of Accounts (CoA) Templates</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Automated 4-tier GL Account Hierarchies by Industry & National Accounting Standards</p>
            </div>
            <button
              onClick={() => toast.success("Applied Manufacturing CoA Template to active entity")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              Deploy CoA Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: "COA-MFG-IND", name: "Indian Manufacturing GAAP / IndAS", accounts: 148, structure: "Assets (1000) · Liabilities (2000) · Revenue (3000) · Expenses (4000)", status: "Active Standard", focus: "BOM costing, WIP absorption, scrap accounting, GST ITC" },
              { id: "COA-EPC-IND", name: "Construction & EPC Project Accounting", accounts: 124, structure: "Work in Progress (1100) · Progress Billings (2100) · Retention Escrow", status: "Available", focus: "Percentage-of-completion, retention money, sub-contractors" },
              { id: "COA-RET-IND", name: "Retail & FMCG Omnichannel", accounts: 110, structure: "Store Cash (1010) · Merchant Receivables · Loyalty Liability", status: "Available", focus: "POS register reconciliation, multi-store stock, loyalty points" },
              { id: "COA-GCC-VAT", name: "GCC / UAE Corporate Tax & VAT CoA", accounts: 135, structure: "IFRS Standard Chart of Accounts (UAE FTA Compliant)", status: "Available", focus: "5% Standard VAT, Reverse Charge, Corporate Tax 9%" },
              { id: "COA-US-GAAP", name: "US GAAP Discrete Manufacturing", accounts: 160, structure: "Direct Material (5100) · Direct Labor · Factory Overhead", status: "Available", focus: "Standard costing variance, ASC 606 revenue recognition" },
              { id: "COA-EU-IFRS", name: "European Union IFRS / HGB Standard", accounts: 152, structure: "Kontenrahmen SKR 03 / SKR 04 Compatible", status: "Available", focus: "EU Intracommunity supplies, reverse charge VAT, DATEV export" },
            ].map((tmpl) => (
              <div key={tmpl.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded font-mono text-[10px] font-bold">
                      {tmpl.id}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{tmpl.name}</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                    {tmpl.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-mono text-[11px] bg-white p-2 rounded border border-slate-200/80">
                  {tmpl.structure}
                </p>
                <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-xs">
                  <span className="text-slate-500">{tmpl.accounts} Pre-built Ledgers</span>
                  <span className="font-bold text-[#0D9488] text-[11px]">{tmpl.focus}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      
      {activeTab === "localization" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Multi-Language & Localization Language Packs</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">User Interface Translations, Currency Number Spellout (Lakhs/Millions) & Date Formats</p>
            </div>
            <button
              onClick={() => toast.success("Language pack preferences saved and updated across session")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              Save Localization Settings
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Locale Pack</th>
                  <th className="py-2.5 px-3">Language & Region</th>
                  <th className="py-2.5 px-3">Currency Format</th>
                  <th className="py-2.5 px-3">Numbering System</th>
                  <th className="py-2.5 px-3">Date / Time Format</th>
                  <th className="py-2.5 px-3 text-center">Translation Coverage</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {[
                  { code: "en-IN", name: "English (India)", currency: "₹ (INR)", numbering: "Lakhs & Crores (1,00,000)", date: "DD/MM/YYYY (IST +5:30)", coverage: "100% (System Default)", status: "Active Default" },
                  { code: "mr-IN", name: "Marathi / मराठी (Maharashtra)", currency: "₹ (INR)", numbering: "लाख आणि कोटी", date: "DD/MM/YYYY", coverage: "98.4%", status: "Enabled" },
                  { code: "hi-IN", name: "Hindi / हिन्दी (National)", currency: "₹ (INR)", numbering: "लाख और करोड़", date: "DD/MM/YYYY", coverage: "99.1%", status: "Enabled" },
                  { code: "en-US", name: "English (United States)", currency: "$ (USD)", numbering: "Millions & Billions (1,000,000)", date: "MM/DD/YYYY (EST / PST)", coverage: "100%", status: "Enabled" },
                  { code: "en-AE", name: "English / Arabic (UAE & GCC)", currency: "AED (د.إ)", numbering: "Millions (1,000,000.00)", date: "DD/MM/YYYY (GST +4:00)", coverage: "97.5%", status: "Enabled" },
                  { code: "de-DE", name: "German / Deutsch (Germany)", currency: "€ (EUR)", numbering: "1.000.000,00", date: "DD.MM.YYYY (CET +1:00)", coverage: "96.0%", status: "Enabled" },
                ].map((loc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#0F766E]">{loc.code}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{loc.name}</td>
                    <td className="py-3 px-3 font-semibold text-slate-700">{loc.currency}</td>
                    <td className="py-3 px-3 text-slate-600">{loc.numbering}</td>
                    <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{loc.date}</td>
                    <td className="py-3 px-3 text-center font-bold text-[#0D9488]">{loc.coverage}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-bold text-[10px]">
                        {loc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      
      {activeTab === "statutorytemplates" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">Regional Statutory & Tax Templates</h2>
              <p className="text-xs text-[#0D9488] font-semibold mt-0.5">Tax codes, invoice layout formats, and compliance rulebooks per jurisdiction</p>
            </div>
            <button
              onClick={() => toast.success("New regional statutory template registered")}
              className="px-3.5 py-1.5 bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
            >
              Add Statutory Rulebook
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { country: "India (GST & TDS Engine)", rules: "CGST (9%) + SGST (9%), IGST (18%), TDS Section 194C/194Q", invoiceFormat: "GSTN Form INV-1 with IRN QR Code", authority: "CBIC / GSTN Portal" },
              { country: "United Arab Emirates (UAE FTA)", rules: "VAT 5% Standard, Zero-Rated Designated Zones, Reverse Charge", invoiceFormat: "FTA Tax Invoice with Arabic/English dual text", authority: "Federal Tax Authority (FTA)" },
              { country: "United Kingdom (HMRC MTD)", rules: "Standard 20%, Reduced 5%, Zero Rate, Reverse Charge VAT", invoiceFormat: "Making Tax Digital (MTD) compliant XML/PDF", authority: "HM Revenue & Customs" },
              { country: "United States (State Sales Tax)", rules: "Origin/Destination Nexus based State, County & City sales tax", invoiceFormat: "Standard US Commercial Sales Order & Invoice", authority: "State Depts of Revenue" },
              { country: "Singapore (IRAS GST)", rules: "GST 9% Standard, Overseas Vendor Registration (OVR)", invoiceFormat: "IRAS Compliant Tax Invoice / InvoiceNow Peppol", authority: "Inland Revenue Authority" },
              { country: "Saudi Arabia (ZATCA Fatoora)", rules: "VAT 15%, Phase 2 Electronic Invoicing Integration (ZATCA)", invoiceFormat: "ZATCA Phase 2 Cryptographic XML with B2B Stamp", authority: "ZATCA Authority" },
            ].map((st, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-900 text-sm">{st.country}</h3>
                  <span className="px-2 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-200 rounded font-mono text-[10px] font-bold">
                    Statutory
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-semibold">{st.rules}</p>
                <div className="pt-2 border-t border-slate-200/60 text-xs space-y-1">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Invoice Layout</p>
                  <p className="font-medium text-slate-800">{st.invoiceFormat}</p>
                  <p className="text-[10px] text-[#0D9488] font-bold mt-1">Regulatory Body: {st.authority}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MasterHubPage;
