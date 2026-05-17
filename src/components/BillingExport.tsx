import { useState } from 'react';
import * as XLSX from 'xlsx';

interface BillingExportProps {
  token: string;
}

export default function BillingExport({ token }: BillingExportProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const API = 'http://localhost:3000/api';

  const fetchTimesheets = async () => {
    if (!startDate || !endDate) return alert('Select date range');
    setLoading(true);
    const res = await fetch(`${API}/timesheets`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    // Filter by date range
    const filtered = data.filter((t: any) => {
      const clockIn = new Date(t.clock_in);
      return clockIn >= new Date(startDate) && clockIn <= new Date(endDate + 'T23:59:59');
    });
    setTimesheets(filtered);
    setLoading(false);
  };

  const exportToExcel = () => {
    if (timesheets.length === 0) return alert('No data to export');

    // Summary sheet
    const summary: any[] = [];
    const eventTotals: Record<number, { client: string; venue: string; total: number; hours: number }> = {};
    
    timesheets.forEach(t => {
      const key = t.event_id;
      if (!eventTotals[key]) {
        eventTotals[key] = { client: t.client_name, venue: t.venue, total: 0, hours: 0 };
      }
      eventTotals[key].total += t.total_amount || 0;
      eventTotals[key].hours += t.total_hours || 0;
    });

    Object.values(eventTotals).forEach(e => {
      summary.push({
        'Client': e.client,
        'Venue': e.venue,
        'Total Hours': e.hours.toFixed(2),
        'Total Amount (R)': e.total.toFixed(2)
      });
    });

    // Detail sheet
    const detail = timesheets.map(t => ({
      'Staff': t.staff_name,
      'Client': t.client_name,
      'Venue': t.venue,
      'Clock In': new Date(t.clock_in).toLocaleString(),
      'Clock Out': t.clock_out ? new Date(t.clock_out).toLocaleString() : 'Active',
      'Hours': t.total_hours?.toFixed(2) || 'N/A',
      'Rate (R/hr)': t.hourly_rate,
      'Amount (R)': t.total_amount?.toFixed(2) || 'N/A'
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), 'Details');
    
    const fileName = `billing_${startDate}_${endDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Billing Export</h1>
        
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Generate Report</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d]/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d]/20"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={fetchTimesheets}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Fetch Data'}
            </button>
            <button 
              onClick={exportToExcel}
              disabled={timesheets.length === 0}
              className="btn-outline disabled:opacity-50"
            >
              Export to Excel
            </button>
          </div>
        </div>

        {/* Preview */}
        {timesheets.length > 0 && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Preview ({timesheets.length} records)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-2">Staff</th>
                    <th className="text-left p-2">Client</th>
                    <th className="text-left p-2">Hours</th>
                    <th className="text-left p-2">Amount (R)</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.slice(0, 5).map(t => (
                    <tr key={t.id} className="border-b border-gray-50">
                      <td className="p-2">{t.staff_name}</td>
                      <td className="p-2">{t.client_name}</td>
                      <td className="p-2">{t.total_hours?.toFixed(2) || 'N/A'}</td>
                      <td className="p-2">R{t.total_amount?.toFixed(2) || 'N/A'}</td>
                    </tr>
                  ))}
                  {timesheets.length > 5 && (
                    <tr>
                      <td colSpan={4} className="p-2 text-center text-gray-500">
                        +{timesheets.length - 5} more records...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}