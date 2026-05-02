import { useState, useEffect } from 'react';

export default function TimesheetForm() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [staffName, setStaffName] = useState('');
  const [clockIn, setClockIn] = useState('');
  const [activeTimesheets, setActiveTimesheets] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEvents();
    fetchActiveTimesheets();
  }, []);

  const fetchEvents = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/events', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setEvents(data);
  };

  const fetchActiveTimesheets = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/timesheets?clock_out=', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setActiveTimesheets(data.filter((t: any) => !t.clock_out));
  };

  const handleClockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      await fetch('/api/timesheets/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          event_id: selectedEvent,
          staff_name: staffName,
          clock_in: clockIn || new Date().toISOString()
        })
      });

      setMessage(`✅ ${staffName} clocked in!`);
      setStaffName('');
      fetchActiveTimesheets();
    } catch (err) {
      setMessage('❌ Clock in failed');
    }
  };

  const handleClockOut = async (timesheetId: number) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('/api/timesheets/clock-out', {
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

      const data = await response.json();
      setMessage(`✅ Clocked out! Hours: ${data.total_hours}, Amount: R${data.total_amount}`);
      fetchActiveTimesheets();
    } catch (err) {
      setMessage('❌ Clock out failed');
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Clock In / Clock Out</h2>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
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
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#a4c71d] outline-none"
                required
              >
                <option value="">Choose event...</option>
                {events.map((event: any) => (
                  <option key={event.id} value={event.id}>
                    {event.client_name} - {event.venue}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Staff Name</label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter staff name"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#a4c71d] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Clock In Time (optional)</label>
              <input
                type="datetime-local"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#a4c71d] outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#a4c71d] text-white py-3 rounded-lg font-bold hover:bg-[#8fb018] transition"
            >
              Clock In
            </button>
          </form>
        </div>

        {/* Active Timesheets */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold mb-4">Pending Clock-Outs</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activeTimesheets.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No pending clock-outs</p>
            ) : (
              activeTimesheets.map((ts: any) => (
                <div key={ts.id} className="border p-4 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{ts.staff_name}</p>
                      <p className="text-sm text-gray-600">{ts.client_name} - {ts.venue}</p>
                      <p className="text-xs text-gray-500">
                        In: {new Date(ts.clock_in).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleClockOut(ts.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-sm"
                    >
                      Clock Out
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
