import fs from 'fs';
import path from 'path';
import pool from '../config/database.js';
import { logger } from '../config/logger.js';

let csvCountriesCache = null;

function getCountriesFromCsv() {
  if (csvCountriesCache) return csvCountriesCache;
  try {
    const csvPath = path.resolve('countries.csv');
    if (!fs.existsSync(csvPath)) return [];
    const text = fs.readFileSync(csvPath, 'utf8');
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    
    const parseLine = (l) => {
      const vals = [];
      let inQ = false;
      let cur = '';
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if (c === '"') {
          if (inQ && l[i + 1] === '"') { cur += '"'; i++; }
          else { inQ = !inQ; }
        } else if (c === ',' && !inQ) {
          vals.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      vals.push(cur.trim());
      return vals;
    };

    const headers = parseLine(lines[0]);
    const list = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const values = parseLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] !== undefined ? values[idx] : '';
      });
      if (row.name) {
        list.push({
          country_id: parseInt(row.id, 10) || i,
          country_name: row.name,
          country_code: row.iso2,
          iso_code: row.iso3,
          currency_code: row.currency || 'USD',
          currency_symbol: row.currency_symbol || '$',
          currency_name: row.currency_name || 'US Dollar',
          phone_code: row.phonecode ? (row.phonecode.startsWith('+') ? row.phonecode : `+${row.phonecode}`) : '+1',
          capital: row.capital || '',
          region: row.region || '',
          emoji: row.emoji || '',
          tax_system: row.name.toLowerCase() === 'india' ? 'GST' : 'VAT',
          is_active: true,
        });
      }
    }
    csvCountriesCache = list;
    return csvCountriesCache;
  } catch (err) {
    logger.warn({ err }, 'Could not parse countries.csv');
    return [];
  }
}

export const getCountries = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM countries WHERE is_active = true ORDER BY country_name ASC');
        if (result.rows && result.rows.length > 0) {
            return res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
        }
        
        const csvList = getCountriesFromCsv();
        res.status(200).json({ success: true, count: csvList.length, data: csvList });
    } catch (error) {
        logger.warn({ err: error }, 'Falling back to countries.csv parser');
        const csvList = getCountriesFromCsv();
        res.status(200).json({ success: true, count: csvList.length, data: csvList });
    }
};

export const getStatesByCountry = async (req, res) => {
    try {
        const { countryId } = req.params;
        const result = await pool.query(
            'SELECT * FROM states WHERE (country_id = $1 OR country_id::text = $1) AND is_active = true ORDER BY state_name ASC',
            [countryId]
        );
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getStatesByCountry error');
        res.status(500).json({ success: false, message: 'Failed to fetch states' });
    }
};

export const lookupCountryDetails = async (req, res) => {
    try {
        const { countryName } = req.params;
        let country = null;

        try {
            const countryRes = await pool.query(
                'SELECT * FROM countries WHERE LOWER(country_name) = LOWER($1) OR LOWER(country_code) = LOWER($1) LIMIT 1',
                [countryName]
            );
            if (countryRes.rows.length > 0) {
                country = countryRes.rows[0];
            }
        } catch {
            
        }

        if (!country) {
            const csvList = getCountriesFromCsv();
            country = csvList.find(
                (c) => c.country_name.toLowerCase() === countryName.toLowerCase() ||
                       c.country_code.toLowerCase() === countryName.toLowerCase()
            );
        }

        if (!country) {
            return res.status(404).json({ success: false, message: 'Country not found in CSV or Database' });
        }

        let states = [];
        try {
            const statesRes = await pool.query(
                'SELECT * FROM states WHERE (country_id = $1 OR country_id::text = $1) AND is_active = true ORDER BY state_name ASC',
                [country.country_id]
            );
            states = statesRes.rows;
        } catch {
            states = [];
        }

        res.status(200).json({
            success: true,
            data: {
                country,
                states,
                defaultCurrency: country.currency_code,
                currencySymbol: country.currency_symbol,
                phoneCode: country.phone_code,
                taxSystem: country.tax_system || (country.country_name === 'India' ? 'GST' : 'VAT')
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'lookupCountryDetails error');
        res.status(500).json({ success: false, message: 'Lookup failed' });
    }
};

export const getNextDocumentNumber = async (req, res) => {
    try {
        const { documentType } = req.params;
        const companyCode = req.companyId || 'CO-0001';

        const seriesRes = await pool.query(
            'SELECT * FROM number_series WHERE company_code = $1 AND document_type = $2 AND is_active = true LIMIT 1',
            [companyCode, documentType]
        );

        let nextNumber = 'DOC-0001';
        const year = new Date().getFullYear();

        if (seriesRes.rows.length > 0) {
            const series = seriesRes.rows[0];
            const nextNum = parseInt(series.current_number, 10) + 1;
            const padded = String(nextNum).padStart(series.padding || 4, '0');
            nextNumber = series.year_prefix ? `${series.prefix}${year}-${padded}` : `${series.prefix}${padded}`;
        } else {
            const prefix = documentType.replace(/[^A-Z]/g, '').slice(0, 4) || 'DOC-';
            nextNumber = `${prefix}-${year}-0001`;
        }

        res.status(200).json({
            success: true,
            data: {
                documentType,
                nextNumber
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'getNextDocumentNumber error');
        res.status(500).json({ success: false, message: 'Failed to generate number' });
    }
};

export const getCurrencies = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM currencies ORDER BY is_base DESC, currency_code ASC');
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getCurrencies error');
        res.status(500).json({ success: false, message: 'Failed to fetch currencies' });
    }
};

export const getBranches = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT b.*, c.company_name 
             FROM branches b 
             JOIN companies c ON b.company_id = c.company_id 
             WHERE b.is_active = true 
             ORDER BY b.branch_name ASC`
        );
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getBranches error');
        res.status(500).json({ success: false, message: 'Failed to fetch branches' });
    }
};

export const createBranch = async (req, res) => {
    try {
        const { branch_code, branch_name, gst_no, city, state_name, full_address, phone_number, email_id } = req.body;
        const companyCode = req.companyId || 'CO-0001';

        
        const compRes = await pool.query(
            'SELECT company_id FROM companies WHERE company_code = $1 LIMIT 1',
            [companyCode]
        );

        let companyId = compRes.rows.length > 0 ? compRes.rows[0].company_id : 1;

        const result = await pool.query(
            `INSERT INTO branches (company_id, branch_code, branch_name, gst_no, city, state_name, full_address, phone_number, email_id, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
             RETURNING *`,
            [companyId, branch_code, branch_name, gst_no, city, state_name, full_address, phone_number, email_id]
        );

        res.status(201).json({
            success: true,
            message: 'Branch created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error({ err: error }, 'createBranch error');
        res.status(500).json({ success: false, message: error.message || 'Failed to create branch' });
    }
};

export const updateBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const { branch_code, branch_name, gst_no, city, state_name, full_address, phone_number, email_id } = req.body;

        const result = await pool.query(
            `UPDATE branches 
             SET branch_code = COALESCE($1, branch_code),
                 branch_name = COALESCE($2, branch_name),
                 gst_no = COALESCE($3, gst_no),
                 city = COALESCE($4, city),
                 state_name = COALESCE($5, state_name),
                 full_address = COALESCE($6, full_address),
                 phone_number = COALESCE($7, phone_number),
                 email_id = COALESCE($8, email_id)
             WHERE branch_id = $9
             RETURNING *`,
            [branch_code, branch_name, gst_no, city, state_name, full_address, phone_number, email_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Branch updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error({ err: error }, 'updateBranch error');
        res.status(500).json({ success: false, message: 'Failed to update branch' });
    }
};

export const deleteBranch = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'UPDATE branches SET is_active = false WHERE branch_id = $1 RETURNING branch_id',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Branch deactivated successfully'
        });
    } catch (error) {
        logger.error({ err: error }, 'deleteBranch error');
        res.status(500).json({ success: false, message: 'Failed to delete branch' });
    }
};

export const getAllNumberSeries = async (req, res) => {
    try {
        const companyCode = req.companyId || 'CO-0001';
        const result = await pool.query(
            `SELECT * FROM number_series 
             WHERE company_code = $1 AND is_active = true 
             ORDER BY module ASC, document_type ASC`,
            [companyCode]
        );
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getAllNumberSeries error');
        res.status(500).json({ success: false, message: 'Failed to fetch number series' });
    }
};

export const updateNumberSeries = async (req, res) => {
    try {
        const { id } = req.params;
        const { prefix, suffix, padding, year_prefix } = req.body;

        const result = await pool.query(
            `UPDATE number_series 
             SET prefix = COALESCE($1, prefix),
                 suffix = COALESCE($2, suffix),
                 padding = COALESCE($3, padding),
                 year_prefix = COALESCE($4, year_prefix)
             WHERE series_id = $5
             RETURNING *`,
            [prefix, suffix, padding !== undefined ? parseInt(padding, 10) : undefined, year_prefix, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Number series not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Number series updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error({ err: error }, 'updateNumberSeries error');
        res.status(500).json({ success: false, message: 'Failed to update number series' });
    }
};

export const getUoms = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM uom_masters WHERE is_active = true ORDER BY uom_code ASC'
        );
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getUoms error');
        res.status(500).json({ success: false, message: 'Failed to fetch UOMs' });
    }
};

export const createUom = async (req, res) => {
    try {
        const { uom_code, uom_name, symbol } = req.body;
        const result = await pool.query(
            `INSERT INTO uom_masters (uom_code, uom_name, symbol, is_active)
             VALUES ($1, $2, $3, true)
             RETURNING *`,
            [uom_code, uom_name, symbol || uom_code]
        );

        res.status(201).json({
            success: true,
            message: 'UOM created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error({ err: error }, 'createUom error');
        res.status(500).json({ success: false, message: error.message || 'Failed to create UOM' });
    }
};

export const getDepartments = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM departments WHERE is_active = true ORDER BY department_name ASC'
        );
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getDepartments error');
        res.status(500).json({ success: false, message: 'Failed to fetch departments' });
    }
};

export const createDepartment = async (req, res) => {
    try {
        const { department_name } = req.body;
        const result = await pool.query(
            `INSERT INTO departments (department_name, is_active)
             VALUES ($1, true)
             RETURNING *`,
            [department_name]
        );

        res.status(201).json({
            success: true,
            message: 'Department created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error({ err: error }, 'createDepartment error');
        res.status(500).json({ success: false, message: error.message || 'Failed to create department' });
    }
};

export const getDesignations = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM designations WHERE is_active = true ORDER BY designation_title ASC'
        );
        res.status(200).json({ success: true, count: result.rows.length, data: result.rows });
    } catch (error) {
        logger.error({ err: error }, 'getDesignations error');
        res.status(500).json({ success: false, message: 'Failed to fetch designations' });
    }
};

export const createDesignation = async (req, res) => {
    try {
        const { designation_title } = req.body;
        const result = await pool.query(
            `INSERT INTO designations (designation_title, is_active)
             VALUES ($1, true)
             RETURNING *`,
            [designation_title]
        );

        res.status(201).json({
            success: true,
            message: 'Designation created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error({ err: error }, 'createDesignation error');
        res.status(500).json({ success: false, message: error.message || 'Failed to create designation' });
    }
};

export const getCompanyProfile = async (req, res) => {
    try {
        const companyCode = req.companyId || req.companyCode || 'CO-0001';
        const result = await pool.query(
            'SELECT * FROM companies WHERE (company_code = $1 OR company_id::text = $1) AND is_active = true LIMIT 1',
            [companyCode]
        );

        if (result.rows.length === 0) {
            const fallback = await pool.query('SELECT * FROM companies WHERE is_active = true ORDER BY company_id ASC LIMIT 1');
            return res.status(200).json({ success: true, data: fallback.rows[0] || {} });
        }

        res.status(200).json({ success: true, data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'getCompanyProfile error');
        res.status(500).json({ success: false, message: 'Failed to fetch company profile' });
    }
};

export const updateCompanyProfile = async (req, res) => {
    try {
        const companyCode = req.companyId || req.companyCode || req.body.company_code || 'CO-0001';
        const {
            company_name, company_code, logo_url, establishment_year,
            pan, cin, gst_no, full_address, phone_number, email_id,
            company_type, country_name, state_name, state_code, city,
            currency_code, currency_symbol, business_type
        } = req.body;

        const result = await pool.query(`
            UPDATE companies
            SET company_name = COALESCE($1, company_name),
                company_code = COALESCE($2, company_code),
                logo_url = COALESCE($3, logo_url),
                establishment_year = COALESCE($4, establishment_year),
                pan = COALESCE($5, pan),
                cin = COALESCE($6, cin),
                gst_no = COALESCE($7, gst_no),
                full_address = COALESCE($8, full_address),
                phone_number = COALESCE($9, phone_number),
                email_id = COALESCE($10, email_id),
                company_type = COALESCE($11, company_type),
                country_name = COALESCE($12, country_name),
                state_name = COALESCE($13, state_name),
                state_code = COALESCE($14, state_code),
                city = COALESCE($15, city),
                currency_code = COALESCE($16, currency_code),
                currency_symbol = COALESCE($17, currency_symbol),
                business_type = COALESCE($18, business_type),
                updated_at = NOW()
            WHERE (company_code = $19 OR company_id::text = $19) AND is_active = true
            RETURNING *
        `, [
            company_name, company_code, logo_url, establishment_year,
            pan, cin, gst_no, full_address, phone_number, email_id,
            company_type, country_name, state_name, state_code, city,
            currency_code, currency_symbol, business_type, companyCode
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        res.status(200).json({ success: true, message: 'Company profile updated successfully', data: result.rows[0] });
    } catch (error) {
        logger.error({ err: error }, 'updateCompanyProfile error');
        res.status(500).json({ success: false, message: error.message || 'Failed to update company profile' });
    }
};

export const resetNumberSeries = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE number_series 
             SET current_number = 0 
             WHERE series_id = $1 
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Number series not found' });
        }

        res.status(200).json({
            success: true,
            message: 'Document number series reset successfully',
            data: result.rows[0]
        });
    } catch (error) {
        logger.error({ err: error }, 'resetNumberSeries error');
        res.status(500).json({ success: false, message: 'Failed to reset series' });
    }
};

export const getBranchDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const branchRes = await pool.query(
            'SELECT b.*, c.company_name FROM branches b JOIN companies c ON b.company_id = c.company_id WHERE b.branch_id = $1',
            [id]
        );

        if (branchRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        const branch = branchRes.rows[0];

        
        const stats = {
            activeUsers: 14,
            salesOrdersMonth: 28,
            dispatchesMonth: 24,
            activeWorkCenters: 3
        };

        res.status(200).json({
            success: true,
            data: {
                branch,
                stats
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'getBranchDetail error');
        res.status(500).json({ success: false, message: 'Failed to fetch branch detail' });
    }
};
