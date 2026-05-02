import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from './api';

export default function PDFExport() {
  const handleExport = async (type = 'timesheets') => {
    try {
      const endpoint = type === 'timesheets' ? '/api/timesheets' : '/api/billing';
      const res = await fetch(`${api.defaults.baseURL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const items = data.data || data;

      const doc = new jsPDF();
      
      // Add header
      doc.setFontSize(20);
      doc.text('Fresh Timesheets', 14, 22);
      doc.setFontSize(10);
      doc.text(`Exported: ${new Date().toLocaleDateString()}`, 14, 30);
      
      // Add table
      const headers = type === 'timesheets' 
        ? ['Date', 'Staff', 'Event', 'Hours', 'Rate', 'Total']
        : ['Invoice #', 'Client', 'Date', 'Amount', 'Status'];
      
      const rows = items.map((item: any) => 
        type === 'timesheets'
          ? [item.date, item.staffName, item.eventName, item.hours, `R${item.rate}`, `R${(item.hours * item.rate).toFixed(2)}`]
          : [item.invoiceNumber, item.clientName, item.date, `R${item.amount}`, item.status]
      );

      (doc as any).autoTable({
        head: [headers],
        body: rows,
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [164, 199, 29] } // Fresh People green
      });

      doc.save(`${type}_export_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={() => handleExport('timesheets')}
        className="px-4 py-2 bg-[#a4c71d] text-white rounded-lg hover:bg-[#8fb018] transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Timesheets PDF
      </button>
      <button
        onClick={() => handleExport('billing')}
        className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export Billing PDF
      </button>
    </div>
  );
}
