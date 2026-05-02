import API_URL from './api';
import { useState, useEffect } from 'react';

export default function EventManager() {
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState({
    client_name: '',
    venue: '',
    address: '',
    event_date: ''
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setEvents(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setMessage('✅ Event created successfully!');
        setFormData({ client_name: '', venue: '', address: '', event_date: '' });
        fetchEvents();
      }
    } catch (err) {
      setMessage('❌ Failed to create event');
    }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">Event Manager</h2>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Event Form */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold mb-4">Add New Event</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Client Name</label>
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#a4c71d] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Venue</label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({...formData, venue: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#a4c71d] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#a4c71d] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Event Date</label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#a4c71d] outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#a4c71d] text-white py-3 rounded-lg font-bold hover:bg-[#8fb018] transition"
            >
              Create Event
            </button>
          </form>
        </div>

        {/* Events List */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h3 className="text-xl font-bold mb-4">All Events</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No events yet</p>
            ) : (
              events.map((event: any) => (
                <div key={event.id} className="border p-4 rounded-lg hover:bg-gray-50">
                  <h4 className="font-bold">{event.client_name}</h4>
                  <p className="text-sm text-gray-600">{event.venue}</p>
                  <p className="text-xs text-gray-500">{event.address}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(event.event_date).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
