import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

export function exportToExcel(data, filename = 'ERP_Report', sheetName = 'Report') {
    try {
        if (!Array.isArray(data) || data.length === 0) {
            toast.error('No data available to export');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));

        const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
        XLSX.writeFile(wb, fullFilename);
        toast.success(`Exported ${data.length} records to ${fullFilename}`);
    } catch (err) {
        console.error('Export to Excel error:', err);
        toast.error('Failed to export Excel file');
    }
}

export function exportToCsv(data, filename = 'ERP_Report') {
    try {
        if (!Array.isArray(data) || data.length === 0) {
            toast.error('No data available to export');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Exported CSV file`);
    } catch (err) {
        console.error('Export to CSV error:', err);
        toast.error('Failed to export CSV file');
    }
}

export function printReport(reportTitle = 'Chandra Precision ERP Report') {
    const originalTitle = document.title;
    document.title = reportTitle;
    window.print();
    document.title = originalTitle;
}
