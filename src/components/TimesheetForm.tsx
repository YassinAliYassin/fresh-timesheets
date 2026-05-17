import { useState, useEffect } from 'react';

export default function TimesheetForm({ token }) {
  const [events, setEvents] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [eventId, setEventId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [rate, setRate] = useState(40);

  useEffect(() => {
    fetchEvents();
    fetchTimesheets();
  }, []);

  const fetchEvents = async () => {
    const res = await fetch('http://localhost:3000/api/events', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setEvents(await res.json());
  };

  const fetchTimesheets = async () => {
    const res = await fetch('http://localhost:3000/api/timesheets', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setTimesheets(await res.json());
  };

  const clockIn = async () => {
    if (!eventId || !staffName) return alert('Fill all fields');
    await fetch('http://localhost:3000/api/timesheets/clockin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ event_id: eventId, staff_name: staffName, hourly_rate: rate })
    });
    fetchTimesheets();
    setStaffName('');
  };

  const clockOut = async (id) => {
    await fetch(`http://localhost:3000/api/timesheets/clockout/${id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchTimesheets();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Timesheets</h1>
        
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Clock In</h2>
          <select value={eventId} onChange={e => setEventId(e.target.value)} className="w-full p-2 mb-4 border rounded">
            <option value="">Select Event</option>
            {events.map(e => <option key={e.id} value={e.id}>{e.client_name} - {e.venue}</option>)}
          </select>
          <input type="text" placeholder="Staff Name" value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full p-2 mb-4 border rounded" />
          <input type="number" placeholder="Hourly Rate" value={rate} onChange={e => setRate(e.target.value)} className="w-full p-2 mb-4 border rounded" />
          <button onClick={clockIn} className="btn-primary">Clock In</button>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Active & Recent</h2>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Staff</th>
                <th className="text-left p-2">Event</th>
                <th className="text-left p-2">Hours</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map(t => (
                <tr key={t.id} className="border-b">
                  <td className="p-2">{t.staff_name}</td>
                  <td className="p-2">{t.client_name}</td>
                  <td className="p-2">{t.total_hours?.toFixed(2) || 'Active'}</td>
                  <td className="p-2">${t.total_amount?.toFixed(2) || '...'}</td>
                  <td className="p-2">
                    {!t.clock_out && <button onClick={() => clockOut(t.id)} className="btn-primary text-sm">Clock Out</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
