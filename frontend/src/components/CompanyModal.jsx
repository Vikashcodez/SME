import React, { useState, useEffect } from "react";
import { X, Building2, Globe, Phone, Mail, MapPin, Calendar, Sparkles } from "lucide-react";
import { Button } from "./ui/Button";
import { masterService } from "../services/masterService";
import { getGlobalTaxStandard } from "../utils/globalTaxRules";
import { COUNTRIES_CATALOG } from "../utils/countriesCatalog";

const COMPANY_TYPES = [
  "Private Limited",
  "Public Limited",
  "Limited Liability Partnership (LLP)",
  "Partnership Firm",
  "Sole Proprietorship",
  "Joint Venture",
];

const BUSINESS_TYPES = [
  { value: "hybrid", label: "Hybrid (Manufacturing & Trading)" },
  { value: "manufacturing", label: "Pure Manufacturing / Precision MES" },
  { value: "trading", label: "Wholesale Trading & Distribution" },
  { value: "services", label: "Consulting & Technical Services" },
];

export const CompanyModal = ({ isOpen, onClose, onSubmit, company, title = "Create Organization" }) => {
  const [countriesList, setCountriesList] = useState(COUNTRIES_CATALOG);
  const [statesList, setStatesList] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const [formData, setFormData] = useState({
    company_name: "",
    company_code: "",
    company_type: "Private Limited",
    business_type: "hybrid",
    establishment_year: new Date().getFullYear(),
    pan: "",
    cin: "",
    gst_no: "",
    country_name: "India",
    currency_code: "INR",
    currency_symbol: "₹",
    state_name: "",
    city: "Pune",
    full_address: "",
    phone_number: "+91 ",
    email_id: "",
    logo_url: "",
  });

  const [errors, setErrors] = useState({});
  const taxStandard = getGlobalTaxStandard(formData.country_name);

  
  useEffect(() => {
    let isMounted = true;
    const loadCountries = async () => {
      setLoadingCountries(true);
      try {
        const res = await masterService.getCountries();
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0 && isMounted) {
          setCountriesList(res.data.data);
        }
      } catch {
        
      } finally {
        if (isMounted) setLoadingCountries(false);
      }
    };

    if (isOpen) {
      loadCountries();
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  
  useEffect(() => {
    let isMounted = true;
    const fetchStates = async () => {
      if (!formData.country_name) return;
      try {
        const res = await masterService.lookupCountry(formData.country_name);
        if (res.data?.success && isMounted) {
          const { states, defaultCurrency, currencySymbol, phoneCode } = res.data.data;
          setStatesList(states || []);
          if (!company) {
            setFormData((prev) => ({
              ...prev,
              currency_code: defaultCurrency || prev.currency_code,
              currency_symbol: currencySymbol || prev.currency_symbol,
              phone_number: phoneCode ? `${phoneCode} ` : prev.phone_number,
              state_name: states && states.length > 0 ? states[0].state_name : prev.state_name,
            }));
          }
        }
      } catch {
        
      }
    };

    if (formData.country_name) {
      fetchStates();
    }
    return () => {
      isMounted = false;
    };
  }, [formData.country_name, company]);

  
  useEffect(() => {
    if (company) {
      setFormData({
        company_name: company.company_name || "",
        company_code: company.company_code || "",
        company_type: company.company_type || "Private Limited",
        business_type: company.business_type || "hybrid",
        establishment_year: company.establishment_year || new Date().getFullYear(),
        pan: company.pan || "",
        cin: company.cin || "",
        gst_no: company.gst_no || "",
        country_name: company.country_name || "India",
        currency_code: company.currency_code || company.currency || "INR",
        currency_symbol: company.currency_symbol || "₹",
        state_name: company.state_name || company.state || "",
        city: company.city || "",
        full_address: company.full_address || "",
        phone_number: company.phone_number || "+91 ",
        email_id: company.email_id || "",
        logo_url: company.logo_url || "",
      });
    } else {
      setFormData({
        company_name: "",
        company_code: "",
        company_type: "Private Limited",
        business_type: "hybrid",
        establishment_year: new Date().getFullYear(),
        pan: "",
        cin: "",
        gst_no: "",
        country_name: "India",
        currency_code: "INR",
        currency_symbol: "₹",
        state_name: "",
        city: "Pune",
        full_address: "",
        phone_number: "+91 ",
        email_id: "",
        logo_url: "",
      });
    }
    setErrors({});
  }, [company, isOpen]);

  if (!isOpen) return null;

  const handleCountryChange = async (e) => {
    const selectedCountry = e.target.value;
    const matched = countriesList.find(
      (c) => c.country_name.toLowerCase() === selectedCountry.toLowerCase()
    );

    setFormData((prev) => ({
      ...prev,
      country_name: selectedCountry,
      currency_code: matched?.currency_code || prev.currency_code,
      currency_symbol: matched?.currency_symbol || prev.currency_symbol,
      phone_number: matched?.phone_code ? `${matched.phone_code} ` : prev.phone_number,
      gst_no: "",
    }));

    if (errors.country_name) {
      setErrors((prev) => ({ ...prev, country_name: null }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.company_name.trim()) errs.company_name = "Company name is required";
    if (!formData.company_code.trim()) errs.company_code = "Company code is required";

    if (formData.gst_no && taxStandard?.primaryTaxPattern) {
      const re = new RegExp(taxStandard.primaryTaxPattern, "i");
      if (!re.test(formData.gst_no.trim())) {
        errs.gst_no = `Invalid ${taxStandard.primaryTaxLabel} format (Expected: ${taxStandard.primaryTaxPlaceholder})`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    onSubmit(formData);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-company-title"
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-modal max-w-3xl w-full overflow-hidden animate-modalIn flex flex-col max-h-[92vh]">
        
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center shadow-xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 id="modal-company-title" className="text-lg font-bold text-slate-900">
                {title || (company ? "Edit Company Profile" : "Create New Organization")}
              </h2>
              <p className="text-xs text-slate-500">
                Dynamic ISO Country metadata auto-loaded from live master data.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          
          <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0F766E] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#0D9488]" /> Country ISO Standards ({countriesList.length} Countries Available)
              </span>
              <span className="text-[11px] font-mono font-bold bg-white text-[#0D9488] px-2.5 py-0.5 rounded-lg border border-teal-200">
                {formData.currency_code} ({formData.currency_symbol}) · {formData.phone_number?.split(" ")[0]}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Select Country <span className="text-rose-500">*</span>
                </label>
                <select
                  name="country_name"
                  value={formData.country_name}
                  onChange={handleCountryChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-teal-300 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs cursor-pointer"
                  disabled={loadingCountries && countriesList.length === 0}
                >
                  {countriesList.map((c) => (
                    <option key={c.country_code || c.country_name} value={c.country_name}>
                      {c.country_name} ({c.country_code || c.iso_code}) — {c.currency_code} ({c.currency_symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  State / Province
                </label>
                {statesList && statesList.length > 0 ? (
                  <select
                    name="state_name"
                    value={formData.state_name}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs cursor-pointer"
                  >
                    {statesList.map((s) => (
                      <option key={s.state_code || s.state_name} value={s.state_name}>
                        {s.state_name} {s.state_code ? `(${s.state_code})` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="state_name"
                    value={formData.state_name}
                    onChange={handleChange}
                    placeholder="Enter state or province"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs"
                  />
                )}
              </div>
            </div>
          </div>

          
          <div>
            <h3 className="text-xs font-bold text-[#0D9488] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> 2. Corporate Identity
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Company Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  placeholder="e.g. Chandra Precision Engineering Pvt Ltd"
                  className={`w-full px-3.5 py-2.5 bg-white border ${
                    errors.company_name ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-300"
                  } rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs`}
                  required
                />
                {errors.company_name && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.company_name}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Company Code (Tenant Identifier) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="company_code"
                  value={formData.company_code}
                  onChange={handleChange}
                  placeholder="e.g. CO-0004 or CHANDRA-IND"
                  className={`w-full px-3.5 py-2.5 bg-white border font-mono ${
                    errors.company_code ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-300"
                  } rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs uppercase`}
                  required
                />
                {errors.company_code && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.company_code}</p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company Legal Structure</label>
                <select
                  name="company_type"
                  value={formData.company_type}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs cursor-pointer"
                >
                  {COMPANY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Operating Business Model</label>
                <select
                  name="business_type"
                  value={formData.business_type}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs cursor-pointer"
                >
                  {BUSINESS_TYPES.map((bt) => (
                    <option key={bt.value} value={bt.value}>
                      {bt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-[#0D9488] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> 3. Statutory & Tax Standards ({taxStandard.country} · {taxStandard.taxSystem})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {taxStandard.primaryTaxLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="gst_no"
                  value={formData.gst_no}
                  onChange={handleChange}
                  placeholder={taxStandard.primaryTaxPlaceholder}
                  maxLength={taxStandard.primaryTaxLength || 25}
                  className={`w-full px-3.5 py-2.5 bg-white border font-mono uppercase ${
                    errors.gst_no ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-300"
                  } rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs`}
                />
                {errors.gst_no && <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.gst_no}</p>}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {taxStandard.secondaryTaxLabel}
                </label>
                <input
                  type="text"
                  name="pan"
                  value={formData.pan}
                  onChange={handleChange}
                  placeholder={taxStandard.secondaryTaxPlaceholder}
                  maxLength={taxStandard.secondaryTaxLength || 20}
                  className={`w-full px-3.5 py-2.5 bg-white border font-mono uppercase ${
                    errors.pan ? "border-rose-400 ring-1 ring-rose-300" : "border-slate-300"
                  } rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs`}
                />
                {errors.pan && <p className="text-[11px] text-rose-600 font-medium mt-1">{errors.pan}</p>}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  {taxStandard.corporateRegLabel}
                </label>
                <input
                  type="text"
                  name="cin"
                  value={formData.cin}
                  onChange={handleChange}
                  placeholder={taxStandard.corporateRegPlaceholder}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Base Currency</label>
                <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold flex items-center justify-between">
                  <span>{formData.currency_code} ({formData.currency_symbol})</span>
                  <span className="text-[10px] text-slate-500 font-sans">Auto-derived from Country</span>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Establishment Year</label>
                <input
                  type="number"
                  name="establishment_year"
                  value={formData.establishment_year}
                  onChange={handleChange}
                  min={1900}
                  max={2099}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">City / Municipality</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Pune"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs"
                />
              </div>
            </div>
          </div>

          
          <div className="pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-[#0D9488] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> 4. Contact Details & Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Corporate Email Address</label>
                <input
                  type="email"
                  name="email_id"
                  value={formData.email_id}
                  onChange={handleChange}
                  placeholder="contact@chandraprecision.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="+91 20 2712 3456"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Registered Full Address</label>
                <textarea
                  name="full_address"
                  value={formData.full_address}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Plot No. 18/2, Sector 10, PCMC Industrial Zone, Bhosari, Pune, Maharashtra 411026"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D9488] shadow-xs resize-none"
                />
              </div>
            </div>
          </div>

          
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" size="md" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit">
              {company ? "Update Company Profile" : "Create Organization"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyModal;
