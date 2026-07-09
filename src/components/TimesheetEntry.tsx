import { useState, useEffect } from 'react';
import api from './api';
import { Clock, Play, Square, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface TimesheetRecord {
  id: number;
  event_name: string;
  staff_name: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  hourly_rate: number;
}

export default function TimesheetEntry() {
  const [activeRecords, setActiveRecords] = useState<TimesheetRecord[]>([]);
  const [recentRecords, setRecentRecords] = useState<TimesheetRecord[]>([]);
  const [eventName, setEventName] = useState('');
  const [staffName, setStaffName] = useState('');
  const [groupMode, setGroupMode] = useState(false);
  const [groupNames, setGroupNames] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showRecent, setShowRecent] = useState(false);
  const [eventSuggestions, setEventSuggestions] = useState<string[]>([]);

  const fetchActiveRecords = async () => {
    try {
      const data = await api.get<TimesheetRecord[]>('/api/timesheets');
      const active = (data || []).filter((t: TimesheetRecord) => !t.clock_out);
      setActiveRecords(active);
    } catch (err) {
      console.error('Failed to fetch active records:', err);
    }
  };

  const fetchRecentRecords = async () => {
    try {
      const data = await api.get<TimesheetRecord[]>('/api/timesheets');
      const completed = (data || [])
        .filter((t: TimesheetRecord) => t.clock_out)
        .slice(0, 10);
      setRecentRecords(completed);
    } catch (err) {
      console.error('Failed to fetch recent records:', err);
    }
  };

  const fetchEventNames = async () => {
    try {
      const names = await api.get<string[]>('/api/events/names');
      setEventSuggestions(names || []);
    } catch (err) {
      console.error('Failed to fetch event names:', err);
    }
  };

  useEffect(() => {
    fetchActiveRecords();
    fetchRecentRecords();
    fetchEventNames();
  }, []);

  const handleClockIn = async () => {
    if (!eventName || (!staffName && !groupNames.some(n => n.trim()))) {
      setMessage({ type: 'error', text: 'Please enter event name and at least one staff name.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (groupMode) {
        const names = groupNames.filter(n => n.trim());
        await api.post('/api/timesheets/clock-in', {
          event_name: eventName,
          staff_names: names
        });
        setMessage({ type: 'success', text: `✅ Clocked in ${names.length} staff members!` });
      } else {
        await api.post('/api/timesheets/clock-in', {
          event_name: eventName,
          staff_name: staffName
        });
        setMessage({ type: 'success', text: `✅ ${staffName} clocked in successfully!` });
      }

      setEventName('');
      setStaffName('');
      setGroupNames(['']);
      fetchActiveRecords();
      fetchRecentRecords();
      fetchEventNames();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to clock in' });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (timesheetId: number) => {
    setLoading(true);
    setMessage(null);

    try {
      await api.post('/api/timesheets/clock-out', { timesheet_id: timesheetId });
      setMessage({ type: 'success', text: '✅ Clocked out successfully!' });
      fetchActiveRecords();
      fetchRecentRecords();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to clock out' });
    } finally {
      setLoading(false);
    }
  };

  const addGroupField = () => {
    setGroupNames([...groupNames, '']);
  };

  const removeGroupField = (index: number) => {
    if (groupNames.length > 1) {
      setGroupNames(groupNames.filter((_, i) => i !== index));
    }
  };

  const updateGroupName = (index: number, value: string) => {
    const updated = [...groupNames];
    updated[index] = value;
    setGroupNames(updated);
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getElapsedTime = (clockIn: string) => {
    const start = new Date(clockIn);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Timesheet Entry</h2>
        <p className="text-gray-600">Clock in and out for events and track working hours</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <Square size={16} /> : <Clock size={16} />}
          {message.text}
        </div>
      )}

      {/* Clock In Form */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#a4c71d]/10 rounded-lg flex items-center justify-center">
            <Play size={20} className="text-[#a4c71d]" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Clock In</h3>
        </div>

        <div className="space-y-4">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event Name *</label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Enter event name..."
              list="event-suggestions"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent"
            />
            <datalist id="event-suggestions">
              {eventSuggestions.map((name, i) => (
                <option key={i} value={name} />
              ))}
            </datalist>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setGroupMode(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !groupMode ? 'bg-[#a4c71d] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Single Person
            </button>
            <button
              onClick={() => setGroupMode(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                groupMode ? 'bg-[#a4c71d] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Users size={14} />
              Group Clock-In
            </button>
          </div>

          {/* Staff Name(s) */}
          {!groupMode ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Staff Name *</label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter staff name..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Staff Names *</label>
              <div className="space-y-2">
                {groupNames.map((name, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => updateGroupName(i, e.target.value)}
                      placeholder={`Staff member ${i + 1}...`}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#a4c71d] focus:border-transparent"
                    />
                    {groupNames.length > 1 && (
                      <button
                        onClick={() => removeGroupField(i)}
                        className="px-3 py-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addGroupField}
                  className="text-sm text-[#a4c71d] font-medium hover:underline"
                >
                  + Add another person
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleClockIn}
            disabled={loading}
            className="w-full bg-[#a4c71d] text-white py-3 rounded-lg font-bold hover:bg-[#8fb018] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Clock size={18} />
            {loading ? 'Processing...' : 'Clock In Now'}
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Active Sessions</h3>
          <span className="ml-auto bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
            {activeRecords.length} active
          </span>
        </div>

        {activeRecords.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p>No active sessions</p>
            <p className="text-sm mt-1">Clock in to start tracking time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeRecords.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{record.staff_name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                  <p className="text-sm text-gray-600">{record.event_name}</p>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>Started: {formatTime(record.clock_in)}</span>
                    <span className="font-medium text-[#a4c71d]">{getElapsedTime(record.clock_in)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleClockOut(record.id)}
                  disabled={loading}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                >
                  <Square size={14} />
                  Clock Out
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Records */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <button
          onClick={() => setShowRecent(!showRecent)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-gray-900">Recent Records</h3>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium">
              {recentRecords.length}
            </span>
          </div>
          {showRecent ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {showRecent && (
          <div className="mt-4">
            {recentRecords.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No completed records yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="pb-3 text-sm font-medium text-gray-500">Date</th>
                      <th className="pb-3 text-sm font-medium text-gray-500">Staff</th>
                      <th className="pb-3 text-sm font-medium text-gray-500">Event</th>
                      <th className="pb-3 text-sm font-medium text-gray-500 text-right">Hours</th>
                      <th className="pb-3 text-sm font-medium text-gray-500 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.map((record) => (
                      <tr key={record.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 text-sm text-gray-900">{formatDate(record.clock_in)}</td>
                        <td className="py-3 text-sm text-gray-900">{record.staff_name}</td>
                        <td className="py-3 text-sm text-gray-600">{record.event_name}</td>
                        <td className="py-3 text-sm text-gray-900 text-right font-medium">
                          {record.total_hours?.toFixed(1) || '-'}
                        </td>
                        <td className="py-3 text-sm text-gray-900 text-right font-medium">
                          R{record.total_hours ? (record.total_hours * record.hourly_rate).toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
