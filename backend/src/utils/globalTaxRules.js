

export const GLOBAL_TAX_SYSTEMS = {
  IN: {
    country: "India",
    taxSystem: "GST",
    primaryTaxLabel: "GSTIN",
    primaryTaxPattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    secondaryTaxLabel: "PAN",
    secondaryTaxPattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    currency: "INR",
  },
  US: {
    country: "United States",
    taxSystem: "Federal IRS / Sales Tax",
    primaryTaxLabel: "EIN",
    primaryTaxPattern: /^[0-9]{2}-[0-9]{7}$/,
    currency: "USD",
  },
  GB: {
    country: "United Kingdom",
    taxSystem: "HMRC VAT",
    primaryTaxLabel: "VAT",
    primaryTaxPattern: /^(GB)?([0-9]{9}|[0-9]{12})$/,
    currency: "GBP",
  },
  DE: {
    country: "Germany",
    taxSystem: "USt / MwSt",
    primaryTaxLabel: "USt-IdNr",
    primaryTaxPattern: /^DE[0-9]{9}$/,
    currency: "EUR",
  },
  AE: {
    country: "United Arab Emirates",
    taxSystem: "FTA VAT",
    primaryTaxLabel: "TRN",
    primaryTaxPattern: /^100[0-9]{12}$/,
    currency: "AED",
  },
  SA: {
    country: "Saudi Arabia",
    taxSystem: "ZATCA VAT",
    primaryTaxLabel: "VAT TRN",
    primaryTaxPattern: /^3[0-9]{14}$/,
    currency: "SAR",
  },
  SG: {
    country: "Singapore",
    taxSystem: "IRAS GST",
    primaryTaxLabel: "GST UEN",
    primaryTaxPattern: /^[0-9]{9,10}[A-Z]$/,
    currency: "SGD",
  },
  AU: {
    country: "Australia",
    taxSystem: "ATO GST",
    primaryTaxLabel: "ABN",
    primaryTaxPattern: /^[0-9]{11}$/,
    currency: "AUD",
  },
  CA: {
    country: "Canada",
    taxSystem: "CRA GST/HST",
    primaryTaxLabel: "BN9",
    primaryTaxPattern: /^[0-9]{9}RT[0-9]{4}$/,
    currency: "CAD",
  },
  JP: {
    country: "Japan",
    taxSystem: "NTA Consumption Tax",
    primaryTaxLabel: "Invoice Reg No",
    primaryTaxPattern: /^T[0-9]{13}$/,
    currency: "JPY",
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
    primaryTaxLabel: "TIN / VAT ID",
    primaryTaxPattern: /^[A-Z0-9-\s]{4,25}$/,
    currency: "USD",
  };
}
