import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  ArrowRight,
  Plus,
  Table,
  Image as ImageIcon,
  Camera,
  Link2,
  Copy,
  ExternalLink,
  Globe,
  HelpCircle,
  Check,
  Eye,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadMedia } from '../services/api';

/**
 * ExcelImportModal - An Interactive Excel & Google Sheets Workstation
 *
 * Features:
 * 1. Interactive Excel-like Spreadsheet Grid with inline cell typing and keyboard navigation.
 * 2. Active cell & formula bar (e.g. B2, cell editor, column metadata).
 * 3. In-cell image uploader with instant file upload, URL support & live thumbnail preview.
 * 4. Smart Primary Key / Foreign Key auto-resolver badges (resolves PAN, GSTIN, code, or name).
 * 5. Excel File Import (.xlsx, .xls, .csv) with auto template generation.
 * 6. Direct Google Sheets Import (public sheet URL fetch + copy-paste tabular grid).
 * 7. Live validation with error indicators and row add/duplicate/remove controls.
 */
const ExcelImportModal = ({
  isOpen,
  onClose,
  title,
  entityName = 'Record',
  columns = [],
  sampleRows = [],
  sampleData = [], // backward compatibility alias
  onImport
}) => {
  // Tabs: 'grid' (Workstation), 'upload' (Excel file), 'sheets' (Google Sheets)
  const [activeTab, setActiveTab] = useState('grid');
  const [file, setFile] = useState(null);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [fetchingSheet, setFetchingSheet] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showFkGuide, setShowFkGuide] = useState(false);
  const [activeCell, setActiveCell] = useState({ row: 0, colKey: columns[0]?.key || '' });
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadingCell, setUploadingCell] = useState(null); // { row, colKey }
  
  const fileInputRef = useRef(null);
  const cellFileInputRef = useRef(null);
  const cellTargetRef = useRef(null); // tracks { row, colKey } for file picker

  // Normalize effective samples
  const effectiveSamples = useMemo(() => {
    if (sampleRows && sampleRows.length > 0) return sampleRows;
    if (sampleData && sampleData.length > 0) return sampleData;
    return [];
  }, [sampleRows, sampleData]);

  // Build column key matching lookup (case-insensitive, ignores non-alphanumerics)
  const normalizeKey = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const columnMap = useMemo(() => {
    const map = new Map();
    columns.forEach(col => {
      map.set(normalizeKey(col.key), col.key);
      map.set(normalizeKey(col.label), col.key);
    });
    return map;
  }, [columns]);

  // Generate Excel Column Letters (0 -> A, 1 -> B, ..., 26 -> AA)
  const getColumnLetter = (index) => {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // Helper to check if a column represents a foreign key relation
  const isForeignKeyColumn = (col) => {
    if (col.isForeignKey || col.isRelation || col.relationEntity) return true;
    const key = normalizeKey(col.key);
    const label = normalizeKey(col.label);
    const fkPatterns = ['branch', 'party', 'customer', 'vendor', 'department', 'role', 'parentgroup', 'rawmaterial', 'category'];
    return fkPatterns.some(p => key.includes(p) || label.includes(p));
  };

  // Helper to check if a column represents an image/photo
  const isImageColumn = (col) => {
    if (col.type === 'image') return true;
    const key = normalizeKey(col.key);
    const label = normalizeKey(col.label);
    return key.includes('photo') || key.includes('image') || label.includes('photo') || label.includes('image');
  };

  // Create a blank row based on configured columns
  const createBlankRow = () => {
    const row = {};
    columns.forEach(col => {
      row[col.key] = col.default !== undefined ? col.default : '';
    });
    return row;
  };

  // Initialize with blank rows when modal opens if empty
  useEffect(() => {
    if (isOpen && parsedRows.length === 0) {
      const initial = Array.from({ length: 4 }, () => createBlankRow());
      setParsedRows(initial);
      if (columns[0]?.key) {
        setActiveCell({ row: 0, colKey: columns[0].key });
      }
    }
  }, [isOpen]);

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

  // Check if a row is completely empty
  const isRowEmpty = (row) => {
    return columns.every(col => {
      const val = row[col.key];
      return val === undefined || val === null || String(val).trim() === '';
    });
  };

  // Process rows with validation status (filters empty rows during final submission)
  const validatedRows = useMemo(() => {
    return parsedRows.map((row, index) => {
      const empty = isRowEmpty(row);
      const val = validateRow(row);
      return {
        _index: index,
        _isEmpty: empty,
        _isValid: !empty && val.isValid,
        _errors: empty ? ['Row is blank'] : val.errors,
        ...row
      };
    });
  }, [parsedRows, columns]);

  const validCount = validatedRows.filter(r => r._isValid).length;
  const invalidCount = validatedRows.filter(r => !r._isEmpty && !r._isValid).length;

  // Active cell value for formula bar
  const activeCellValue = useMemo(() => {
    if (activeCell.row >= 0 && activeCell.row < parsedRows.length && activeCell.colKey) {
      return parsedRows[activeCell.row]?.[activeCell.colKey] ?? '';
    }
    return '';
  }, [activeCell, parsedRows]);

  const activeColumn = useMemo(() => {
    return columns.find(c => c.key === activeCell.colKey) || columns[0];
  }, [activeCell, columns]);

  // Active cell coordinate string (e.g. "B2")
  const activeCellCoordinate = useMemo(() => {
    const colIdx = columns.findIndex(c => c.key === activeCell.colKey);
    if (colIdx >= 0) {
      return `${getColumnLetter(colIdx)}${activeCell.row + 1}`;
    }
    return 'A1';
  }, [activeCell, columns]);

  // Download Excel / CSV Template
  const handleDownloadTemplate = (format = 'xlsx') => {
    try {
      const dataToExport = effectiveSamples.length > 0 
        ? effectiveSamples 
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
        setActiveTab('grid');
        toast.success(`Loaded ${mapped.length} row(s) from ${selectedFile.name} into Excel Grid!`);
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse Excel file. Please ensure it is not corrupt.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  // Handle Drag & Drop for file upload
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

  // Handle Google Sheet URL Fetch
  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) {
      toast.error('Please paste a Google Sheets URL first.');
      return;
    }

    const match = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      toast.error('Invalid Google Sheets URL. Please copy a link from docs.google.com/spreadsheets/d/...');
      return;
    }

    const sheetId = match[1];
    const gidMatch = googleSheetUrl.match(/[#&?]gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    // Google Sheets public CSV export endpoints
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;

    setFetchingSheet(true);
    try {
      let csvData = null;
      try {
        const res = await fetch(exportUrl);
        if (res.ok) {
          csvData = await res.text();
        }
      } catch (e1) {
        // Fallback to gviz endpoint
        try {
          const res2 = await fetch(gvizUrl);
          if (res2.ok) {
            csvData = await res2.text();
          }
        } catch (e2) {
          console.warn('Direct fetch blocked by CORS', e2);
        }
      }

      if (!csvData) {
        toast.error('Unable to fetch Google Sheet directly (cross-origin restrictions). Please make sure the sheet is public ("Anyone with the link can view"), or use the Copy & Paste tab below!');
        return;
      }

      const workbook = XLSX.read(csvData, { type: 'string' });
      const firstSheet = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheet];
      const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (json.length === 0) {
        toast.error('The Google Sheet contains no data rows.');
        return;
      }

      const mapped = json.map(row => mapRawRowToColumns(row));
      setParsedRows(mapped);
      setActiveTab('grid');
      toast.success(`Successfully fetched ${mapped.length} row(s) from Google Sheets!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to import Google Sheet. Please check permissions or use Copy-Paste.');
    } finally {
      setFetchingSheet(false);
    }
  };

  // Handle Tabular Paste from Google Sheets / Excel Clipboard
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      toast.error('Please paste data into the box first.');
      return;
    }

    try {
      const lines = pastedText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length === 0) {
        toast.error('No lines detected in pasted text.');
        return;
      }

      const firstLine = lines[0];
      const delimiter = firstLine.includes('\t') ? '\t' : ',';

      const parseLine = (line) => line.split(delimiter).map(cell => cell.replace(/^"(.*)"$/, '$1').trim());
      const headerCandidates = parseLine(firstLine);

      let matchCount = 0;
      headerCandidates.forEach(h => {
        if (columnMap.has(normalizeKey(h))) matchCount++;
      });

      let dataLines = lines;
      let headers = [];

      if (matchCount >= 1 || lines.length > 1) {
        headers = headerCandidates;
        dataLines = lines.slice(1);
      } else {
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
      setActiveTab('grid');
      toast.success(`Parsed ${rows.length} row(s) from clipboard into Excel Grid!`);
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

  // Add 1 Blank Row
  const handleAddRow = () => {
    setParsedRows(prev => [...prev, createBlankRow()]);
    setActiveCell({ row: parsedRows.length, colKey: columns[0]?.key || '' });
  };

  // Add 5 Blank Rows
  const handleAdd5Rows = () => {
    setParsedRows(prev => [
      ...prev,
      ...Array.from({ length: 5 }, () => createBlankRow())
    ]);
  };

  // Load Sample Rows
  const handleLoadSampleData = () => {
    if (effectiveSamples.length > 0) {
      const mapped = effectiveSamples.map(sample => mapRawRowToColumns(sample));
      setParsedRows(mapped);
      toast.success(`Loaded ${mapped.length} sample record(s) into grid.`);
    } else {
      const sample = createBlankRow();
      columns.forEach(c => {
        if (c.sample !== undefined) sample[c.key] = c.sample;
      });
      setParsedRows([sample]);
      toast.success('Loaded 1 sample record.');
    }
    setActiveTab('grid');
  };

  // Duplicate Row
  const handleDuplicateRow = (rowIndex) => {
    setParsedRows(prev => {
      const target = { ...prev[rowIndex] };
      const next = [...prev];
      next.splice(rowIndex + 1, 0, target);
      return next;
    });
    toast.success(`Row #${rowIndex + 1} duplicated.`);
  };

  // Remove Row
  const handleRemoveRow = (rowIndex) => {
    setParsedRows(prev => {
      const filtered = prev.filter((_, idx) => idx !== rowIndex);
      return filtered.length > 0 ? filtered : [createBlankRow()];
    });
  };

  // Clear Grid
  const handleClearAll = () => {
    setFile(null);
    setPastedText('');
    setParsedRows([createBlankRow()]);
    setActiveCell({ row: 0, colKey: columns[0]?.key || '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Grid cleared.');
  };

  // Trigger file picker for in-cell image upload
  const triggerImageUploadForCell = (rowIndex, colKey) => {
    cellTargetRef.current = { row: rowIndex, colKey };
    if (cellFileInputRef.current) {
      cellFileInputRef.current.value = '';
      cellFileInputRef.current.click();
    }
  };

  // Handle Image File Selected for a Cell
  const handleCellImageFilePicked = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !cellTargetRef.current) return;
    const { row, colKey } = cellTargetRef.current;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file (JPEG, PNG, WEBP, etc.)');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setUploadingCell({ row, colKey });
    try {
      const res = await uploadMedia(formData);
      if (res.data?.success && res.data?.url) {
        handleCellChange(row, colKey, res.data.url);
        toast.success(`Image uploaded for Row #${row + 1}!`);
      } else {
        toast.error(res.data?.message || 'Failed to upload image.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error uploading image.');
    } finally {
      setUploadingCell(null);
    }
  };

  // Handle cell keyboard navigation (Enter moves to next row in same column)
  const handleKeyDown = (e, rowIndex, colIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (rowIndex + 1 < parsedRows.length) {
        setActiveCell({ row: rowIndex + 1, colKey: columns[colIndex].key });
      } else {
        // Auto-add new row when pressing enter at bottom
        handleAddRow();
      }
    }
  };

  // Submit to Backend
  const handleSubmit = async () => {
    const validRowsToImport = validatedRows
      .filter(r => r._isValid && !r._isEmpty)
      .map(({ _index, _isEmpty, _isValid, _errors, ...cleanRow }) => cleanRow);

    if (validRowsToImport.length === 0) {
      toast.error('No valid rows found to import. Please check required fields in the table.');
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      
      {/* Hidden file picker for in-cell image uploads */}
      <input
        type="file"
        ref={cellFileInputRef}
        onChange={handleCellImageFilePicked}
        accept="image/*"
        className="hidden"
      />

      {/* Floating Image Zoom Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-white rounded-2xl p-2 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-h-[75vh] w-auto mx-auto object-contain rounded-xl"
              onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=Image+Load+Error'; }}
            />
            <div className="p-3 flex items-center justify-between border-t border-slate-100 mt-2 bg-slate-50">
              <span className="text-xs font-mono text-slate-500 truncate max-w-md">{previewImage}</span>
              <button 
                onClick={() => setPreviewImage(null)}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workstation Window */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-linear-to-r from-emerald-700 via-teal-700 to-slate-800 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-xs">
              <FileSpreadsheet size={22} className="text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  {title || `${entityName} Import Workstation`}
                </h2>
                <span className="text-2xs px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 font-semibold border border-emerald-400/30">
                  Spreadsheet UI
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 hidden sm:block">
                Type directly in the Excel grid, upload images in cells, or import from Google Sheets & Excel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Foreign Key Guide Toggle */}
            <button
              type="button"
              onClick={() => setShowFkGuide(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                showFkGuide 
                  ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-sm' 
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title="Learn how PAN, GST, Code & Name auto-link relations"
            >
              <Link2 size={14} className={showFkGuide ? 'text-slate-900' : 'text-amber-300'} />
              <span className="hidden md:inline">Smart Key Resolver Guide</span>
              <span className="md:hidden">Keys</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors cursor-pointer"
              title="Close Workstation"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center bg-slate-200/80 p-1 rounded-xl border border-slate-300 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('grid')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'grid' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Table size={15} />
              <span>Excel Grid Sheet</span>
              <span className={`text-2xs px-1.5 py-0.2 rounded-full font-semibold ${
                activeTab === 'grid' ? 'bg-emerald-700 text-white' : 'bg-slate-300 text-slate-700'
              }`}>
                {parsedRows.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'upload' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <UploadCloud size={15} />
              <span>Excel File Import (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sheets')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'sheets' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Globe size={15} />
              <span>Google Sheets Import</span>
            </button>
          </div>

          {/* Quick Template Download Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadTemplate('xlsx')}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-300 hover:border-emerald-400 text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download pre-formatted Excel template"
            >
              <Download size={13} />
              <span>Download .xlsx Template</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadTemplate('csv')}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1 transition-all cursor-pointer"
              title="Download CSV template"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Smart Foreign Key Resolver Guide Drawer */}
        {showFkGuide && (
          <div className="p-4 bg-linear-to-r from-amber-50 via-yellow-50 to-orange-50 border-b border-amber-200 text-slate-800 text-xs animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-200 text-amber-900 font-bold shrink-0">
                  <Link2 size={18} />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>⚡ Smart Primary Key & Foreign Key Auto-Linking</span>
                    <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      Zero ID Memorization
                    </span>
                  </h4>
                  <p className="text-slate-700 max-w-4xl leading-relaxed">
                    You don't need to look up internal numerical database IDs! Type any unique business identifier in the column, and the backend automatically matches and links the corresponding primary key:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono text-2xs">
                    <div className="p-2 bg-white/90 rounded-lg border border-amber-200 shadow-2xs">
                      <span className="font-bold text-amber-900 block">Parties / Vendors:</span>
                      <span>Type Party Name, GSTIN, PAN Number, or Phone</span>
                    </div>
                    <div className="p-2 bg-white/90 rounded-lg border border-amber-200 shadow-2xs">
                      <span className="font-bold text-amber-900 block">Branches:</span>
                      <span>Type Branch Name or Branch Code (e.g. "Main Plant")</span>
                    </div>
                    <div className="p-2 bg-white/90 rounded-lg border border-amber-200 shadow-2xs">
                      <span className="font-bold text-amber-900 block">Departments & Roles:</span>
                      <span>Type Department Name or Role Title</span>
                    </div>
                    <div className="p-2 bg-white/90 rounded-lg border border-amber-200 shadow-2xs">
                      <span className="font-bold text-amber-900 block">Products / Materials:</span>
                      <span>Type Item Name or Item Code (e.g. "PRD-1001")</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFkGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">

          {/* TAB 1: INTERACTIVE EXCEL GRID WORKSTATION */}
          {activeTab === 'grid' && (
            <div className="space-y-3">
              
              {/* Formula & Active Cell Bar (Authentic Excel Experience) */}
              <div className="p-2.5 rounded-xl bg-white border border-slate-300 shadow-2xs flex flex-wrap items-center gap-3">
                {/* Active Cell Coordinates */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-mono font-bold text-xs border border-emerald-300 shadow-2xs">
                    {activeCellCoordinate}
                  </span>
                  <div className="text-2xs font-semibold px-2 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 max-w-[160px] truncate">
                    {isForeignKeyColumn(activeColumn) && <Link2 size={11} className="text-amber-600 shrink-0" />}
                    {isImageColumn(activeColumn) && <ImageIcon size={11} className="text-indigo-600 shrink-0" />}
                    <span className="truncate">{activeColumn.label}</span>
                    {activeColumn.required && <span className="text-rose-500 font-bold">*</span>}
                  </div>
                </div>

                {/* Formula / Cell Input */}
                <div className="flex-1 min-w-[200px] flex items-center bg-slate-50 rounded-lg border border-slate-300 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-200 transition-all px-2.5 py-1">
                  <span className="text-slate-400 font-mono text-xs select-none pr-2 border-r border-slate-200 mr-2">
                    fx
                  </span>
                  <input
                    type="text"
                    value={activeCellValue}
                    onChange={(e) => {
                      if (activeCell.row >= 0 && activeCell.row < parsedRows.length && activeCell.colKey) {
                        handleCellChange(activeCell.row, activeCell.colKey, e.target.value);
                      }
                    }}
                    placeholder={`Type value for ${activeColumn.label}...`}
                    className="w-full bg-transparent text-xs text-slate-800 outline-hidden font-sans"
                  />
                </div>

                {/* Grid Management Ribbon Tools */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                    title="Add 1 blank row"
                  >
                    <Plus size={14} />
                    <span>Row</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAdd5Rows}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                    title="Add 5 blank rows"
                  >
                    <Plus size={14} />
                    <span>5 Rows</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                    title="Fill table with sample data"
                  >
                    <Sparkles size={13} className="text-amber-500" />
                    <span>Sample Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Clear All Rows"
                  >
                    <RotateCcw size={15} />
                  </button>
                </div>
              </div>

              {/* Grid Statistics Bar */}
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Table size={14} className="text-emerald-600" />
                    <span>Spreadsheet Workspace</span>
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500 font-medium">
                    Total Rows: <b>{parsedRows.length}</b>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Ready: {validCount}</span>
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200 flex items-center gap-1">
                      <AlertCircle size={12} />
                      <span>Issues: {invalidCount}</span>
                    </span>
                  )}
                </div>

                <div className="text-2xs text-slate-500 hidden md:block">
                  Tip: Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono">Enter</kbd> to jump to the next row, or click <Camera size={11} className="inline text-indigo-600" /> to attach photos.
                </div>
              </div>

              {/* The Interactive Spreadsheet Grid */}
              <div className="border border-slate-300 rounded-xl overflow-hidden shadow-xs bg-white">
                <div className="max-h-[52vh] overflow-x-auto overflow-y-auto select-none sm:select-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    
                    {/* Excel Header: Column Letters (A, B, C...) + Column Names */}
                    <thead className="sticky top-0 z-20 shadow-2xs">
                      {/* Top Row: Column Letters */}
                      <tr className="bg-slate-200/90 text-slate-600 text-2xs font-mono font-bold border-b border-slate-300">
                        <th className="p-1 w-10 text-center border-r border-slate-300 bg-slate-300/80">#</th>
                        <th className="p-1 w-20 text-center border-r border-slate-300 bg-slate-300/80">Status</th>
                        {columns.map((col, cIdx) => (
                          <th 
                            key={`letter-${col.key}`} 
                            className={`p-1 text-center border-r border-slate-300 ${
                              activeCell.colKey === col.key ? 'bg-emerald-200 text-emerald-900 font-black' : ''
                            }`}
                          >
                            {getColumnLetter(cIdx)}
                          </th>
                        ))}
                        <th className="p-1 w-16 text-center bg-slate-300/80">Actions</th>
                      </tr>

                      {/* Second Row: Column Labels & Metadata */}
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <th className="p-2 w-10 text-center border-r border-slate-300 bg-slate-200/70">
                          <span className="text-slate-400 font-mono">№</span>
                        </th>
                        <th className="p-2 w-20 text-center border-r border-slate-300 font-semibold text-slate-600">
                          Ready
                        </th>
                        {columns.map((col) => {
                          const isFk = isForeignKeyColumn(col);
                          const isImg = isImageColumn(col);
                          return (
                            <th 
                              key={col.key} 
                              className={`p-2 min-w-[150px] border-r border-slate-200 whitespace-nowrap ${
                                activeCell.colKey === col.key ? 'bg-emerald-50/90 text-emerald-950' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1">
                                  <span>{col.label}</span>
                                  {col.required && <span className="text-rose-500 font-bold">*</span>}
                                </div>
                                
                                {isFk && (
                                  <span 
                                    className="text-3xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono font-semibold cursor-help flex items-center gap-0.5"
                                    title="Auto-resolves PAN, GST, Code, or Name to Primary Key"
                                  >
                                    <Link2 size={10} />
                                    <span>FK</span>
                                  </span>
                                )}

                                {isImg && (
                                  <span 
                                    className="text-3xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300 font-mono font-semibold cursor-help flex items-center gap-0.5"
                                    title="Supports direct image upload or image URL"
                                  >
                                    <ImageIcon size={10} />
                                    <span>IMG</span>
                                  </span>
                                )}
                              </div>
                            </th>
                          );
                        })}
                        <th className="p-2 w-16 text-center">Row</th>
                      </tr>
                    </thead>

                    {/* Table Body (Rows & Cells) */}
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {validatedRows.map((row, rIdx) => {
                        const isCurrentRow = activeCell.row === rIdx;
                        return (
                          <tr 
                            key={row._index}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isCurrentRow ? 'bg-emerald-50/30' : ''
                            } ${!row._isEmpty && !row._isValid ? 'bg-amber-50/30' : ''}`}
                          >
                            {/* Row Number */}
                            <td 
                              onClick={() => setActiveCell(prev => ({ ...prev, row: rIdx }))}
                              className={`p-1.5 text-center font-mono text-2xs border-r border-slate-300 cursor-pointer ${
                                isCurrentRow ? 'bg-emerald-100 text-emerald-900 font-bold' : 'bg-slate-100/70 text-slate-500'
                              }`}
                            >
                              {rIdx + 1}
                            </td>

                            {/* Validation Status Indicator */}
                            <td className="p-1.5 text-center border-r border-slate-200">
                              {row._isEmpty ? (
                                <span className="text-3xs font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                  Blank
                                </span>
                              ) : row._isValid ? (
                                <span className="inline-flex items-center gap-0.5 text-3xs font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">
                                  <CheckCircle2 size={10} />
                                  <span>Ready</span>
                                </span>
                              ) : (
                                <span 
                                  className="inline-flex items-center gap-0.5 text-3xs font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 cursor-help"
                                  title={row._errors.join(', ')}
                                >
                                  <AlertCircle size={10} />
                                  <span>Invalid</span>
                                </span>
                              )}
                            </td>

                            {/* Data Cells */}
                            {columns.map((col, cIdx) => {
                              const cellValue = row[col.key] !== undefined ? row[col.key] : '';
                              const isCellActive = activeCell.row === rIdx && activeCell.colKey === col.key;
                              const isFk = isForeignKeyColumn(col);
                              const isImg = isImageColumn(col);
                              const isMissingRequired = !row._isEmpty && col.required && (!cellValue || String(cellValue).trim() === '');
                              const isUploadingThisCell = uploadingCell?.row === rIdx && uploadingCell?.colKey === col.key;

                              return (
                                <td 
                                  key={col.key}
                                  onClick={() => setActiveCell({ row: rIdx, colKey: col.key })}
                                  className={`p-1 border-r border-slate-200 relative transition-all ${
                                    isCellActive ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/20 z-10' : ''
                                  } ${isMissingRequired ? 'bg-amber-50/50' : ''}`}
                                >
                                  {/* Custom Renderer for Image Columns */}
                                  {isImg ? (
                                    <div className="flex items-center gap-1.5 px-1 py-0.5">
                                      {cellValue ? (
                                        <div className="flex items-center gap-1.5 w-full">
                                          {/* Image Thumbnail with zoom trigger */}
                                          <div 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPreviewImage(cellValue);
                                            }}
                                            className="w-7 h-7 rounded border border-slate-300 overflow-hidden bg-slate-100 shrink-0 cursor-pointer hover:border-emerald-500 shadow-2xs group relative"
                                            title="Click to zoom image"
                                          >
                                            <img 
                                              src={cellValue} 
                                              alt="Thumbnail" 
                                              className="w-full h-full object-cover"
                                              onError={(e) => { e.target.src = 'https://placehold.co/40x40?text=IMG'; }}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                              <Eye size={10} />
                                            </div>
                                          </div>

                                          {/* Direct URL text or path */}
                                          <input
                                            type="text"
                                            value={cellValue}
                                            onChange={(e) => handleCellChange(rIdx, col.key, e.target.value)}
                                            onFocus={() => setActiveCell({ row: rIdx, colKey: col.key })}
                                            className="flex-1 min-w-[70px] text-2xs px-1.5 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white truncate"
                                            placeholder="URL..."
                                          />

                                          {/* Replace Image Button */}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              triggerImageUploadForCell(rIdx, col.key);
                                            }}
                                            className="p-1 text-slate-400 hover:text-emerald-700 rounded hover:bg-emerald-50 cursor-pointer"
                                            title="Replace Image"
                                          >
                                            <Camera size={13} />
                                          </button>

                                          {/* Clear Image Button */}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCellChange(rIdx, col.key, '');
                                            }}
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                                            title="Remove Image"
                                          >
                                            <X size={13} />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 w-full">
                                          <button
                                            type="button"
                                            disabled={isUploadingThisCell}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              triggerImageUploadForCell(rIdx, col.key);
                                            }}
                                            className="flex-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-3xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
                                          >
                                            {isUploadingThisCell ? (
                                              <>
                                                <div className="w-2.5 h-2.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                                <span>Uploading...</span>
                                              </>
                                            ) : (
                                              <>
                                                <Camera size={11} />
                                                <span>+ Upload Image</span>
                                              </>
                                            )}
                                          </button>
                                          
                                          {/* URL input fallback */}
                                          <input
                                            type="text"
                                            value={cellValue}
                                            onChange={(e) => handleCellChange(rIdx, col.key, e.target.value)}
                                            onFocus={() => setActiveCell({ row: rIdx, colKey: col.key })}
                                            className="w-16 text-3xs px-1 py-1 rounded bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-400 focus:bg-white truncate text-slate-500"
                                            placeholder="or paste URL"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    /* Standard Text / Number / Relation Cell */
                                    <div className="relative flex items-center">
                                      <input
                                        type={col.type === 'number' ? 'number' : 'text'}
                                        value={cellValue}
                                        onChange={(e) => handleCellChange(rIdx, col.key, e.target.value)}
                                        onFocus={() => setActiveCell({ row: rIdx, colKey: col.key })}
                                        onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx)}
                                        placeholder={isFk ? 'Name, PAN, or GST...' : ''}
                                        className={`w-full px-2 py-1.5 text-xs rounded outline-hidden transition-all ${
                                          isMissingRequired
                                            ? 'border border-amber-400 bg-amber-50/70 focus:bg-white focus:border-emerald-500'
                                            : 'border border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white bg-transparent'
                                        }`}
                                      />
                                      {isFk && cellValue && (
                                        <span 
                                          className="absolute right-1 text-3xs text-amber-600 font-mono bg-amber-50 px-1 rounded pointer-events-none border border-amber-200"
                                          title="Auto-resolves to foreign key"
                                        >
                                          FK
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            {/* Row Action Buttons */}
                            <td className="p-1 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateRow(rIdx)}
                                  className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                  title="Duplicate Row"
                                >
                                  <Copy size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(rIdx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Delete Row"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Add Row Bar */}
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-2xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus size={14} className="text-emerald-600" />
                    <span>+ Add New Row</span>
                  </button>

                  <div className="text-2xs text-slate-500">
                    Showing {parsedRows.length} total row(s) &bull; {columns.length} column(s)
                  </div>
                </div>
              </div>

              {/* Incomplete Rows Warning Banner */}
              {invalidCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0 text-amber-600" />
                    <span>
                      <b>{invalidCount} row(s)</b> have missing required fields (highlighted in yellow). You can complete them in the grid cells above, or proceed to import only the <b>{validCount} valid row(s)</b>.
                    </span>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: EXCEL FILE IMPORT */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              
              {/* Template Download Card */}
              <div className="p-4 rounded-xl bg-linear-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5">
                    <Download size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Download Official {entityName} Excel Template
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                      Pre-formatted with column titles, sample values, and validation rules. Fill it out on your computer and upload below.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('xlsx')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet size={15} />
                    <span>Download .xlsx</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('csv')}
                    className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download size={14} />
                    <span>CSV</span>
                  </button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-10 border-2 border-dashed rounded-2xl text-center transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/60'
                    : 'border-slate-300 hover:border-emerald-400 bg-white'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                />
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 shadow-2xs">
                  <UploadCloud size={28} />
                </div>
                <h5 className="text-sm font-bold text-slate-800">
                  {file ? file.name : 'Drag & drop your Excel or CSV file here'}
                </h5>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv). Data will load into the live grid workstation for editing.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-2xs inline-flex items-center gap-2 cursor-pointer transition-all"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  <span>Browse Local Files</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: GOOGLE SHEETS IMPORT */}
          {activeTab === 'sheets' && (
            <div className="space-y-4">
              
              {/* Method A: Direct Google Sheets URL */}
              <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-2xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <Globe size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Method 1: Direct Google Sheet URL Import
                    </h4>
                    <p className="text-xs text-slate-500">
                      Paste a public Google Sheets share link. We'll automatically fetch and populate the grid.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={googleSheetUrl}
                    onChange={(e) => setGoogleSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit?usp=sharing"
                    className="flex-1 p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50"
                  />
                  <button
                    type="button"
                    disabled={fetchingSheet || !googleSheetUrl.trim()}
                    onClick={handleFetchGoogleSheet}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    {fetchingSheet ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Fetching...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink size={14} />
                        <span>Fetch Google Sheet</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-2xs text-slate-500 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <Info size={13} className="text-blue-500 shrink-0" />
                  <span>
                    <b>Requirement:</b> Ensure your Google Sheet sharing is set to <i>"Anyone with the link can view"</i> (Click Share in top-right of your Google Sheet).
                  </span>
                </div>
              </div>

              {/* Method B: Direct Tabular Copy-Paste */}
              <div className="p-4 rounded-xl bg-white border border-slate-300 shadow-2xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                    <ClipboardPaste size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Method 2: Copy & Paste Cells from Google Sheets
                    </h4>
                    <p className="text-xs text-slate-500">
                      Select cells in Google Sheets, press <b>Ctrl+C</b>, and paste (<b>Ctrl+V</b>) into the box below.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    rows={5}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Click here and press Ctrl+V to paste tab-separated rows directly from Google Sheets..."
                    className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/70"
                  />
                  <div className="absolute top-2.5 right-3 text-3xs text-slate-400 bg-white/95 px-2 py-0.5 rounded border border-slate-200">
                    Tab & Comma delimiter auto-detect
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-2xs text-slate-500">
                    Tip: Include the column header row from Google Sheets for automated column matching.
                  </span>
                  <button
                    type="button"
                    onClick={handleParsePastedText}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <ClipboardPaste size={14} />
                    <span>Parse Clipboard into Grid</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer & Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-3">
            {parsedRows.length > 0 && (
              <span className="text-xs text-slate-600 font-medium hidden sm:inline">
                <b>{validCount}</b> ready to import ({invalidCount} incomplete)
              </span>
            )}

            <button
              type="button"
              disabled={validCount === 0 || submitting}
              onClick={handleSubmit}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Importing Data to Database...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet size={15} />
                  <span>Import {validCount > 0 ? `${validCount} ${entityName}(s)` : 'Data'} to Database</span>
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
