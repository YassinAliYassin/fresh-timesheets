import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API_URL from './api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalStaff: 0,
    pendingTimesheets: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const eventsRes = await fetch(`${API_URL}/api/events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const events = await eventsRes.json();

      const timesheetsRes = await fetch(`${API_URL}/api/timesheets`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const timesheets = await timesheetsRes.json();

      const staffNames = new Set(timesheets.map((t: any) => t.staff_name));

      setStats({
        totalEvents: events.length,
        totalStaff: staffNames.size,
        pendingTimesheets: timesheets.filter((t: any) => !t.clock_out).length
      });
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-[#a4c71d]">
          <h3 className="text-gray-600 text-sm font-medium">Total Events</h3>
          <p className="text-4xl font-bold mt-2">{stats.totalEvents}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-blue-500">
          <h3 className="text-gray-600 text-sm font-medium">Active Staff</h3>
          <p className="text-4xl font-bold mt-2">{stats.totalStaff}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-lg border-l-4 border-orange-500">
          <h3 className="text-gray-600 text-sm font-medium">Pending Clock-Outs</h3>
          <p className="text-4xl font-bold mt-2">{stats.pendingTimesheets}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/timesheet" className="bg-[#a4c71d] text-white p-6 rounded-2xl hover:bg-[#8fb018] transition text-center">
          <h3 className="text-xl font-bold">Clock In/Out</h3>
          <p className="text-sm mt-2 opacity-90">Record staff hours</p>
        </Link>

        <Link to="/events" className="bg-[#1a1a1a] text-white p-6 rounded-2xl hover:bg-gray-800 transition text-center">
          <h3 className="text-xl font-bold">Manage Events</h3>
          <p className="text-sm mt-2 opacity-90">Add venues & clients</p>
        </Link>

        <Link to="/billing" className="bg-blue-600 text-white p-6 rounded-2xl hover:bg-blue-700 transition text-center">
          <h3 className="text-xl font-bold">Export Billing</h3>
          <p className="text-sm mt-2 opacity-90">Excel for clients</p>
        </Link>

        <div className="bg-white border-2 border-[#a4c71d] p-6 rounded-2xl text-center">
          <h3 className="text-xl font-bold text-[#a4c71d]">Rate: R40/hour</h3>
          <p className="text-sm mt-2 text-gray-600">Standard billing</p>
        </div>
      </div>
    </div>
  );
}
