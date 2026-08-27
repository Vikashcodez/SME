import { useState, useRef } from "react";
import { 
  Upload, FileText, CheckCircle2, AlertTriangle, 
  X, ArrowRight, Download, RefreshCw, Check, Sparkles, AlertCircle
} from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { 
  parseImportFile, 
  autoMapColumns, 
  validateImportRows, 
  exportErrorsToCsv 
} from "../../utils/universalImporter";
import { erp } from "../../services/api";
import { toast } from "react-hot-toast";
import { cx } from "../../utils/format";

export function UniversalImporterModal({ open, onClose, entity, onImportSuccess }) {
  const [step, setStep] = useState(1); 
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState("");
  const [parsedHeaders, setParsedHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importReport, setImportReport] = useState(null);

  const fileInputRef = useRef(null);

  if (!open || !entity) return null;

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setFormat("");
    setParsedHeaders([]);
    setParsedRows([]);
    setColumnMapping({});
    setValidationResult(null);
    setImportReport(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileChange = async (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setLoading(true);
    try {
      const parsed = await parseImportFile(uploadedFile);
      setFile(uploadedFile);
      setFormat(parsed.format);
      setParsedHeaders(parsed.headers);
      setParsedRows(parsed.rows);

      
      const mapping = autoMapColumns(parsed.headers, entity);
      setColumnMapping(mapping);

      setStep(2);
      toast.success(`Parsed ${parsed.rows.length} rows from ${uploadedFile.name}`);
    } catch (err) {
      toast.error(`Failed to parse file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToValidation = () => {
    const res = validateImportRows(parsedRows, columnMapping, entity);
    setValidationResult(res);
    setStep(3);
  };

  const handleCommitImport = async () => {
    if (!validationResult || validationResult.validRows.length === 0) {
      toast.error("No valid rows available to import");
      return;
    }

    setLoading(true);
    try {
      const res = await erp.bulkImport(entity.key, validationResult.validRows);
      if (res.data?.success) {
        setImportReport({
          insertedCount: res.data.insertedCount || validationResult.validRows.length,
          failedCount: validationResult.invalidRows.length + (res.data.failedCount || 0),
          invalidRows: validationResult.invalidRows
        });
        setStep(4);
        if (onImportSuccess) {
          onImportSuccess(res.data.data || validationResult.validRows);
        }
        toast.success(`Successfully imported ${res.data.insertedCount || validationResult.validRows.length} ${entity.name} records!`);
      }
    } catch (err) {
      toast.error(`Import failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`Universal Bulk Importer — ${entity.name}`}
      subtitle="Supported Formats: Excel (.xlsx, .xls), CSV, JSON, XML"
      icon={Upload}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className={cx("h-2 w-2 rounded-full", step >= 1 ? "bg-[#0D9488]" : "bg-slate-300")} />
            <span className={cx("h-2 w-2 rounded-full", step >= 2 ? "bg-[#0D9488]" : "bg-slate-300")} />
            <span className={cx("h-2 w-2 rounded-full", step >= 3 ? "bg-[#0D9488]" : "bg-slate-300")} />
            <span className={cx("h-2 w-2 rounded-full", step >= 4 ? "bg-[#0D9488]" : "bg-slate-300")} />
            <span className="text-xs font-mono text-slate-500 font-bold ml-1">Step {step} of 4</span>
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
            )}

            {step === 2 && (
              <>
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="primary" onClick={handleProceedToValidation}>
                  Validate Schema & Rows <ArrowRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                <Button variant="secondary" onClick={() => setStep(2)}>
                  Back to Mapping
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCommitImport}
                  disabled={loading || validationResult?.validRows?.length === 0}
                >
                  {loading ? "Importing..." : `Import ${validationResult?.validRows?.length || 0} Valid Records`}
                </Button>
              </>
            )}

            {step === 4 && (
              <Button variant="primary" onClick={handleClose}>
                Done & Close
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        
        {step === 1 && (
          <div className="space-y-4 py-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#0D9488] bg-slate-50/80 hover:bg-teal-50/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
            >
              <div className="h-14 w-14 rounded-2xl bg-teal-50 border border-teal-200 text-[#0F766E] flex items-center justify-center mb-3 shadow-xs">
                <Upload className="h-7 w-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Click to upload or drag & drop data file
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4">
                Upload any table from Excel (.xlsx, .xls), CSV, TSV, JSON, or XML. Header columns will be auto-matched to schema fields.
              </p>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 shadow-xs">
                Browse Files
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv,.json,.xml"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}

        
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0D9488]" />
                <span className="font-bold text-slate-900">{file?.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white text-[#0D9488] border border-slate-200 rounded font-bold">
                  {format} ({parsedRows.length} rows)
                </span>
              </div>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Auto-Mapped
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Source File Column</th>
                    <th className="py-2.5 px-4">Sample Preview (Row 1)</th>
                    <th className="py-2.5 px-4">Mapped Target Field ({entity.name})</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedHeaders.map((header) => {
                    const mappedKey = columnMapping[header];
                    const sampleVal = parsedRows[0]?.[header];
                    const isMapped = Boolean(mappedKey && mappedKey !== '__ignore__');

                    return (
                      <tr key={header} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{header}</td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono truncate max-w-xs">{String(sampleVal ?? '—')}</td>
                        <td className="py-2.5 px-4">
                          <select
                            value={mappedKey || '__ignore__'}
                            onChange={(e) => setColumnMapping({ ...columnMapping, [header]: e.target.value === '__ignore__' ? '' : e.target.value })}
                            className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#0D9488]"
                          >
                            <option value="__ignore__">(Do Not Import / Ignore)</option>
                            {entity.fields.filter(f => f.role !== 'hidden_audit' && f.role !== 'readonly_audit').map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.name} {f.required ? '*' : ''} ({f.key})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {isMapped ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <Check className="h-3 w-3" /> Matched
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400">Ignored</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        
        {step === 3 && validationResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Total Rows Analyzed:</span>
                <span className="text-lg font-bold font-mono text-slate-900">{parsedRows.length}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-800 block font-bold">Valid & Ready to Commit:</span>
                <span className="text-lg font-bold font-mono text-emerald-800">{validationResult.validRows.length}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                <span className="text-rose-800 block font-bold">Invalid / Incomplete Rows:</span>
                <span className="text-lg font-bold font-mono text-rose-800">{validationResult.invalidRows.length}</span>
              </div>
            </div>

            
            {validationResult.invalidRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" /> Validation Error Breakdown
                  </h4>
                  <button
                    onClick={() => exportErrorsToCsv(validationResult.invalidRows, entity.name)}
                    className="text-xs text-[#0D9488] hover:text-[#0F766E] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download Error CSV
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-rose-200 rounded-xl bg-rose-50/30 p-2 space-y-1.5 text-xs">
                  {validationResult.invalidRows.map((inv) => (
                    <div key={inv.rowIndex} className="p-2 rounded-lg bg-white border border-rose-200 flex items-start justify-between gap-2">
                      <span className="font-mono font-bold text-rose-800 text-[11px]">Row #{inv.rowIndex}</span>
                      <span className="text-rose-700 text-[11px] flex-1">{inv.errors.join('; ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        
        {step === 4 && importReport && (
          <div className="py-6 text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Bulk Import Execution Complete</h3>
              <p className="text-xs text-slate-500 mt-1">
                Successfully inserted <strong>{importReport.insertedCount}</strong> {entity.name} records into the central database.
              </p>
            </div>

            {importReport.invalidRows && importReport.invalidRows.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-left space-y-2 max-w-md mx-auto">
                <p className="font-bold text-amber-900">
                  {importReport.invalidRows.length} rows failed schema checks and were excluded from this batch.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={Download}
                  onClick={() => exportErrorsToCsv(importReport.invalidRows, entity.name)}
                >
                  Download Error Log CSV
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default UniversalImporterModal;
