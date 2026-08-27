import * as XLSX from 'xlsx';

function normalizeStr(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function stringSimilarity(s1, s2) {
  const n1 = normalizeStr(s1);
  const n2 = normalizeStr(s2);
  if (n1 === n2) return 1.0;
  if (!n1 || !n2) return 0.0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.85;

  const longer = n1.length > n2.length ? n1 : n2;
  const shorter = n1.length > n2.length ? n2 : n1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  
  let costs = [];
  for (let i = 0; i <= n1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= n2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (n1.charAt(i - 1) !== n2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[n2.length] = lastValue;
  }
  return (longerLength - costs[n2.length]) / parseFloat(longerLength);
}

export function detectFileFormat(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) return 'xlsx';
  if (name.endsWith('.xls')) return 'xls';
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.tsv') || name.endsWith('.txt')) return 'tsv';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.xml')) return 'xml';
  return 'unknown';
}

export async function parseImportFile(file) {
  const format = detectFileFormat(file);

  if (format === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    let rows = [];
    if (Array.isArray(parsed)) {
      rows = parsed;
    } else if (parsed && typeof parsed === 'object') {
      const arrayKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
      rows = arrayKey ? parsed[arrayKey] : [parsed];
    }
    const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r || {}))));
    return { headers, rows, rawCount: rows.length, format: 'JSON' };
  }

  if (format === 'xml') {
    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) throw new Error('Invalid XML document structure');

    
    const root = doc.documentElement;
    let recordNodes = Array.from(root.children);
    if (recordNodes.length === 1 && recordNodes[0].children.length > 0) {
      recordNodes = Array.from(recordNodes[0].children);
    }

    const rows = recordNodes.map(node => {
      const row = {};
      Array.from(node.children).forEach(child => {
        row[child.tagName] = child.textContent.trim();
      });
      return row;
    });

    const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r || {}))));
    return { headers, rows, rawCount: rows.length, format: 'XML' };
  }

  
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return {
    headers,
    rows,
    rawCount: rows.length,
    format: format.toUpperCase()
  };
}

export function autoMapColumns(headers, entity) {
  const mapping = {};
  const availableFields = entity.fields.filter(f => f.role !== 'hidden_audit' && f.role !== 'readonly_audit');

  headers.forEach(header => {
    const normHeader = normalizeStr(header);
    let bestMatch = null;
    let highestScore = 0;

    for (const field of availableFields) {
      
      if (field.key === header || field.name === header) {
        bestMatch = field.key;
        highestScore = 1.0;
        break;
      }

      
      const normKey = normalizeStr(field.key);
      const normName = normalizeStr(field.name);

      if (normHeader === normKey || normHeader === normName) {
        bestMatch = field.key;
        highestScore = 0.95;
        break;
      }

      
      const scoreKey = stringSimilarity(normHeader, normKey);
      const scoreName = stringSimilarity(normHeader, normName);
      const maxScore = Math.max(scoreKey, scoreName);

      if (maxScore > 0.75 && maxScore > highestScore) {
        highestScore = maxScore;
        bestMatch = field.key;
      }
    }

    if (bestMatch && highestScore >= 0.75) {
      mapping[header] = bestMatch;
    } else {
      mapping[header] = ''; 
    }
  });

  return mapping;
}

export function validateImportRows(rows, mapping, entity) {
  const validRows = [];
  const invalidRows = [];
  const validationErrors = [];

  const fieldByKey = {};
  entity.fields.forEach(f => (fieldByKey[f.key] = f));

  rows.forEach((sourceRow, rowIndex) => {
    const transformedRow = {};
    const rowErrors = [];

    
    Object.keys(mapping).forEach(sourceCol => {
      const targetKey = mapping[sourceCol];
      if (targetKey && targetKey !== '__ignore__') {
        transformedRow[targetKey] = sourceRow[sourceCol];
      }
    });

    
    entity.fields.forEach(field => {
      if (field.role === 'hidden_audit' || field.role === 'readonly_audit') return;

      const val = transformedRow[field.key];
      const isEmpty = val === undefined || val === null || String(val).trim() === '';

      if (field.required && isEmpty) {
        rowErrors.push(`Missing mandatory field: ${field.name}`);
      }

      if (!isEmpty) {
        
        if (field.ui === 'currency' || field.ui === 'decimal' || field.ui === 'integer' || field.ui === 'percent') {
          const num = Number(String(val).replace(/[^0-9.-]/g, ''));
          if (isNaN(num)) {
            rowErrors.push(`${field.name} must be a valid number`);
          } else {
            transformedRow[field.key] = num;
          }
        }

        
        if (field.ui === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))) {
          rowErrors.push(`Invalid email address format for ${field.name}`);
        }

        
        if (field.ui === 'boolean') {
          const str = String(val).toLowerCase();
          transformedRow[field.key] = str === 'true' || str === 'yes' || str === '1';
        }
      }
    });

    if (rowErrors.length === 0) {
      validRows.push(transformedRow);
    } else {
      invalidRows.push({
        rowIndex: rowIndex + 1,
        source: sourceRow,
        transformed: transformedRow,
        errors: rowErrors
      });
      validationErrors.push({
        rowIndex: rowIndex + 1,
        errors: rowErrors
      });
    }
  });

  return {
    validRows,
    invalidRows,
    validationErrors,
    isValid: invalidRows.length === 0
  };
}

export function exportErrorsToCsv(invalidRows, entityName) {
  if (!invalidRows || invalidRows.length === 0) return;

  const exportData = invalidRows.map(item => ({
    'Row #': item.rowIndex,
    'Validation Errors': item.errors.join('; '),
    ...item.source
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Failed Rows');
  XLSX.writeFile(workbook, `${entityName}_import_errors.csv`);
}
