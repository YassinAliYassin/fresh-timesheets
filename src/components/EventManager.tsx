import { useState, useEffect } from 'react';

interface Event {
  id: number;
  client_name: string;
  venue: string;
  address?: string;
  event_date?: string;
}

interface EventManagerProps {
  token: string;
}

export default function EventManager({ token }: EventManagerProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [form, setForm] = useState({ client_name: '', venue: '', address: '', event_date: '' });
  const [loading, setLoading] = useState(false);

  const API = 'http://localhost:3000/api';

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    const res = await fetch(`${API}/events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setEvents(await res.json());
  };

  const addEvent = async () => {
    if (!form.client_name || !form.venue) return alert('Client Name and Venue are required');
    setLoading(true);
    await fetch(`${API}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(form)
    });
    setForm({ client_name: '', venue: '', address: '', event_date: '' });
    fetchEvents();
    setLoading(false);
  };

  const deleteEvent = async (id: number) => {
    if (!confirm('Delete this event?')) return;
    await fetch(`${API}/events/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchEvents();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Events Manager</h1>
        
        {/* Add Event Form */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add New Event</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input 
              type="text" 
              placeholder="Client Name *" 
              value={form.client_name} 
              onChange={e => setForm({...form, client_name: e.target.value})} 
              className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d]/20"
            />
            <input 
              type="text" 
              placeholder="Venue *" 
              value={form.venue} 
              onChange={e => setForm({...form, venue: e.target.value})} 
              className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d]/20"
            />
            <input 
              type="text" 
              placeholder="Address" 
              value={form.address} 
              onChange={e => setForm({...form, address: e.target.value})} 
              className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d]/20"
            />
            <input 
              type="date" 
              value={form.event_date} 
              onChange={e => setForm({...form, event_date: e.target.value})} 
              className="p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d]/20"
            />
          </div>
          <button 
            onClick={addEvent} 
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Event'}
          </button>
        </div>

        {/* Events List */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">All Events ({events.length})</h2>
          {events.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No events yet. Add one above!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-3 font-medium">Client</th>
                    <th className="text-left p-3 font-medium">Venue</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-right p-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(e => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-3">{e.client_name}</td>
                      <td className="p-3">{e.venue}</td>
                      <td className="p-3">{e.event_date || 'N/A'}</td>
                      <td className="p-3 text-right">
                        <button 
                          onClick={() => deleteEvent(e.id)}
                          className="btn-outline text-sm py-1 px-3"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}