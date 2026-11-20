import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ClipboardPaste, 
  RotateCcw,
  Sparkles,
  Info,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * ExcelImportModal - A professional Excel & Google Sheets Data Import Modal
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - title: string (e.g. "Import Products")
 * - entityName: string (e.g. "Product")
 * - columns: Array<{
 *     key: string,
 *     label: string,
 *     required?: boolean,
 *     type?: 'text' | 'number',
 *     default?: any,
 *     sample: any,
 *     description?: string
 *   }>
 * - sampleRows?: Array<Record<string, any>>
 * - onImport: (rows: Array<Record<string, any>>) => Promise<{ success: boolean, message?: string }>
 */
const ExcelImportModal = ({
  isOpen,
  onClose,
  title,
  entityName = 'Record',
  columns = [],
  sampleRows = [],
  onImport
}) => {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste'
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Build column key matching lookup (case-insensitive, ignores spaces/underscores)
  const normalizeKey = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const columnMap = useMemo(() => {
    const map = new Map();
    columns.forEach(col => {
      map.set(normalizeKey(col.key), col.key);
      map.set(normalizeKey(col.label), col.key);
    });
    return map;
  }, [columns]);

  // Match raw object keys to configured column keys
  const mapRawRowToColumns = (rawRow) => {
    const mapped = {};
    columns.forEach(col => {
      mapped[col.key] = col.default !== undefined ? col.default : '';
    });

    Object.keys(rawRow).forEach(rawKey => {
      const targetKey = columnMap.get(normalizeKey(rawKey));
      if (targetKey) {
        let val = rawRow[rawKey];
        if (typeof val === 'string') val = val.trim();
        mapped[targetKey] = val;
      }
    });

    return mapped;
  };

  // Validate a row
  const validateRow = (row) => {
    const errors = [];
    columns.forEach(col => {
      if (col.required) {
        const val = row[col.key];
        if (val === undefined || val === null || String(val).trim() === '') {
          errors.push(`${col.label} is required`);
        }
      }
    });
    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Process rows with validation status
  const validatedRows = useMemo(() => {
    return parsedRows.map((row, index) => {
      const val = validateRow(row);
      return {
        _index: index,
        _isValid: val.isValid,
        _errors: val.errors,
        ...row
      };
    });
  }, [parsedRows, columns]);

  const validCount = validatedRows.filter(r => r._isValid).length;
  const invalidCount = validatedRows.length - validCount;

  // Download Excel Template
  const handleDownloadTemplate = (format = 'xlsx') => {
    try {
      const dataToExport = sampleRows && sampleRows.length > 0 
        ? sampleRows 
        : [
            columns.reduce((acc, col) => {
              acc[col.label] = col.sample !== undefined ? col.sample : '';
              return acc;
            }, {})
          ];

      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Auto-fit column widths
      const colWidths = columns.map(col => ({
        wch: Math.max(col.label.length, 14) + 4
      }));
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${entityName} Template`);

      const filename = `${entityName}_Import_Template.${format}`;
      if (format === 'csv') {
        XLSX.writeFile(wb, filename, { bookType: 'csv' });
      } else {
        XLSX.writeFile(wb, filename, { bookType: 'xlsx' });
      }
      toast.success(`Template downloaded: ${filename}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate template.');
    }
  };

  // Handle Excel File Upload
  const handleFileUpload = (selectedFile) => {
    if (!selectedFile) return;
    const name = selectedFile.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      toast.error('Please upload an Excel file (.xlsx, .xls) or CSV file (.csv)');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (json.length === 0) {
          toast.error('The uploaded file contains no data rows.');
          return;
        }

        const mapped = json.map(row => mapRawRowToColumns(row));
        setParsedRows(mapped);
        toast.success(`Loaded ${mapped.length} row(s) from ${selectedFile.name}`);
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse Excel file. Please ensure it is not corrupt.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Handle Drag & Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle Paste from Google Sheets / Excel
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      toast.error('Please paste data into the box first.');
      return;
    }

    try {
      // Split into lines
      const lines = pastedText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length === 0) {
        toast.error('No lines detected in pasted text.');
        return;
      }

      // Check if delimiter is tab (Google Sheets/Excel) or comma
      const firstLine = lines[0];
      const delimiter = firstLine.includes('\t') ? '\t' : ',';

      const parseLine = (line) => line.split(delimiter).map(cell => cell.replace(/^"(.*)"$/, '$1').trim());
      const headerCandidates = parseLine(firstLine);

      // Check if the first line looks like header names
      let matchCount = 0;
      headerCandidates.forEach(h => {
        if (columnMap.has(normalizeKey(h))) matchCount++;
      });

      let dataLines = lines;
      let headers = [];

      if (matchCount >= 1 || lines.length > 1) {
        // First line is header
        headers = headerCandidates;
        dataLines = lines.slice(1);
      } else {
        // Fallback to configured columns order
        headers = columns.map(c => c.label);
      }

      if (dataLines.length === 0) {
        toast.error('Only headers found, no data rows to import.');
        return;
      }

      const rows = dataLines.map(line => {
        const cells = parseLine(line);
        const rawRow = {};
        headers.forEach((h, i) => {
          rawRow[h] = cells[i] || '';
        });
        return mapRawRowToColumns(rawRow);
      });

      setParsedRows(rows);
      toast.success(`Successfully parsed ${rows.length} row(s) from clipboard.`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse pasted data.');
    }
  };

  // Inline Cell Edit
  const handleCellChange = (rowIndex, columnKey, value) => {
    setParsedRows(prev => {
      const next = [...prev];
      next[rowIndex] = {
        ...next[rowIndex],
        [columnKey]: value
      };
      return next;
    });
  };

  // Remove Row
  const handleRemoveRow = (rowIndex) => {
    setParsedRows(prev => prev.filter((_, idx) => idx !== rowIndex));
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setPastedText('');
    setParsedRows([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit to Backend
  const handleSubmit = async () => {
    const validRowsToImport = validatedRows
      .filter(r => r._isValid)
      .map(({ _index, _isValid, _errors, ...cleanRow }) => cleanRow);

    if (validRowsToImport.length === 0) {
      toast.error('No valid rows found to import. Please correct required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await onImport(validRowsToImport);
      if (res?.success) {
        toast.success(res.message || `Successfully imported ${validRowsToImport.length} ${entityName}(s)!`);
        onClose();
      } else {
        toast.error(res?.message || 'Failed to import records.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || 'Import failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{title || `Import ${entityName}s`}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  Excel & Google Sheets
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Download the formatted template, fill in your records, or paste directly from Google Sheets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Step 1: Download Template Banner */}
          <div className="p-4 rounded-xl bg-linear-to-r from-emerald-50/80 via-teal-50/50 to-slate-50 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700 mt-0.5">
                <Download size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Step 1: Download the Official {entityName} Template
                </h4>
                <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                  Contains all pre-configured column headers, sample data, and formatting rules. Fill it out in Microsoft Excel or Google Sheets.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadTemplate('xlsx')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet size={15} />
                <span>Download .xlsx</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadTemplate('csv')}
                className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download size={14} />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Step 2: Upload or Paste Tabs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>Step 2: Choose Data Source</span>
                {parsedRows.length > 0 && (
                  <span className="text-xs font-normal text-slate-500">
                    ({parsedRows.length} rows loaded)
                  </span>
                )}
              </h4>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UploadCloud size={14} />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'paste' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ClipboardPaste size={14} />
                  <span>Paste from Google Sheets</span>
                </button>
              </div>
            </div>

            {/* Tab 1: File Upload */}
            {activeTab === 'upload' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-8 border-2 border-dashed rounded-xl text-center transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100/70 text-emerald-600 flex items-center justify-center mb-3">
                  <UploadCloud size={24} />
                </div>
                <h5 className="text-sm font-bold text-slate-800">
                  {file ? file.name : 'Drag & drop your Excel or CSV file here'}
                </h5>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-xs inline-flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>Browse Local Files</span>
                </button>
              </div>
            )}

            {/* Tab 2: Paste from Google Sheets */}
            {activeTab === 'paste' && (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Click here and press Ctrl+V to paste cells directly from Google Sheets or Excel..."
                    className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
                  />
                  <div className="absolute top-2.5 right-3 text-2xs text-slate-400 bg-white/90 px-2 py-0.5 rounded border border-slate-200">
                    Tab or Comma separated
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Pro-tip: Include the header row from your Google Sheet for automated column matching.
                  </span>
                  <button
                    type="button"
                    onClick={handleParsePastedText}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm inline-flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <ClipboardPaste size={14} />
                    <span>Parse Pasted Data</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Step 3: Interactive Data Preview Grid */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <span>Step 3: Preview & Validate Data</span>
                    <span className="text-xs font-normal text-slate-500">
                      (Click any cell to edit directly)
                    </span>
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                    Total: {parsedRows.length}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>Valid: {validCount}</span>
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-semibold border border-amber-200 flex items-center gap-1">
                      <AlertCircle size={13} />
                      <span>Issues: {invalidCount}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                    title="Clear All Rows"
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                <div className="max-h-72 overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="p-2.5 w-10 text-center text-slate-400 font-semibold">#</th>
                        <th className="p-2.5 w-24 text-center font-semibold">Status</th>
                        {columns.map(col => (
                          <th key={col.key} className="p-2.5 min-w-[140px] whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <span>{col.label}</span>
                              {col.required && <span className="text-rose-500 font-bold">*</span>}
                            </div>
                          </th>
                        ))}
                        <th className="p-2.5 w-12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validatedRows.map((row, rIdx) => (
                        <tr 
                          key={row._index}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            !row._isValid ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td className="p-2.5 text-center text-slate-400 font-mono text-2xs">
                            {rIdx + 1}
                          </td>
                          <td className="p-2.5 text-center">
                            {row._isValid ? (
                              <span className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={11} />
                                <span>Ready</span>
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 cursor-help"
                                title={row._errors.join(', ')}
                              >
                                <AlertCircle size={11} />
                                <span>Invalid</span>
                              </span>
                            )}
                          </td>
                          {columns.map(col => (
                            <td key={col.key} className="p-1.5">
                              <input
                                type={col.type === 'number' ? 'number' : 'text'}
                                value={row[col.key] !== undefined ? row[col.key] : ''}
                                onChange={(e) => handleCellChange(rIdx, col.key, e.target.value)}
                                className={`w-full px-2 py-1 text-xs rounded border transition-colors ${
                                  col.required && (!row[col.key] || String(row[col.key]).trim() === '')
                                    ? 'border-amber-400 bg-amber-50/60 focus:bg-white'
                                    : 'border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white bg-transparent'
                                }`}
                              />
                            </td>
                          ))}
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(rIdx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete Row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {invalidCount > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0 text-amber-600" />
                    <span>
                      {invalidCount} row(s) have missing required fields (highlighted in yellow). You can edit the values directly in the table above, or proceed to import only the {validCount} valid row(s).
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-3">
            {parsedRows.length > 0 && (
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                {validCount} ready to insert
              </span>
            )}
            <button
              type="button"
              disabled={validCount === 0 || submitting}
              onClick={handleSubmit}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet size={15} />
                  <span>Import {validCount > 0 ? `${validCount} ${entityName}(s)` : `Data`} to Database</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExcelImportModal;
