import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from './api';

export default function PDFExport() {
  const handleExport = async (type: 'timesheets' | 'billing' = 'timesheets') => {
    try {
      const data = await api.get('/api/timesheets');
      const items = data || [];

      const doc = new jsPDF();

      // Add header
      doc.setFontSize(20);
      doc.text('Fresh Timesheets', 14, 22);
      doc.setFontSize(10);
      doc.text(`Exported: ${new Date().toLocaleDateString()}`, 14, 30);

      if (type === 'timesheets') {
        const completedItems = items.filter((item: any) => item.clock_out);
        const rows = completedItems.map((item: any) => [
          item.clock_in ? new Date(item.clock_in).toLocaleDateString() : '',
          item.staff_name || '',
          item.event_name || '',
          item.total_hours ? item.total_hours.toFixed(1) : 'In progress',
          `R${(item.hourly_rate || 40).toFixed(2)}`,
          item.total_amount ? `R${item.total_amount.toFixed(2)}` : '-'
        ]);

        (doc as any).autoTable({
          head: [['Date', 'Staff', 'Event', 'Hours', 'Rate', 'Total']],
          body: rows,
          startY: 40,
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [164, 199, 29] }
        });
      } else {
        // Billing summary by staff
        const staffSummary: { [key: string]: { hours: number; amount: number; rate: number } } = {};
        items.filter((i: any) => i.clock_out).forEach((item: any) => {
          const name = item.staff_name || 'Unknown';
          if (!staffSummary[name]) staffSummary[name] = { hours: 0, amount: 0, rate: item.hourly_rate || 40 };
          staffSummary[name].hours += item.total_hours || 0;
          staffSummary[name].amount += item.total_amount || 0;
        });

        const rows = Object.entries(staffSummary).map(([name, s]) => [
          name,
          s.hours.toFixed(1),
          `R${s.rate.toFixed(2)}`,
          `R${s.amount.toFixed(2)}`
        ]);

        (doc as any).autoTable({
          head: [['Staff', 'Total Hours', 'Rate', 'Total Amount']],
          body: rows,
          startY: 40,
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [164, 199, 29] }
        });
      }

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
