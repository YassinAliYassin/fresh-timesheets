import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API_URL from './api';
import PDFExport from './PDFExport';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalStaff: 0,
    pendingTimesheets: 0,
    totalHours: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const [eventsRes, timesheetsRes] = await Promise.all([
        fetch(`${API_URL}/api/events`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/timesheets`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!eventsRes.ok || !timesheetsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const events = await eventsRes.json();
      const timesheets = await timesheetsRes.json();

      const staffNames = new Set(timesheets.map((t: any) => t.staff_name));
      const totalHours = timesheets.reduce((acc: number, t: any) => {
        return acc + (t.hours || 0);
      }, 0);

      setStats({
        totalEvents: events.length,
        totalStaff: staffNames.size,
        pendingTimesheets: timesheets.filter((t: any) => !t.clock_out).length,
        totalHours
      });
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a4c71d]"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Dashboard</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-[#a4c71d] hover:shadow-xl transition">
          <h3 className="text-gray-600 text-sm font-medium">Total Events</h3>
          <p className="text-4xl font-bold mt-2">{stats.totalEvents}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition">
          <h3 className="text-gray-600 text-sm font-medium">Active Staff</h3>
          <p className="text-4xl font-bold mt-2">{stats.totalStaff}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-orange-500 hover:shadow-xl transition">
          <h3 className="text-gray-600 text-sm font-medium">Pending Clock-Outs</h3>
          <p className="text-4xl font-bold mt-2">{stats.pendingTimesheets}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-green-500 hover:shadow-xl transition">
          <h3 className="text-gray-600 text-sm font-medium">Total Hours</h3>
          <p className="text-4xl font-bold mt-2">{stats.totalHours}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/timesheet" className="bg-[#a4c71d] text-white p-6 rounded-2xl hover:bg-[#8fb018] transition text-center transform hover:scale-105">
          <h3 className="text-xl font-bold">Clock In/Out</h3>
          <p className="text-sm mt-2 opacity-90">Record staff hours</p>
        </Link>

        <Link to="/events" className="bg-[#1a1a1a] text-white p-6 rounded-2xl hover:bg-gray-800 transition text-center transform hover:scale-105">
          <h3 className="text-xl font-bold">Manage Events</h3>
          <p className="text-sm mt-2 opacity-90">Add venues & clients</p>
        </Link>

        <Link to="/billing" className="bg-blue-600 text-white p-6 rounded-2xl hover:bg-blue-700 transition text-center transform hover:scale-105">
          <h3 className="text-xl font-bold">Export Billing</h3>
          <p className="text-sm mt-2 opacity-90">Excel for clients</p>
        </Link>

        <div className="bg-white border-2 border-[#a4c71d] p-6 rounded-2xl text-center">
          <h3 className="text-xl font-bold text-[#a4c71d]">Rate: R40/hour</h3>
          <p className="text-sm mt-2 text-gray-600">Standard billing rate</p>
        </div>
      </div>

      <div className="mt-8">
        <PDFExport />
      </div>
    </div>
  );
}
