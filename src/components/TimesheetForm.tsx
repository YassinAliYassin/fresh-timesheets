import { useState, useEffect } from 'react';
import API_URL from './api';

export default function TimesheetForm() {
  const [eventName, setEventName] = useState('');
  const [staffName, setStaffName] = useState('');
  const [clockIn, setClockIn] = useState('');
  const [activeTimesheets, setActiveTimesheets] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchActiveTimesheets();
  }, []);

  const fetchActiveTimesheets = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/timesheets?clock_out=`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch timesheets');
      const data = await res.json();
      setActiveTimesheets(data.filter((t: any) => !t.clock_out));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !staffName) {
      setError('Please enter an event name and staff name');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/timesheets/clock-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          event_name: eventName,
          staff_name: staffName,
          clock_in: clockIn || new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Clock in failed');

      setMessage(`✅ ${staffName} clocked in successfully!`);
      setStaffName('');
      setEventName('');
      setClockIn('');
      fetchActiveTimesheets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (timesheetId: number, staffName: string) => {
    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/timesheets/clock-out`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timesheet_id: timesheetId,
          clock_out: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Clock out failed');

      const data = await response.json();
      setMessage(`✅ ${staffName} clocked out! Hours: ${data.total_hours}, Amount: R${data.total_amount}`);
      fetchActiveTimesheets();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Clock In / Clock Out</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          ❌ {error}
        </div>
      )}

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Clock In Form */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold mb-4">Clock In Staff</h3>
          <form onSubmit={handleClockIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Event</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Enter event name (e.g., Wedding, Corporate Event)"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Staff Name</label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter staff name"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Clock In Time</label>
              <input
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#a4c71d] text-white py-3 rounded-lg hover:bg-[#8fb018] transition disabled:opacity-50 font-bold"
            >
              {loading ? 'Clocking In...' : 'Clock In'}
            </button>
          </form>
        </div>

        {/* Active Timesheets */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold mb-4">Active Timesheets</h3>
          {activeTimesheets.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active timesheets</p>
          ) : (
            <div className="space-y-4">
              {activeTimesheets.map((ts: any) => (
                <div key={ts.id} className="border border-gray-200 p-4 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold">{ts.staff_name}</p>
                      <p className="text-sm text-gray-600">Event: {ts.event_name}</p>
                      <p className="text-sm text-gray-600">
                        Clock In: {new Date(ts.clock_in).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleClockOut(ts.id, ts.staff_name)}
                      disabled={loading}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition disabled:opacity-50"
                    >
                      Clock Out
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
