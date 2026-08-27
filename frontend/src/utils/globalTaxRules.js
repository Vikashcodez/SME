

export const GLOBAL_TAX_SYSTEMS = {
  
  IN: {
    country: "India",
    taxSystem: "GST",
    primaryTaxLabel: "GSTIN (Goods & Services Tax ID)",
    primaryTaxPlaceholder: "27AAACT2727Q1ZB",
    primaryTaxPattern: "^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$",
    primaryTaxLength: 15,
    secondaryTaxLabel: "PAN (Permanent Account Number)",
    secondaryTaxPlaceholder: "AAACT2718E",
    secondaryTaxPattern: "^[A-Z]{5}[0-9]{4}[A-Z]{1}$",
    secondaryTaxLength: 10,
    corporateRegLabel: "CIN (Corporate Identity Number)",
    corporateRegPlaceholder: "U28910MH2016PTC284912",
    currency: "INR",
    currencySymbol: "₹",
  },

  
  US: {
    country: "United States",
    taxSystem: "Sales Tax / Federal IRS",
    primaryTaxLabel: "Federal EIN (Employer ID Number)",
    primaryTaxPlaceholder: "12-3456789",
    primaryTaxPattern: "^[0-9]{2}-[0-9]{7}$",
    primaryTaxLength: 10,
    secondaryTaxLabel: "State Tax Registration / Reseller ID",
    secondaryTaxPlaceholder: "ST-98765432",
    secondaryTaxPattern: "^[A-Z0-9-]{5,15}$",
    secondaryTaxLength: 15,
    corporateRegLabel: "DUNS / State Entity Number",
    corporateRegPlaceholder: "DUNS-123456789",
    currency: "USD",
    currencySymbol: "$",
  },

  
  GB: {
    country: "United Kingdom",
    taxSystem: "HMRC VAT",
    primaryTaxLabel: "UK VAT Registration Number",
    primaryTaxPlaceholder: "GB123456789",
    primaryTaxPattern: "^(GB)?([0-9]{9}|[0-9]{12})$",
    primaryTaxLength: 11,
    secondaryTaxLabel: "UTR (Unique Taxpayer Reference)",
    secondaryTaxPlaceholder: "12345 67890",
    secondaryTaxPattern: "^[0-9]{10}$",
    secondaryTaxLength: 10,
    corporateRegLabel: "CRN (Companies House Reg No)",
    corporateRegPlaceholder: "12345678 or SC123456",
    currency: "GBP",
    currencySymbol: "£",
  },

  
  DE: {
    country: "Germany",
    taxSystem: "USt / MwSt (German VAT)",
    primaryTaxLabel: "USt-IdNr (Umsatzsteuer-ID)",
    primaryTaxPlaceholder: "DE123456789",
    primaryTaxPattern: "^DE[0-9]{9}$",
    primaryTaxLength: 11,
    secondaryTaxLabel: "Steuernummer (Tax Number)",
    secondaryTaxPlaceholder: "12/345/67890",
    secondaryTaxPattern: "^[0-9/]{10,13}$",
    secondaryTaxLength: 13,
    corporateRegLabel: "Handelsregister (HRB Number)",
    corporateRegPlaceholder: "HRB 12345 B",
    currency: "EUR",
    currencySymbol: "€",
  },

  
  FR: {
    country: "France",
    taxSystem: "TVA (French VAT)",
    primaryTaxLabel: "Numéro de TVA Intracommunautaire",
    primaryTaxPlaceholder: "FR12345678901",
    primaryTaxPattern: "^FR[0-9A-Z]{2}[0-9]{9}$",
    primaryTaxLength: 13,
    secondaryTaxLabel: "Numéro SIREN (9 digits)",
    secondaryTaxPlaceholder: "123 456 789",
    secondaryTaxPattern: "^[0-9]{9}$",
    secondaryTaxLength: 9,
    corporateRegLabel: "Numéro SIRET (14 digits)",
    corporateRegPlaceholder: "123 456 789 00014",
    currency: "EUR",
    currencySymbol: "€",
  },

  
  AE: {
    country: "United Arab Emirates",
    taxSystem: "FTA VAT",
    primaryTaxLabel: "TRN (Tax Registration Number)",
    primaryTaxPlaceholder: "100123456700003",
    primaryTaxPattern: "^100[0-9]{12}$",
    primaryTaxLength: 15,
    secondaryTaxLabel: "FTA Corporate Tax ID",
    secondaryTaxPlaceholder: "CT-12345678",
    secondaryTaxPattern: "^[A-Z0-9-]{8,15}$",
    secondaryTaxLength: 15,
    corporateRegLabel: "Trade License / Commercial Reg No",
    corporateRegPlaceholder: "CN-1234567",
    currency: "AED",
    currencySymbol: "د.إ",
  },

  
  SA: {
    country: "Saudi Arabia",
    taxSystem: "ZATCA VAT",
    primaryTaxLabel: "VAT Account Number (ZATCA TRN)",
    primaryTaxPlaceholder: "300123456700003",
    primaryTaxPattern: "^3[0-9]{14}$",
    primaryTaxLength: 15,
    secondaryTaxLabel: "Zakat & Income Tax ID",
    secondaryTaxPlaceholder: "7001234567",
    secondaryTaxPattern: "^700[0-9]{7}$",
    secondaryTaxLength: 10,
    corporateRegLabel: "Commercial Registration (CR Number)",
    corporateRegPlaceholder: "1010123456",
    currency: "SAR",
    currencySymbol: "﷼",
  },

  
  SG: {
    country: "Singapore",
    taxSystem: "IRAS GST",
    primaryTaxLabel: "GST Registration Number",
    primaryTaxPlaceholder: "M90123456X",
    primaryTaxPattern: "^[M|F][0-9]{7}[A-Z]$",
    primaryTaxLength: 9,
    secondaryTaxLabel: "UEN (Unique Entity Number)",
    secondaryTaxPlaceholder: "201512345A or T15LL1234A",
    secondaryTaxPattern: "^[0-9]{9,10}[A-Z]$",
    secondaryTaxLength: 10,
    corporateRegLabel: "ACRA Registration ID",
    corporateRegPlaceholder: "ACRA-201512345A",
    currency: "SGD",
    currencySymbol: "S$",
  },

  
  AU: {
    country: "Australia",
    taxSystem: "ATO GST",
    primaryTaxLabel: "ABN (Australian Business Number)",
    primaryTaxPlaceholder: "12 345 678 901",
    primaryTaxPattern: "^[0-9]{11}$",
    primaryTaxLength: 11,
    secondaryTaxLabel: "ACN (Australian Company Number)",
    secondaryTaxPlaceholder: "123 456 789",
    secondaryTaxPattern: "^[0-9]{9}$",
    secondaryTaxLength: 9,
    corporateRegLabel: "ASIC Corporate ID",
    corporateRegPlaceholder: "ASIC-987654",
    currency: "AUD",
    currencySymbol: "A$",
  },

  
  CA: {
    country: "Canada",
    taxSystem: "CRA GST/HST",
    primaryTaxLabel: "Business Number (BN9 + RT0001)",
    primaryTaxPlaceholder: "123456789RT0001",
    primaryTaxPattern: "^[0-9]{9}RT[0-9]{4}$",
    primaryTaxLength: 15,
    secondaryTaxLabel: "PST / QST Provincial Tax ID",
    secondaryTaxPlaceholder: "PST-1234-5678",
    secondaryTaxPattern: "^[A-Z0-9-]{8,15}$",
    secondaryTaxLength: 15,
    corporateRegLabel: "Corporation Number (IC / Provincial)",
    corporateRegPlaceholder: "CORP-123456-7",
    currency: "CAD",
    currencySymbol: "C$",
  },

  
  JP: {
    country: "Japan",
    taxSystem: "NTA Consumption Tax",
    primaryTaxLabel: "Qualified Invoice Registration No",
    primaryTaxPlaceholder: "T1234567890123",
    primaryTaxPattern: "^T[0-9]{13}$",
    primaryTaxLength: 14,
    secondaryTaxLabel: "Corporate Number (Hojin Bangou)",
    secondaryTaxPlaceholder: "1234567890123",
    secondaryTaxPattern: "^[0-9]{13}$",
    secondaryTaxLength: 13,
    corporateRegLabel: "Legal Affairs Bureau Reg No",
    corporateRegPlaceholder: "0100-01-123456",
    currency: "JPY",
    currencySymbol: "¥",
  },
};

export function getGlobalTaxStandard(countryIdentifier = "India") {
  if (!countryIdentifier) countryIdentifier = "India";
  const str = countryIdentifier.trim().toLowerCase();

  
  for (const [code, meta] of Object.entries(GLOBAL_TAX_SYSTEMS)) {
    if (code.toLowerCase() === str || meta.country.toLowerCase() === str) {
      return meta;
    }
  }

  
  return {
    country: countryIdentifier,
    taxSystem: "VAT / National Tax",
    primaryTaxLabel: "Tax Identification Number (TIN / VAT ID)",
    primaryTaxPlaceholder: "Enter national tax ID / VAT number",
    primaryTaxPattern: "^[A-Z0-9-\\s]{4,25}$",
    primaryTaxLength: 25,
    secondaryTaxLabel: "National Revenue / Tax Code",
    secondaryTaxPlaceholder: "Enter secondary tax identifier",
    secondaryTaxPattern: "^[A-Z0-9-\\s]{4,25}$",
    secondaryTaxLength: 20,
    corporateRegLabel: "National Corporate Registration / CR No",
    corporateRegPlaceholder: "Enter business registration number",
    currency: "USD",
    currencySymbol: "$",
  };
}
