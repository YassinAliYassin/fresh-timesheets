import API_URL from './api';
import { useState } from 'react';
import type { BillingSummaryItem, BillingResponse } from '../types';

export default function BillingExport() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [staffName, setStaffName] = useState('');
  const [summary, setSummary] = useState<BillingSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  const fetchBilling = async () => {
    setError('');
    setLoading(true);

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

      if (!res.ok) throw new Error('Failed to fetch billing data');

      const data = await res.json() as BillingResponse;
      setSummary(data.staff || []);

      const total = (data.staff || []).reduce((acc: number, s: BillingSummaryItem) => acc + (s.total_amount || 0), 0);
      setTotalAmount(total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setError('');
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

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheets_${month}_${year}.xlsx`;
      a.click();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Billing Export</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          ❌ {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
        <h3 className="text-xl font-bold mb-4">Pay Period: 26th → 25th</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent"
            >
              {monthNames.map((name, i) => (
                <option key={i+1} value={i+1}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Staff Filter (optional)</label>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Filter by name"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={fetchBilling}
              disabled={loading}
              className="flex-1 bg-[#a4c71d] text-white py-3 rounded-lg font-bold hover:bg-[#8fb018] transition disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'View Summary'}
            </button>
          </div>
        </div>

        {summary.length > 0 && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-3 border-b">Staff Name</th>
                    <th className="p-3 border-b text-right">Total Hours</th>
                    <th className="p-3 border-b text-right">Rate</th>
                    <th className="p-3 border-b text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s: BillingSummaryItem, i: number) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-3 border-b">{s.staff_name}</td>
                      <td className="p-3 border-b text-right">{s.total_hours}</td>
                      <td className="p-3 border-b text-right">R{s.rate}</td>
                      <td className="p-3 border-b text-right font-bold">R{s.total_amount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#a4c71d] text-white font-bold">
                    <td className="p-3" colSpan={3}>Total</td>
                    <td className="p-3 text-right">R{totalAmount}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <button
              onClick={handleExport}
              className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-bold"
            >
              📥 Export Excel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
