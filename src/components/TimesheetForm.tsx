import { useState, useEffect } from 'react';

interface TimesheetFormProps {
  token: string;
}

export default function TimesheetForm({ token }: TimesheetFormProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  
  // Form state
  const [eventInput, setEventInput] = useState('');
  const [staffName, setStaffName] = useState('');
  const [rate, setRate] = useState(40);
  const [notes, setNotes] = useState('');
  
  // UI state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredEvents, setFilteredEvents] = useState<any[]>([]);
  const [payPeriod] = useState(getPayPeriod(new Date()));

  useEffect(() => {
    fetchEvents();
    fetchTimesheets();
  }, []);

  // Filter events based on input
  useEffect(() => {
    if (eventInput.length > 0) {
      const filtered = events.filter((e: any) => 
        e.client_name.toLowerCase().includes(eventInput.toLowerCase()) ||
        e.venue.toLowerCase().includes(eventInput.toLowerCase())
      );
      setFilteredEvents(filtered);
    } else {
      setFilteredEvents(events);
    }
  }, [eventInput, events]);

  const fetchEvents = async () => {
    const res = await fetch('/api/events', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setEvents(await res.json());
  };

  const fetchTimesheets = async () => {
    const res = await fetch('/api/timesheets', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setTimesheets(await res.json());
  };

  const findOrCreateEvent = async (): Promise<number | null> => {
    if (!eventInput.trim()) return null;
    
    // Check if matches existing event
    const existing = events.find((e: any) => 
      e.client_name.toLowerCase() === eventInput.trim().toLowerCase()
    );
    
    if (existing) return existing.id;
    
    // Create new event
    const newEvent = {
      client_name: eventInput.trim(),
      venue: 'TBD', // Default venue
      address: '',
      event_date: new Date().toISOString().split('T')[0]
    };
    
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newEvent)
    });
    
    const data = await res.json();
    await fetchEvents(); // Refresh events list
    return data.id;
  };

  const clockIn = async () => {
    if (!eventInput || !staffName) return alert('Fill all required fields');
    
    const eventId = await findOrCreateEvent();
    if (!eventId) return alert('Failed to create/find event');
    
    await fetch('/api/timesheets/clockin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        event_id: eventId, 
        staff_name: staffName, 
        hourly_rate: rate 
      })
    });
    
    fetchTimesheets();
    setStaffName('');
    setEventInput('');
    setNotes('');
  };

  const clockOut = async (id: number) => {
    await fetch(`/api/timesheets/clockout/${id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchTimesheets();
  };

  const selectEvent = (event: any) => {
    setEventInput(event.client_name);
    setShowSuggestions(false);
  };

  const activeTimesheets = timesheets.filter((t: any) => !t.clock_out);
  const completedTimesheets = timesheets.filter((t: any) => t.clock_out);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Timesheets</h1>
          <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg border">
            Pay Period: <span className="font-semibold">{payPeriod.start}</span> → <span className="font-semibold">{payPeriod.end}</span>
          </div>
        </div>
        
        {/* Clock In Form */}
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Clock In</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Event Input with Autocomplete */}
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Event Name *</label>
              <input 
                type="text" 
                placeholder="Type event name..." 
                value={eventInput}
                onChange={e => {
                  setEventInput(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d]/20"
              />
              
              {/* Suggestions Dropdown */}
              {showSuggestions && filteredEvents.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredEvents.map((e: any) => (
                    <div 
                      key={e.id}
                      onMouseDown={() => selectEvent(e)}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="font-medium">{e.client_name}</div>
                      <div className="text-sm text-gray-500">{e.venue}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staff Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Staff Name *</label>
              <input 
                type="text" 
                placeholder="Staff name" 
                value={staffName}
                onChange={e => setStaffName(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d]/20"
              />
            </div>

            {/* Hourly Rate */}
            <div>
              <label className="block text-sm font-medium mb-1">Rate (R/hr)</label>
              <input 
                type="number" 
                placeholder="40" 
                value={rate}
                onChange={e => setRate(Number(e.target.value))}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d]/20"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
              <input 
                type="text" 
                placeholder="Add notes..." 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d]/20"
              />
            </div>
          </div>

          <button 
            onClick={clockIn}
            className="btn-primary"
          >
            Clock In
          </button>
          
          <p className="text-sm text-gray-500 mt-2">
            💡 Tip: Start typing to search existing events or create a new one automatically
          </p>
        </div>

        {/* Active Timesheets */}
        {activeTimesheets.length > 0 && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Active Clock-Ins ({activeTimesheets.length})</h2>
            <div className="space-y-3">
              {activeTimesheets.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{t.staff_name}</div>
                    <div className="text-sm text-gray-600">{t.client_name} - {t.venue}</div>
                    <div className="text-xs text-gray-500">
                      In: {new Date(t.clock_in).toLocaleTimeString()} | Rate: R{t.hourly_rate}/hr
                    </div>
                  </div>
                  <button 
                    onClick={() => clockOut(t.id)}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    Clock Out
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Timesheets */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Completed ({completedTimesheets.length})</h2>
          
          {completedTimesheets.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No completed timesheets yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-3 font-medium">Staff</th>
                    <th className="text-left p-3 font-medium">Event</th>
                    <th className="text-left p-3 font-medium">Hours</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="text-left p-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTimesheets.slice(0, 10).map((t: any) => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-3">{t.staff_name}</td>
                      <td className="p-3">{t.client_name}</td>
                      <td className="p-3">{t.total_hours?.toFixed(2) || 'N/A'}</td>
                      <td className="p-3">R{t.total_amount?.toFixed(2) || 'N/A'}</td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(t.clock_in).toLocaleDateString()}
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

function getPayPeriod(date: Date) {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();
  
  if (day >= 26) {
    return {
      start: new Date(year, month, 26).toISOString().split('T')[0],
      end: new Date(year, month + 1, 25).toISOString().split('T')[0]
    };
  } else {
    return {
      start: new Date(year, month - 1, 26).toISOString().split('T')[0],
      end: new Date(year, month, 25).toISOString().split('T')[0]
    };
  }
}