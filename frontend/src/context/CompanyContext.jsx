import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { companies as companyApi } from '../services/api';

const CompanyContext = createContext(null);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

export const CompanyProvider = ({ children }) => {
  const [companiesList, setCompaniesList] = useState([]);
  const [activeCompanyCode, setActiveCompanyCode] = useState(
    () => localStorage.getItem('activeCompanyId') || ''
  );
  const [businessType, setBusinessType] = useState(
    () => localStorage.getItem('erp_business_type') || 'hybrid'
  );
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await companyApi.getAll();
      if (res.data?.success && Array.isArray(res.data.data)) {
        const list = res.data.data;
        setCompaniesList(list);
        
        
        
        if (list.length > 0) {
          const currentStored = localStorage.getItem('activeCompanyId');
          const matched = list.find((c) => c.company_code === currentStored);
          
          const primary = list.slice().sort((a, b) => Number(a.company_id) - Number(b.company_id))[0];
          const selected = matched || primary;
          setActiveCompanyCode(selected.company_code);
          localStorage.setItem('activeCompanyId', selected.company_code);
          if (selected.business_type) {
            setBusinessType(selected.business_type);
            localStorage.setItem('erp_business_type', selected.business_type);
          }
        }
      } else {
        setCompaniesList([]);
      }
    } catch {
      setCompaniesList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies();

    const handleAuthChange = () => {
      fetchCompanies();
    };

    window.addEventListener('auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [fetchCompanies]);

  const switchCompany = useCallback(
    (companyCode) => {
      setActiveCompanyCode(companyCode);
      localStorage.setItem('activeCompanyId', companyCode);

      const targetComp = companiesList.find((c) => c.company_code === companyCode);
      if (targetComp?.business_type) {
        setBusinessType(targetComp.business_type);
        localStorage.setItem('erp_business_type', targetComp.business_type);
      }

      
      window.dispatchEvent(new CustomEvent('tenant-switched', { detail: { companyCode } }));
      window.dispatchEvent(new Event('storage'));
    },
    [companiesList]
  );

  const changeBusinessType = useCallback((type) => {
    setBusinessType(type);
    localStorage.setItem('erp_business_type', type);
  }, []);

  const activeCompany = useMemo(() => {
    if (!companiesList || companiesList.length === 0) {
      return {
        company_code: activeCompanyCode || '',
        company_name: '',
        business_type: businessType,
        currency: 'INR',
        currency_symbol: '₹',
        locale: 'en-IN',
      };
    }
    return (
      companiesList.find((c) => c.company_code === activeCompanyCode) || companiesList[0]
    );
  }, [companiesList, activeCompanyCode, businessType]);

  const activeCompanyCurrency = activeCompany?.currency || activeCompany?.currency_code || 'INR';
  const currencySymbol =
    activeCompany?.currency_symbol ||
    (activeCompanyCurrency === 'USD'
      ? '$'
      : activeCompanyCurrency === 'EUR'
      ? '€'
      : activeCompanyCurrency === 'GBP'
      ? '£'
      : '₹');

  const value = useMemo(
    () => ({
      companiesList,
      activeCompany,
      activeCompanyCode,
      activeCompanyCurrency,
      currencySymbol,
      businessType,
      changeBusinessType,
      isManufacturing: businessType === 'manufacturing' || businessType === 'hybrid',
      isServices: businessType === 'services' || businessType === 'hybrid',
      isTrading: businessType === 'trading' || businessType === 'hybrid',
      switchCompany,
      refreshCompanies: fetchCompanies,
      loading,
    }),
    [
      companiesList,
      activeCompany,
      activeCompanyCode,
      activeCompanyCurrency,
      currencySymbol,
      businessType,
      changeBusinessType,
      switchCompany,
      fetchCompanies,
      loading,
    ]
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

export default CompanyContext;
