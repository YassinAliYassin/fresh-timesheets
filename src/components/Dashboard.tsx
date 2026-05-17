import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ token }) {
  const [stats, setStats] = useState({ events: 0, staff: 0, hours: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const res = await fetch('http://localhost:3000/api/events', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const events = await res.json();
    
    const res2 = await fetch('http://localhost:3000/api/timesheets', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const sheets = await res2.json();
    
    setStats({
      events: events.length,
      staff: new Set(sheets.map(s => s.staff_name)).size,
      hours: sheets.reduce((acc, s) => acc + (s.total_hours || 0), 0).toFixed(1)
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Solid Timesheets</h1>
          <div className="space-x-4">
            <button onClick={() => navigate('/timesheets')} className="btn-outline">Timesheets</button>
            <button onClick={() => navigate('/events')} className="btn-outline">Events</button>
            <button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }} className="text-red-500">Logout</button>
          </div>
        </div>
      </nav>
      
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="text-gray-500 text-sm">Total Events</h3>
            <p className="text-3xl font-bold">{stats.events}</p>
          </div>
          <div className="card p-6">
            <h3 className="text-gray-500 text-sm">Staff Members</h3>
            <p className="text-3xl font-bold">{stats.staff}</p>
          </div>
          <div className="card p-6">
            <h3 className="text-gray-500 text-sm">Total Hours</h3>
            <p className="text-3xl font-bold">{stats.hours}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
