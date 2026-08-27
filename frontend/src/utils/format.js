
export const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const INR2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });

const currencyFormatters = new Map();

export const getCurrencyFormatter = (currency = 'INR', locale = 'en-IN', decimals = 2) => {
  const key = `${locale}-${currency}-${decimals}`;
  if (!currencyFormatters.has(key)) {
    try {
      currencyFormatters.set(
        key,
        new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          maximumFractionDigits: decimals,
          minimumFractionDigits: decimals,
        })
      );
    } catch {
      currencyFormatters.set(key, INR2);
    }
  }
  return currencyFormatters.get(key);
};

export const fmtMoney = (v, currency = 'INR', locale = 'en-IN') => {
  if (v === null || v === undefined || v === '') return '—';
  const num = Number(v);
  if (isNaN(num)) return '—';
  return getCurrencyFormatter(currency, locale, 0).format(num);
};

export const fmtMoney2 = (v, currency = 'INR', locale = 'en-IN') => {
  if (v === null || v === undefined || v === '') return '—';
  const num = Number(v);
  if (isNaN(num)) return '—';
  return getCurrencyFormatter(currency, locale, 2).format(num);
};

export const fmtNum = (v, locale = 'en-IN') => {
  if (v === null || v === undefined || v === '') return '—';
  const num = Number(v);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat(locale).format(num);
};

export const fmtDate = (v, locale = 'en-IN') => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (v, locale = 'en-IN') => {
  if (!v) return '—';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const cx = (...args) => args.filter(Boolean).join(' ');

export const titleCase = (s) =>
  (s || '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

export default {
  INR,
  INR2,
  getCurrencyFormatter,
  fmtMoney,
  fmtMoney2,
  fmtNum,
  fmtDate,
  fmtDateTime,
  cx,
  titleCase,
};
