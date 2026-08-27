import fs from 'fs';
import path from 'path';
import pool from '../config/database.js';

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line) {
  const values = [];
  let inQuotes = false;
  let cur = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  values.push(cur.trim());
  return values;
}

export async function importCountriesCsv() {
  const csvPath = path.resolve('countries.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn('⚠️ countries.csv not found at', csvPath);
    return;
  }

  console.log('📖 Reading countries.csv...');
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(csvContent);
  console.log(`📊 Found ${rows.length} country records in CSV.`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    
    let insertedCountries = 0;
    for (const r of rows) {
      if (!r.name || !r.iso2) continue;

      const countryName = r.name;
      const countryCode = r.iso2;
      const isoCode = r.iso3 || r.iso2;
      const currencyCode = r.currency || 'USD';
      const currencySymbol = r.currency_symbol || '$';
      const phoneCode = r.phonecode ? (r.phonecode.startsWith('+') ? r.phonecode : `+${r.phonecode}`) : '+1';
      const taxSystem = countryName.toLowerCase() === 'india' ? 'GST' : 'VAT';

      await client.query(`
        INSERT INTO countries (country_name, country_code, iso_code, currency_code, currency_symbol, phone_code, tax_system, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (country_name) DO UPDATE 
        SET country_code = EXCLUDED.country_code,
            iso_code = EXCLUDED.iso_code,
            currency_code = EXCLUDED.currency_code,
            currency_symbol = EXCLUDED.currency_symbol,
            phone_code = EXCLUDED.phone_code,
            tax_system = EXCLUDED.tax_system,
            is_active = true
      `, [countryName, countryCode, isoCode, currencyCode, currencySymbol, phoneCode, taxSystem]);
      insertedCountries++;
    }

    
    const currencyMap = new Map();
    for (const r of rows) {
      if (r.currency && !currencyMap.has(r.currency)) {
        currencyMap.set(r.currency, {
          code: r.currency,
          name: r.currency_name || r.currency,
          symbol: r.currency_symbol || r.currency,
          isBase: r.currency === 'INR'
        });
      }
    }

    let insertedCurrencies = 0;
    for (const [code, c] of currencyMap.entries()) {
      await client.query(`
        INSERT INTO currencies (currency_code, currency_name, symbol, exchange_rate, is_base)
        VALUES ($1, $2, $3, 1.000000, $4)
        ON CONFLICT (currency_code) DO UPDATE 
        SET currency_name = EXCLUDED.currency_name,
            symbol = EXCLUDED.symbol,
            is_base = EXCLUDED.is_base
      `, [c.code, c.name, c.symbol, c.isBase]);
      insertedCurrencies++;
    }

    await client.query('COMMIT');
    console.log(`✅ Successfully imported ${insertedCountries} countries and ${insertedCurrencies} currencies from countries.csv into PostgreSQL!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error importing countries:', err);
  } finally {
    client.release();
  }
}

if (process.argv[1]?.includes('seed_countries.mjs')) {
  importCountriesCsv().then(() => process.exit(0));
}
