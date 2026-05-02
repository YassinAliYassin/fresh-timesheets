import API_URL from './api';
import { useState } from 'react';

export default function BillingExport() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [staffName, setStaffName] = useState('');
  const [summary, setSummary] = useState([]);

  const fetchBilling = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const params = new URLSearchParams({
        month: month.toString(),
        year: year.toString()
      });
      if (staffName) params.append('staff_name', staffName);

      const res = await fetch(`${API_URL}/api/billing/cycle?date=${year}-${month.toString().padStart(2, '0')}-01`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSummary(data.staff || []);
    } catch (err) {
      console.error('Failed to fetch billing', err);
    } 
  };

  const handleExport = async () => {
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
      month: month.toString(),
      year: year.toString()
    });
    if (staffName) params.append('staff_name', staffName);

    try {
      const res = await fetch(`${API_URL}/api/export/billing?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheets_${month}_${year}.xlsx`;
      a.click();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Billing Export</h2>

      <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
        <h3 className="text-xl font-bold mb-4">Pay Period: 26th → 25th</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#a4c71d] outline-none"
            >
              {Array.from({length: 12}, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#a4c71d] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Staff Filter (optional)</label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Filter by name"
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#a4c71d] outline-none"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={fetchBilling}
              className="flex-1 bg-[#a4c71d] text-white py-3 rounded-lg font-bold hover:bg-[#8fb018] transition"
            >
              View Summary
            </button>
          </div>
        </div>

        <button
          onClick={handleExport}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
        >
          📊 Export to Excel (Billing Sheet)
        </button>
      </div>

      {/* Summary Table */}
      {summary.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold mb-4">Staff Summary (R40/hour)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Shifts</th>
                  <th className="p-3">Total Hours</th>
                  <th className="p-3">Total Amount (R)</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s: any, i: number) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium">{s.staff_name}</td>
                    <td className="p-3">{s.shifts}</td>
                    <td className="p-3">{s.total_hours}</td>
                    <td className="p-3 font-bold text-[#a4c71d]">R{s.total_amount}</td>
                  </tr>
                ))}
                <tr className="border-t-2 font-bold bg-gray-50">
                  <td className="p-3">TOTAL</td>
                  <td className="p-3">
                    {summary.reduce((acc: number, s: any) => acc + s.shifts, 0)}
                  </td>
                  <td className="p-3">
                    {summary.reduce((acc: number, s: any) => acc + s.total_hours, 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-[#a4c71d]">
                    R{summary.reduce((acc: number, s: any) => acc + s.total_amount, 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
